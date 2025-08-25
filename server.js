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
  sb,
  sbAuth,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  SUPABASE_ANON_KEY
} from './src/config/env.js';
import snapTalkRoutes from './src/routes/snapTalkClients.js';
import widgetRoutes from './src/routes/widgets.js';
import { apiKeys } from './src/routes/snapTalkClients.js';

const app = express();

// CORS: разрешаем SnapTalk фронтенд и *.lovable.app
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // health, Postman, Telegram webhook
    if (allowedOrigins.includes(origin) || /\.lovable\.app$/i.test(origin)) return cb(null, true);
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
async function ensureTopic(clientId) {
  let topicId = await dbGetTopic(clientId);
  if (topicId) return topicId;

  if (!BOT_TOKEN || !SUPERGROUP_ID) {
    throw new Error('Telegram env vars not set (BOT_TOKEN or SUPERGROUP_ID)');
  }

  const title = `Client #${clientId}`;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/createForumTopic`;
  const { data } = await axios.post(url, {
    chat_id: SUPERGROUP_ID,
    name: title
  });
  if (!data?.ok) throw new Error('createForumTopic failed: ' + JSON.stringify(data));
  topicId = data.result.message_thread_id;

  await dbSaveTopic(clientId, topicId);
  return topicId;
}

async function sendToTopic({ clientId, text, prefix = '' }) {
  const topicId = await ensureTopic(clientId);

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const msg = `${prefix}${text}`.slice(0, 4096);
  const payload = {
    chat_id: SUPERGROUP_ID,
    message_thread_id: topicId,
    text: msg,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  const { data } = await axios.post(url, payload);
  if (!data?.ok) throw new Error('sendMessage failed: ' + JSON.stringify(data));
  return data.result;
}

// ===== Маршруты API =====
app.use('/api/snaptalk', snapTalkRoutes);
app.use('/api', widgetRoutes);

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

    console.log(`💬 Site → Telegram: "${text}" → ${clientId}`);
    await sendToTopic({ clientId, text, prefix });
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
server.listen(PORT, () => {
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
});
