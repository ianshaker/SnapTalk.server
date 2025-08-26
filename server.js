import http from 'http';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import { WebSocketServer } from 'ws';
import { 
  PORT, 
  BOT_TOKEN, 
  SUPERGROUP_ID, 
  WEBHOOK_SECRET, 
  allowedOrigins,
  lovableSandboxRegex,
  sb,
  sbAuth,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  SUPABASE_ANON_KEY
} from './src/config/env.js';
import snapTalkRoutes from './src/routes/snapTalkClients.js';
import widgetRoutes from './src/routes/widgets.js';
import { apiKeys, loadActiveClientsToApiKeys, updateClientInApiKeys } from './src/routes/snapTalkClients.js';
import { supabaseDB } from './src/config/supabase.js';

const app = express();

// CORS: разрешаем SnapTalk фронтенд и *.lovable.app
app.use(cors({
  origin: (origin, cb) => {
    // Разрешаем запросы без origin (health checks, Postman, Telegram webhook)
    if (!origin) return cb(null, true);
    
    // Проверяем точные совпадения
    if (allowedOrigins.includes(origin)) return cb(null, true);
    
    // Проверяем общие домены lovable.app
    if (/\.lovable\.app$/i.test(origin)) return cb(null, true);
    
    // Проверяем Lovable sandbox домены
    if (lovableSandboxRegex.test(origin)) return cb(null, true);
    
    console.log('❌ CORS rejected origin:', origin);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.options('*', cors());

app.use(bodyParser.json({ limit: '1mb' }));

// ===== Хранилище связок clientId <-> topicId =====
const memoryMap = new Map(); // clientId -> topicId

// ===== Утилиты для базы данных =====
async function findClientByApiKey(apiKey) {
  if (!sb || !apiKey) return null;
  try {
    const { data, error } = await sb
      .from('clients')
      .select('*')
      .eq('api_key', apiKey)
      .eq('integration_status', 'active')
      .maybeSingle();
    
    if (error) {
      console.error('❌ Error finding client by API key:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('❌ findClientByApiKey error:', error);
    return null;
  }
}

async function dbGetTopic(clientId) {
  if (!sb) return memoryMap.get(clientId) || null;
  const { data, error } = await sb
    .from('client_topics')
    .select('topic_id')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) { console.error('dbGetTopic error', error); return null; }
  return data?.topic_id ?? null;
}

// 🆕 Поиск существующего посетителя по visitor_id
async function findExistingVisitor(clientId, visitorId) {
  if (!sb || !visitorId) return null;
  
  try {
    const { data, error } = await sb
      .from('client_topics')
      .select('topic_id, visitor_id, created_at, page_url')
      .eq('client_id', clientId)
      .eq('visitor_id', visitorId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ findExistingVisitor error:', error);
      return null;
    }
    
    return data; // { topic_id, visitor_id, created_at, page_url } или null
  } catch (error) {
    console.error('❌ findExistingVisitor error:', error);
    return null;
  }
}

// 🆕 Проверка валидности топика в Telegram
async function isTopicValidInTelegram(botToken, groupId, topicId) {
  try {
    const telegramCheckUrl = `https://api.telegram.org/bot${botToken}/getForumTopicIconStickers`;
    const { data } = await axios.post(telegramCheckUrl, {
      chat_id: groupId,
      message_thread_id: topicId
    });
    
    // Если топик существует, API вернет ok: true
    return data?.ok === true;
  } catch (error) {
    // Если топик не существует или удален - API вернет ошибку
    console.warn(`⚠️ Topic ${topicId} not valid in Telegram:`, error.response?.data?.description || error.message);
    return false;
  }
}

async function dbSaveTopic(clientId, topicId, visitorId = null, requestId = null, url = null, meta = null) {
  if (!sb) { memoryMap.set(clientId, topicId); return; }
  
  const topicData = { 
    client_id: clientId, 
    topic_id: topicId,
    visitor_id: visitorId,
    request_id: requestId,
    page_url: url, // 🔥 СОХРАНЯЕМ URL!
    page_title: meta?.title || null,
    referrer: meta?.ref || null,
    utm_source: meta?.utm?.source || null,
    utm_medium: meta?.utm?.medium || null,
    utm_campaign: meta?.utm?.campaign || null,
    fingerprint_data: visitorId ? { 
      visitorId, 
      requestId, 
      url,
      meta,
      timestamp: new Date().toISOString() 
    } : null
  };
  
  // 🔄 ИСПРАВЛЕНИЕ: используем visitor_id для уникальности записей!
  try {
    if (visitorId) {
      // Для посетителей с visitor_id - сначала проверяем существование
      const existing = await sb
        .from('client_topics')
        .select('id')
        .eq('client_id', clientId)
        .eq('visitor_id', visitorId)
        .maybeSingle();
      
      if (existing.data) {
        // Обновляем существующую запись
        const { error } = await sb
          .from('client_topics')
          .update(topicData)
          .eq('id', existing.data.id);
        if (error) console.error('❌ dbSaveTopic update error:', error);
      } else {
        // Создаем новую запись
        const { error } = await sb
          .from('client_topics')
          .insert(topicData);
        if (error) console.error('❌ dbSaveTopic insert error:', error);
      }
    } else {
      // Для старых записей без visitor_id - upsert по client_id (обратная совместимость)
      const { error } = await sb
        .from('client_topics')
        .upsert(topicData, { onConflict: 'client_id' });
      if (error) console.error('❌ dbSaveTopic upsert error:', error);
    }
  } catch (error) {
    console.error('❌ dbSaveTopic error:', error);
  }
}

// ===== Telegram helpers =====
// 🆕 Умная функция обеспечения топика для посетителя
async function ensureTopicForVisitor(clientId, client, visitorId = null, requestId = null, url = null, meta = null) {
  // 1️⃣ Если есть visitorId - ищем существующего посетителя
  if (visitorId) {
    console.log(`🔍 Checking for existing visitor: ${visitorId.slice(0,8)}...`);
    
    const existingVisitor = await findExistingVisitor(clientId, visitorId);
    if (existingVisitor) {
      console.log(`👤 Found existing visitor with topic: ${existingVisitor.topic_id}`);
      
      // 2️⃣ Проверяем валидность топика в Telegram
      const botToken = client?.telegram_bot_token || BOT_TOKEN;
      const groupId = client?.telegram_group_id || SUPERGROUP_ID;
      
      const isValidTopic = await isTopicValidInTelegram(botToken, groupId, existingVisitor.topic_id);
      if (isValidTopic) {
        console.log(`✅ Topic ${existingVisitor.topic_id} is valid - reusing for visitor`);
        
        // 3️⃣ Обновляем ТОЛЬКО метаданные последнего визита (НЕ создаем новую запись!)
        try {
          const { error } = await sb
            .from('client_topics')
            .update({
              page_url: url,
              page_title: meta?.title || null,
              referrer: meta?.ref || null,
              utm_source: meta?.utm?.source || null,
              utm_medium: meta?.utm?.medium || null,
              utm_campaign: meta?.utm?.campaign || null,
              updated_at: new Date().toISOString(),
              fingerprint_data: visitorId ? { 
                visitorId, 
                requestId, 
                url,
                meta,
                timestamp: new Date().toISOString() 
              } : null
            })
            .eq('client_id', clientId)
            .eq('visitor_id', visitorId);
          
          if (error) console.error('❌ Update existing visitor error:', error);
          else console.log(`🔄 Updated existing visitor metadata: ${visitorId.slice(0,8)}...`);
        } catch (error) {
          console.error('❌ Update existing visitor error:', error);
        }
        
        return {
          topicId: existingVisitor.topic_id,
          isExistingVisitor: true,
          previousUrl: existingVisitor.page_url,
          firstVisit: existingVisitor.created_at
        };
      } else {
        console.log(`❌ Topic ${existingVisitor.topic_id} is invalid - creating new topic`);
      }
    }
  }
  
  // 4️⃣ Создаем новый топик (для новых посетителей или если старый топик недействителен)
  return await createNewTopic(clientId, client, visitorId, requestId, url, meta);
}

// 🔄 Старая функция ensureTopic - теперь только для обратной совместимости
async function ensureTopic(clientId, client, visitorId = null, requestId = null, url = null, meta = null) {
  // Используем новую умную логику
  const result = await ensureTopicForVisitor(clientId, client, visitorId, requestId, url, meta);
  return typeof result === 'object' ? result.topicId : result;
}

// 🆕 Вынесенная логика создания нового топика
async function createNewTopic(clientId, client, visitorId = null, requestId = null, url = null, meta = null) {
  console.log(`🆕 Creating new topic for client: ${client?.client_name || clientId}`);
  
  let topicId = await dbGetTopic(clientId);
  if (topicId) return topicId;

  // Используем настройки клиента
  const botToken = client?.telegram_bot_token || BOT_TOKEN;
  const groupId = client?.telegram_group_id || SUPERGROUP_ID;

  if (!botToken || !groupId) {
    throw new Error(`Telegram settings not configured for client ${client?.client_name || clientId}`);
  }

  const title = visitorId 
    ? `Visitor ${visitorId.slice(0,8)} - ${client?.client_name || clientId}`
    : `Client #${clientId} (${client?.client_name || 'Unknown'})`;
    
  const telegramUrl = `https://api.telegram.org/bot${botToken}/createForumTopic`;
  const { data } = await axios.post(telegramUrl, {
    chat_id: groupId,
    name: title
  });
  if (!data?.ok) throw new Error('createForumTopic failed: ' + JSON.stringify(data));
  topicId = data.result.message_thread_id;

  await dbSaveTopic(clientId, topicId, visitorId, requestId, url, meta);
  console.log(`✅ Created topic ${topicId} for client ${client?.client_name || clientId}${visitorId ? ` [Visitor: ${visitorId.slice(0,8)}...]` : ''}`);
  
  return {
    topicId,
    isExistingVisitor: false
  };
}

async function sendToTopic({ clientId, text, prefix = '', client, visitorId = null, requestId = null, url = null, meta = null }) {
  const result = await ensureTopicForVisitor(clientId, client, visitorId, requestId, url, meta);
  const topicId = typeof result === 'object' ? result.topicId : result;

  // Используем настройки клиента
  const botToken = client?.telegram_bot_token || BOT_TOKEN;
  const groupId = client?.telegram_group_id || SUPERGROUP_ID;

  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const msg = `${prefix}${text}`.slice(0, 4096);
  const payload = {
    chat_id: groupId,
    message_thread_id: topicId,
    text: msg,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  
  console.log(`📤 Sending to Telegram: bot=${botToken.slice(0,10)}..., group=${groupId}, topic=${topicId}`);
  const { data } = await axios.post(telegramApiUrl, payload);
  if (!data?.ok) throw new Error('sendMessage failed: ' + JSON.stringify(data));
  console.log(`✅ Message sent to Telegram topic ${topicId}`);
  return data.result;
}

// ===== Маршруты API =====
app.use('/api/snaptalk', snapTalkRoutes);
app.use('/api', widgetRoutes);

// ===== Административные эндпоинты =====
app.get('/api/admin/reload-clients', async (req, res) => {
  try {
    await loadActiveClientsToApiKeys();
    res.json({
      success: true,
      message: 'Active clients reloaded',
      apiKeysCount: apiKeys.size
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/admin/sync-client/:apiKey', async (req, res) => {
  try {
    const { apiKey } = req.params;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key required'
      });
    }

    const updated = await updateClientInApiKeys(apiKey);
    
    res.json({
      success: true,
      updated,
      message: updated 
        ? `Client ${apiKey} cache updated successfully`
        : `Client ${apiKey} not found or inactive`,
      apiKeysCount: apiKeys.size
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/api-keys', (req, res) => {
  const keys = Array.from(apiKeys.keys());
  res.json({ 
    success: true, 
    apiKeys: keys,
    total: keys.length 
  });
});

// Создание таблицы client_topics через простую проверку
app.post('/api/admin/create-topics-table', async (req, res) => {
  try {
    if (!sb) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    console.log('🔧 Creating client_topics table...');

    // Пробуем создать запись для проверки существования таблицы
    const { error: testError } = await sb
      .from('client_topics')
      .select('id')
      .limit(1);

    if (testError && testError.code === 'PGRST205') {
      // Таблица не существует - нужно создать вручную в Supabase Dashboard
      console.log('❌ Table client_topics does not exist. Please create it manually in Supabase Dashboard.');
      return res.json({ 
        success: false, 
        error: 'Table does not exist',
        instructions: 'Please create table client_topics manually in Supabase Dashboard with SQL migration'
      });
    }

    console.log('✅ client_topics table exists');
    res.json({ success: true, message: 'client_topics table exists' });

  } catch (error) {
    console.error('❌ Create table error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/debug-clients', async (req, res) => {
  try {
    console.log('🔍 Debug clients request - checking Supabase connection...');
    
    const { data: allClients, error } = await supabaseDB
      .from('clients')
      .select('id, client_name, api_key, integration_status, telegram_bot_token, telegram_group_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Supabase query error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`✅ Found ${allClients?.length || 0} clients in Supabase`);

    res.json({ 
      success: true, 
      clients: allClients || [],
      total: allClients?.length || 0,
      supabaseUrl: SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE
    });
  } catch (error) {
    console.error('❌ Debug clients error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug: проверка подключения виджетов
app.get('/api/debug/widget-routes', (req, res) => {
  res.json({
    message: 'Widget routes are handled by /src/routes/widgets.js',
    expectedEndpoint: '/api/widget.js',
    demoTest: '/api/widget.js?key=demo-snaptalk-2025',
    timestamp: new Date().toISOString()
  });
});

// ===== Основные руты =====
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/favicon.ico', (_req, res) => res.sendStatus(204));

// API информация - управление через https://snaptalk.lovable.app/
app.get('/', (req, res) => {
  const serverUrl = req.protocol + '://' + req.get('host');
  
  res.json({
    name: 'SnapTalk Server',
    version: '1.0.0',
    status: 'running',
    description: 'Live chat widget backend with Telegram integration',
    frontend: 'https://snaptalk.lovable.app/',
    documentation: {
      widget_embed: `<script src="${serverUrl}/api/widget.js?key=YOUR_API_KEY" async></script>`,
      websocket: `wss://${req.get('host')}/ws?clientId=CLIENT_ID`
    },
    endpoints: {
      widget: '/api/widget.js?key=API_KEY',
      config: '/api/widget/config?key=API_KEY', 
      send_message: '/api/chat/send',
      websocket: '/ws?clientId=CLIENT_ID',
      health: '/health'
    }
  });
});

// ===== API: Автоматический трекинг визитов =====
app.post('/api/visit/track', async (req, res) => {
  try {
    const { clientId, apiKey, visitorId, requestId, url, meta } = req.body || {};
    
    if (!clientId || !visitorId || !url) {
      return res.status(400).json({ ok: false, error: 'clientId, visitorId and url required' });
    }

    // Находим клиента по API ключу
    const client = await findClientByApiKey(apiKey);
    if (!client) {
      console.log(`❌ Client not found for apiKey: ${apiKey}`);
      return res.status(404).json({ ok: false, error: 'Client not found' });
    }

    // Проверяем - не дублируется ли визит (в течение 30 минут)
    const recentVisit = await checkRecentVisit(clientId, visitorId, url);
    if (recentVisit) {
      return res.json({ ok: true, message: 'Visit already tracked recently' });
    }

    // ✅ Данные будут сохранены в client_topics через ensureTopicForVisitor → dbSaveTopic

    // Создаем/находим топик и отправляем уведомление в Telegram  
    const topicResult = await ensureTopicForVisitor(clientId, client, visitorId, requestId, url, meta);
    const { topicId, isExistingVisitor, previousUrl, firstVisit } = 
      typeof topicResult === 'object' ? topicResult : { topicId: topicResult, isExistingVisitor: false };
    
    // Формируем сообщение в зависимости от статуса посетителя
    let message, prefix;
    if (isExistingVisitor) {
      message = formatReturnVisitMessage(client, visitorId, url, meta, previousUrl, firstVisit);
      prefix = `🔄 ПОВТОРНЫЙ ВИЗИТ\n\n`;
    } else {
      message = formatVisitMessage(client, visitorId, url, meta);
      prefix = `👤 НОВЫЙ ПОСЕТИТЕЛЬ\n\n`;
    }
    
    // Отправляем в уже подготовленный топик
    await sendTelegramMessage(topicId, message, prefix, client);

    const statusText = isExistingVisitor ? 'Return visitor' : 'New visitor';
    console.log(`👤 ${statusText} tracked: ${client.client_name} → ${url} [${visitorId.slice(0,8)}...] Topic: ${topicId}`);
    return res.json({ ok: true });

  } catch (e) {
    console.error('Visit tracking error:', e);
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// ===== API: сайт -> Telegram =====
app.post('/api/chat/send', async (req, res) => {
  try {
    const { clientId, apiKey, text, meta, visitorId, requestId } = req.body || {};
    if (!clientId || !text) {
      return res.status(400).json({ ok: false, error: 'clientId and text required' });
    }

    // Находим клиента по API ключу
    const client = await findClientByApiKey(apiKey);
    if (!client) {
      console.log(`❌ Client not found for apiKey: ${apiKey}`);
      return res.status(404).json({ ok: false, error: 'Client not found' });
    }

    const utm = meta?.utm || {};
    const ref = meta?.ref || '';
    const prefixParts = [
      `#${clientId}`,
      utm.source ? `${utm.source}` : null,
      utm.campaign ? `${utm.campaign}` : null,
      utm.term ? `${utm.term}` : null,
      ref ? `ref:${ref}` : null,
    ].filter(Boolean);
    const prefix = prefixParts.length ? `${prefixParts.join(' / ')}\n\n` : `#${clientId}\n\n`;

    console.log(`💬 Site → Telegram: "${text}" → ${clientId} (${client.client_name})${visitorId ? ` [Visitor: ${visitorId.slice(0,8)}...]` : ''}`);
    await sendToTopic({ clientId, text, prefix, client, visitorId, requestId });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// ===== Webhook: Telegram -> сайт (ответ менеджера) =====
app.post(`/telegram/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  try {
    const update = req.body;
    const msg = update?.message;
    const text = msg?.text;
    const topicId = msg?.message_thread_id;
    const chatId = msg?.chat?.id;

    // Интересуют только сообщения в топиках нашей супергруппы
    if (!text || !topicId || chatId !== SUPERGROUP_ID) {
      return res.sendStatus(200);
    }

    // Ищем clientId по topicId
    let clientId = null;
    if (sb) {
      const { data, error } = await sb
        .from('client_topics')
        .select('client_id')
        .eq('topic_id', topicId)
        .maybeSingle();
      if (!error) clientId = data?.client_id || null;
    } else {
      for (const [cid, tid] of memoryMap.entries()) {
        if (tid === topicId) { clientId = cid; break; }
      }
    }

    if (!clientId) return res.sendStatus(200);

    console.log(`📱 Telegram → Site: "${text}" → ${clientId}`);

    // 1) Supabase Broadcast (если подключён)
    if (sb) {
      try {
        await sb.channel(`client:${clientId}`).send({
          type: 'broadcast',
          event: 'manager_message',
          payload: { from: 'manager', text, ts: Date.now() }
        });
      } catch (broadcastError) {
        console.error('❌ Supabase broadcast error:', broadcastError);
      }
    }

    // 2) WebSocket push (всегда, если есть активные подписчики)
    const payload = { from: 'manager', text, ts: Date.now() };
    pushToClient(clientId, payload);

    return res.sendStatus(200);
  } catch (e) {
    console.error('webhook error', e);
    return res.sendStatus(200);
  }
});

// ===== HTTP+WS сервер и WS-хаб =====
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// clientId -> Set<WebSocket>
const hub = new Map();

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url, 'http://localhost'); // path и query
    const clientId = url.searchParams.get('clientId');
    if (!clientId) { ws.close(1008, 'clientId required'); return; }

    let set = hub.get(clientId);
    if (!set) { set = new Set(); hub.set(clientId, set); }
    set.add(ws);

    ws.on('close', () => {
      const s = hub.get(clientId);
      if (!s) return;
      s.delete(ws);
      if (!s.size) hub.delete(clientId);
    });
  } catch {
    try { ws.close(); } catch {}
  }
});

// ===== Вспомогательные функции для трекинга визитов =====
// 🔄 Проверка недавних визитов через client_topics (НЕ site_visits!)
async function checkRecentVisit(clientId, visitorId, url) {
  if (!sb || !visitorId) return false; // В memory mode не проверяем дубли
  
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  try {
    const { data, error } = await sb
      .from('client_topics')
      .select('updated_at, page_url')
      .eq('client_id', clientId)
      .eq('visitor_id', visitorId)
      .gte('updated_at', thirtyMinutesAgo)
      .maybeSingle();
      
    if (error) {
      console.error('❌ checkRecentVisit error:', error);
      return false;
    }
    
    // Если есть недавнее обновление темы для этого посетителя
    const hasRecentActivity = !!data;
    if (hasRecentActivity) {
      console.log(`⏰ Recent activity found for visitor ${visitorId.slice(0,8)}... (within 30 min)`);
    }
    
    return hasRecentActivity;
  } catch (error) {
    console.error('❌ checkRecentVisit error:', error);
    return false;
  }
}

// ❌ УДАЛЕНА: saveVisitToDatabase - данные сохраняются в client_topics через dbSaveTopic

function formatVisitMessage(client, visitorId, url, meta) {
  const domain = new URL(url).hostname;
  const shortVisitorId = visitorId.slice(0, 8) + '...';
  
  let message = `🌐 Страница: ${url}\n`;
  message += `👤 Visitor ID: ${shortVisitorId}\n`;
  message += `🏠 Домен: ${domain}\n`;
  
  if (meta?.title) {
    message += `📄 Заголовок: ${meta.title}\n`;
  }
  
  if (meta?.ref) {
    message += `🔗 Откуда пришел: ${meta.ref}\n`;
  }
  
  if (meta?.utm?.source) {
    message += `📊 UTM: ${meta.utm.source}`;
    if (meta.utm.medium) message += ` / ${meta.utm.medium}`;
    if (meta.utm.campaign) message += ` / ${meta.utm.campaign}`;
    message += `\n`;
  }
  
  message += `\n⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;
  
  return message;
}

// 🆕 Формат сообщения для повторного визита
function formatReturnVisitMessage(client, visitorId, url, meta, previousUrl, firstVisit) {
  const domain = new URL(url).hostname;
  const shortVisitorId = visitorId.slice(0, 8) + '...';
  
  let message = `🌐 Страница: ${url}\n`;
  message += `👤 Visitor ID: ${shortVisitorId}\n`;
  message += `🏠 Домен: ${domain}\n`;
  
  if (meta?.title) {
    message += `📄 Заголовок: ${meta.title}\n`;
  }
  
  if (previousUrl) {
    message += `📋 Предыдущая страница: ${previousUrl}\n`;
  }
  
  if (meta?.ref) {
    message += `🔗 Откуда пришел: ${meta.ref}\n`;
  }
  
  if (meta?.utm?.source) {
    message += `📊 UTM: ${meta.utm.source}`;
    if (meta.utm.medium) message += ` / ${meta.utm.medium}`;
    if (meta.utm.campaign) message += ` / ${meta.utm.campaign}`;
    message += `\n`;
  }
  
  const firstVisitTime = firstVisit ? new Date(firstVisit).toLocaleString('ru-RU', { 
    timeZone: 'Europe/Moscow',
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  }) : 'Неизвестно';
  
  message += `\n⏰ Сейчас: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;
  message += `\n🕒 Первый визит: ${firstVisitTime}`;
  
  return message;
}

// 🆕 Прямая отправка сообщения в Telegram (без создания топика)
async function sendTelegramMessage(topicId, message, prefix, client) {
  const botToken = client?.telegram_bot_token || BOT_TOKEN;
  const groupId = client?.telegram_group_id || SUPERGROUP_ID;
  
  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const fullMessage = `${prefix}${message}`.slice(0, 4096);
  
  const payload = {
    chat_id: groupId,
    message_thread_id: topicId,
    text: fullMessage,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  
  console.log(`📤 Sending to Telegram topic ${topicId}: ${botToken.slice(0,10)}...`);
  const { data } = await axios.post(telegramApiUrl, payload);
  if (!data?.ok) throw new Error('sendMessage failed: ' + JSON.stringify(data));
  console.log(`✅ Message sent to Telegram topic ${topicId}`);
  return data.result;
}

function pushToClient(clientId, payload) {
  const set = hub.get(clientId);
  if (!set || !set.size) return;
  
  const data = JSON.stringify(payload);
  for (const ws of set) {
    try { 
      ws.send(data); 
    } catch (error) {
      console.error('❌ WebSocket send failed:', error);
    }
  }
}

// Старт
server.listen(PORT, async () => {
  console.log('🚀 SnapTalk Server listening on port', PORT);
  console.log('🔧 Environment check:');
  console.log('  - BOT_TOKEN:', BOT_TOKEN ? 'SET' : 'NOT SET');
  console.log('  - SUPERGROUP_ID:', SUPERGROUP_ID || 'NOT SET');
  console.log('  - WEBHOOK_SECRET:', WEBHOOK_SECRET || 'NOT SET');
  console.log('  - SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('  - SUPABASE_SERVICE_ROLE:', SUPABASE_SERVICE_ROLE ? 'SET' : 'NOT SET');
  console.log('  - SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
  console.log('📡 Webhook URL: /telegram/webhook/' + WEBHOOK_SECRET);
  console.log('🎯 SnapTalk Frontend integration:', sbAuth ? 'ENABLED' : 'DISABLED');
  console.log('🔗 CORS allowed origins:', allowedOrigins.join(', '));
  
  // Загружаем активные клиенты в apiKeys
  await loadActiveClientsToApiKeys();
});
