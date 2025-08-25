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
import { apiKeys, loadActiveClientsToApiKeys } from './src/routes/snapTalkClients.js';
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
async function findClientByWidget(clientId) {
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('clients')
      .select('*')
      .eq('integration_status', 'active')
      .limit(1000);
    
    if (error) {
      console.error('❌ Error finding client:', error);
      return null;
    }
    
    // Ищем клиента через API ключи (clientId содержит префикс от API ключа)
    for (const client of data || []) {
      if (clientId.includes(client.api_key.split('-')[1])) {
        return client;
      }
    }
    
    console.log(`❌ No matching client found for clientId: ${clientId}`);
    return null;
  } catch (error) {
    console.error('❌ findClientByWidget error:', error);
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

async function dbSaveTopic(clientId, topicId) {
  if (!sb) { memoryMap.set(clientId, topicId); return; }
  const { error } = await sb
    .from('client_topics')
    .upsert({ client_id: clientId, topic_id: topicId }, { onConflict: 'client_id' });
  if (error) console.error('dbSaveTopic error', error);
}

// ===== Telegram helpers =====
async function ensureTopic(clientId, client) {
  let topicId = await dbGetTopic(clientId);
  if (topicId) return topicId;

  // Используем настройки клиента
  const botToken = client?.telegram_bot_token || BOT_TOKEN;
  const groupId = client?.telegram_group_id || SUPERGROUP_ID;

  if (!botToken || !groupId) {
    throw new Error(`Telegram settings not configured for client ${client?.client_name || clientId}`);
  }

  const title = \`Client #\${clientId} (\${client?.client_name || 'Unknown'})\`;
  const url = \`https://api.telegram.org/bot\${botToken}/createForumTopic\`;
  const { data } = await axios.post(url, {
    chat_id: groupId,
    name: title
  });
  if (!data?.ok) throw new Error('createForumTopic failed: ' + JSON.stringify(data));
  topicId = data.result.message_thread_id;

  await dbSaveTopic(clientId, topicId);
  console.log(\`✅ Created topic \${topicId} for client \${client?.client_name || clientId}\`);
  return topicId;
}

async function sendToTopic({ clientId, text, prefix = '', client }) {
  const topicId = await ensureTopic(clientId, client);

  // Используем настройки клиента
  const botToken = client?.telegram_bot_token || BOT_TOKEN;
  const groupId = client?.telegram_group_id || SUPERGROUP_ID;

  const url = \`https://api.telegram.org/bot\${botToken}/sendMessage\`;
  const msg = \`\${prefix}\${text}\`.slice(0, 4096);
  const payload = {
    chat_id: groupId,
    message_thread_id: topicId,
    text: msg,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  
  console.log(\`📤 Sending to Telegram: bot=\${botToken.slice(0,10)}..., group=\${groupId}, topic=\${topicId}\`);
  const { data } = await axios.post(url, payload);
  if (!data?.ok) throw new Error('sendMessage failed: ' + JSON.stringify(data));
  console.log(\`✅ Message sent to Telegram topic \${topicId}\`);
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

// Главная страница с демонстрацией
app.get('/', (req, res) => {
  const demoKey = 'demo-snaptalk-2025';
  const serverUrl = req.protocol + '://' + req.get('host');
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SnapTalk Server - Live Chat Widget</title>
    <style>
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 2rem; 
            line-height: 1.6;
        }
        .hero { 
            text-align: center; 
            margin-bottom: 3rem; 
            padding: 2rem; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 1rem;
        }
        .section { 
            background: #f8fafc; 
            padding: 1.5rem; 
            border-radius: 0.5rem; 
            margin-bottom: 2rem; 
        }
        .code { 
            background: #1e293b; 
            color: #e2e8f0; 
            padding: 1rem; 
            border-radius: 0.5rem; 
            font-family: 'Monaco', 'Menlo', monospace; 
            overflow-x: auto;
            margin: 1rem 0;
        }
        .api-endpoint {
            background: #0ea5e9;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 0.25rem;
            font-family: monospace;
            display: inline-block;
            margin: 0.25rem;
        }
    </style>
</head>
<body>
    <div class="hero">
        <h1>🚀 SnapTalk Server</h1>
        <p>Modern live chat widget with Telegram integration</p>
    </div>

    <div class="section">
        <h2>💻 Embed Code для клиентов</h2>
        <p>Просто вставьте этот код на свой сайт:</p>
        <div class="code">&lt;script src="${serverUrl}/api/widget.js?key=${demoKey}" async&gt;&lt;/script&gt;</div>
        <p><strong>Это всё!</strong> Виджет автоматически загрузится со всеми настройками стилей с сервера.</p>
    </div>

    <div class="section">
        <h2>🔧 API Endpoints</h2>
        
        <h3>Для клиентов:</h3>
        <div class="api-endpoint">GET /api/widget.js?key=API_KEY</div> - Получить JavaScript код виджета<br>
        <div class="api-endpoint">GET /api/widget/config?key=API_KEY</div> - Получить JSON конфигурацию<br>
        <div class="api-endpoint">POST /api/chat/send</div> - Отправить сообщение в Telegram<br>
        <div class="api-endpoint">WebSocket /ws?clientId=ID</div> - Получать ответы в реальном времени<br>
        
        <h3>SnapTalk Frontend Integration (Auth required):</h3>
        <div class="api-endpoint">POST /api/snaptalk/clients/create</div> - Создать клиента из фронтенда<br>
        <div class="api-endpoint">GET /api/snaptalk/clients</div> - Получить список клиентов<br>
        <div class="api-endpoint">GET /api/snaptalk/clients/:id</div> - Получить данные клиента<br>
        <div class="api-endpoint">PUT /api/snaptalk/clients/:id</div> - Обновить клиента<br>
        <div class="api-endpoint">DELETE /api/snaptalk/clients/:id</div> - Удалить клиента<br>
    </div>

    <!-- Подключаем демо виджет -->
    <script src="/api/widget.js?key=${demoKey}" async></script>
</body>
</html>
  `;
  
  res.type('text/html').send(htmlContent);
});

// ===== API: сайт -> Telegram =====
app.post('/api/chat/send', async (req, res) => {
  try {
    const { clientId, text, meta } = req.body || {};
    if (!clientId || !text) {
      return res.status(400).json({ ok: false, error: 'clientId and text required' });
    }

    // Находим клиента и его Telegram настройки
    const client = await findClientByWidget(clientId);
    if (!client) {
      console.log(`❌ Client not found for clientId: ${clientId}`);
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

    console.log(`💬 Site → Telegram: "${text}" → ${clientId} (${client.client_name})`);
    await sendToTopic({ clientId, text, prefix, client });
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
