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
import pageTrackingRoutes from './src/routes/pageTracking/index.js';
import visitTrackingRoutes from './src/routes/visitTracking.js';

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
import { formatNewVisitorMessage, formatReturnVisitorMessage, formatTabSwitchMessage, formatSessionEndMessage } from './src/services/messageFormatterService.js';
import { getTelegramToClientService } from './src/services/telegramToClientService.js';

const app = express();

// CORS: разрешаем SnapTalk фронтенд и *.lovable.app
app.use(cors({
  origin: (origin, cb) => {
    // Разрешаем запросы без origin (например, мобильные приложения или локальные файлы)
    if (!origin || origin === 'null') return cb(null, true);
    
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

// Middleware для обработки sendBeacon запросов с Blob данными
app.use('/api/track/session', (req, res, next) => {
  if (req.headers['content-type'] === 'application/json' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        req.body = JSON.parse(body);
        next();
      } catch (error) {
        console.error('❌ Failed to parse JSON from sendBeacon:', error);
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    });
  } else {
    next();
  }
});

app.use(bodyParser.json({ limit: '1mb' }));

// ===== Статические файлы =====
app.use(express.static('.'));

// ===== Маршруты API =====
app.use('/api/snaptalk', snapTalkRoutes);
app.use('/api', widgetRoutes);
app.use('/api', adminRoutes);
app.use('/api/track', pageTrackingRoutes);
app.use('/api/visit', visitTrackingRoutes);




// ===== Основные руты =====
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/favicon.ico', (_req, res) => res.sendStatus(204));







// ===== API: сайт -> Telegram =====
app.post('/api/chat/send', async (req, res) => {
  try {
    const { clientId, apiKey, text, meta, visitorId, requestId } = req.body || {};
    
    // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ: входящий запрос
    console.log('📤 /api/chat/send received:', {
      clientId,
      apiKey,
      textLength: text?.length || 0,
      textPreview: text?.slice(0, 20) + (text?.length > 20 ? '...' : ''),
      hasVisitorId: !!visitorId,
      hasRequestId: !!requestId,
      userAgent: req.get('User-Agent')?.slice(0, 50),
      referer: req.get('Referer')
    });
    
    if (!clientId || !text) {
      return res.status(400).json({ ok: false, error: 'clientId and text required' });
    }

    // Находим клиента по API ключу
    const client = await findClientByApiKey(apiKey);
    if (!client) {
      console.log(`❌ Client not found for apiKey: ${apiKey}`);
      return res.status(404).json({ ok: false, error: 'Client not found' });
    }
    
    // 🔍 ПРОВЕРКА: соответствие clientId из запроса и из базы данных
    console.log('🔍 ClientId validation:', {
      receivedClientId: clientId,
      databaseClientId: client.id,
      clientName: client.client_name,
      match: clientId === client.id
    });

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

// Инициализируем TelegramToClientService с функцией pushToClient
const telegramToClientService = getTelegramToClientService(pushToClient);
console.log('✅ TelegramToClientService инициализирован с функцией pushToClient');

// Добавляем pushToClient в app.locals для доступа из роутеров
app.locals.pushToClient = pushToClient;

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
