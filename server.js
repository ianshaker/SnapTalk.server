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

app.get('/api/admin/debug-clients', async (req, res) => {
  try {
    const { data: allClients, error } = await supabaseDB
      .from('clients')
      .select('id, client_name, api_key, integration_status')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ 
      success: true, 
      clients: allClients || [],
      total: allClients?.length || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Временный debug endpoint для widget.js
app.get('/api/widget.js', async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400)
        .type('application/javascript')
        .send('console.error("SnapTalk Widget: API key required");');
    }

    console.log(`🔍 Widget request for key: ${key}`);

    // Проверяем клиента в Supabase напрямую
    const { data: client, error } = await supabaseDB
      .from('clients')
      .select('*')
      .eq('api_key', key)
      .eq('integration_status', 'active')
      .single();

    if (error || !client) {
      console.log(`❌ Client not found or inactive for key: ${key}`);
      return res.status(404)
        .type('application/javascript')
        .send('console.error("SnapTalk Widget: Invalid or inactive API key");');
    }

    console.log(`✅ Found active client: ${client.client_name}`);

    // Простой тестовый виджет
    const widgetCode = `
// SnapTalk Widget for ${client.client_name}
console.log("SnapTalk Widget загружен для клиента: ${client.client_name}");

(function() {
  // Создаем простой тестовый виджет
  const widget = document.createElement('div');
  widget.id = 'snaptalk-widget';
  widget.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: ${client.widget_color || '#70B347'};
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    font-family: Arial, sans-serif;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  \`;
  widget.innerHTML = '💬';
  widget.title = '${client.widget_title || 'Чат поддержки'}';

  // Обработчик клика
  widget.onclick = function() {
    alert('SnapTalk чат для клиента "${client.client_name}" активирован!\\nAPI Key: ${key}');
  };

  // Добавляем виджет на страницу
  document.body.appendChild(widget);
  
  console.log('✅ SnapTalk Widget создан и добавлен на страницу');
})();
`;

    res.type('application/javascript')
      .header('Access-Control-Allow-Origin', '*')
      .send(widgetCode);

  } catch (error) {
    console.error('Widget error:', error);
    res.status(500)
      .type('application/javascript')
      .send('console.error("SnapTalk Widget: Server error");');
  }
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
