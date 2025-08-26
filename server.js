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
import adminRoutes from './src/routes/adminRoutes.js';

import { apiKeys, loadActiveClientsToApiKeys, updateClientInApiKeys } from './src/routes/snapTalkClients.js';
import telegramRoutes, { setPushToClient } from './src/routes/telegram.js';
import { supabaseDB } from './src/config/supabase.js';
import { 
  findClientByApiKey,
  ensureTopicForVisitor,
  ensureTopic, 
  sendToTopic,
  sendTelegramMessage,
  saveSiteVisit,
  memoryMap
} from './src/services/telegramService.js';

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

// ===== Маршруты API =====
app.use('/api/snaptalk', snapTalkRoutes);
app.use('/api', widgetRoutes);
app.use('/api', adminRoutes);




// ===== Основные руты =====
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/favicon.ico', (_req, res) => res.sendStatus(204));



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

    // 📊 ВСЕГДА записываем визит в site_visits (без cooldown для детальной аналитики)
    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;
    await saveSiteVisit(clientId, visitorId, requestId, url, meta, userAgent, ipAddress);

    // 🔄 Проверяем cooldown только для Telegram топиков (30 минут)
    const recentVisit = await checkRecentVisit(clientId, visitorId, url);
    if (recentVisit) {
      return res.json({ ok: true, message: 'Visit tracked in site_visits, Telegram skipped (recent)' });
    }

    // ✅ Данные также сохраняются в client_topics через ensureTopicForVisitor → dbSaveTopic

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

// Подключаем Telegram роутер
app.use('/telegram', telegramRoutes);

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
  const timestamp = new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  let message = `${url}\n`;
  message += `Visitor ID: ${visitorId}\n`;
  message += `${meta?.title || ''}\n\n`;
  message += `${timestamp}\n\n`;
  
  return message;
}

// 🆕 Формат сообщения для повторного визита
function formatReturnVisitMessage(client, visitorId, url, meta, previousUrl, firstVisit) {
  const timestamp = new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  let message = `${url}\n`;
  message += `Visitor ID: ${visitorId}\n`;
  message += `${meta?.title || ''}\n\n`;
  message += `${timestamp}\n\n`;
  
  return message;
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

// Передаем функцию pushToClient в Telegram роутер
setPushToClient(pushToClient);

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
