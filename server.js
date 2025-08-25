import http from 'http';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';

/**
 * ENV (Render → Settings → Environment):
 * - TELEGRAM_BOT_TOKEN        // токен бота из BotFather
 * - TELEGRAM_SUPERGROUP_ID    // ИД супергруппы с включённым Forum (обязательно с минусом, напр. -1002996396033)
 * - TELEGRAM_WEBHOOK_SECRET   // произвольная строка для секьюрного пути вебхука
 * - SUPABASE_URL              // (опц.) URL проекта Supabase
 * - SUPABASE_SERVICE_ROLE     // (опц.) service role ключ Supabase (ТОЛЬКО НА СЕРВЕРЕ)
 */

const app = express();

// CORS: разрешаем твой сайт и *.lovable.app
const allowed = ['https://savov.lovable.app'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // health, Postman, Telegram webhook
    if (allowed.includes(origin) || /\.lovable\.app$/i.test(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
}));
app.options('*', cors());

app.use(bodyParser.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID && Number(process.env.TELEGRAM_SUPERGROUP_ID);
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-secret';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// Supabase client (если заданы переменные)
const sb = (SUPABASE_URL && SUPABASE_SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
  : null;

// ===== Доп. утилиты / тестовые руты =====
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/', (_req, res) => res.type('text/plain').send('SnapTalk Server OK'));
app.get('/favicon.ico', (_req, res) => res.sendStatus(204));

// ===== Хранилище связок clientId <-> topicId =====
const memoryMap = new Map(); // clientId -> topicId

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

// ===== API: сайт -> Telegram =====
/**
 * body: { clientId: string, text: string, meta?: { utm?, ref? } }
 */
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

    await sendToTopic({ clientId, text, prefix });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// ===== Webhook: Telegram -> сайт (ответ менеджера) =====
/**
 * Путь: https://<render-app>.onrender.com/telegram/webhook/<WEBHOOK_SECRET>
 */
app.post(`/telegram/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  try {
    const update = req.body;
    console.log('🔔 Webhook received:', JSON.stringify(update, null, 2));

    const msg = update?.message;
    const text = msg?.text;
    const topicId = msg?.message_thread_id;
    const chatId = msg?.chat?.id;

    console.log('📝 Parsed data:', { text, topicId, chatId, SUPERGROUP_ID });

    // Интересуют только сообщения в топиках нашей супергруппы
    if (!text || !topicId || chatId !== SUPERGROUP_ID) {
      console.log('❌ Message filtered out:', { 
        hasText: !!text, 
        hasTopicId: !!topicId, 
        chatMatches: chatId === SUPERGROUP_ID 
      });
      return res.sendStatus(200);
    }

    // Ищем clientId по topicId
    let clientId = null;
    console.log('🔍 Looking for clientId by topicId:', topicId);
    console.log('📊 Supabase available:', !!sb);
    console.log('🗃️ MemoryMap contents:', Array.from(memoryMap.entries()));
    
    if (sb) {
      const { data, error } = await sb
        .from('client_topics')
        .select('client_id')
        .eq('topic_id', topicId)
        .maybeSingle();
      if (!error) clientId = data?.client_id || null;
      console.log('🗄️ Supabase lookup result:', { data, error, clientId });
    } else {
      for (const [cid, tid] of memoryMap.entries()) {
        if (tid === topicId) { clientId = cid; break; }
      }
      console.log('💾 Memory lookup result:', clientId);
    }

    if (!clientId) {
      console.log('❌ ClientId not found for topicId:', topicId);
      return res.sendStatus(200);
    }
    
    console.log('✅ Found clientId:', clientId);

    // 1) Supabase Broadcast (если подключён)
    if (sb) {
      try {
        await sb.channel(`client:${clientId}`).send({
          type: 'broadcast',
          event: 'manager_message',
          payload: { from: 'manager', text, ts: Date.now() }
        });
        console.log('📡 Supabase broadcast sent for client:', clientId);
      } catch (broadcastError) {
        console.error('❌ Supabase broadcast error:', broadcastError);
      }
    }

    // 2) WebSocket push (всегда, если есть активные подписчики)
    console.log('📤 Sending WebSocket message to client:', clientId);
    const payload = { from: 'manager', text, ts: Date.now() };
    pushToClient(clientId, payload);
    console.log('✅ WebSocket message sent:', payload);

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
  console.log('🎯 pushToClient called:', { clientId, hasClients: !!set, clientCount: set?.size || 0 });
  
  if (!set || !set.size) {
    console.log('❌ No WebSocket clients for clientId:', clientId);
    return;
  }
  
  const data = JSON.stringify(payload);
  console.log('📨 Sending to', set.size, 'WebSocket clients:', data);
  
  for (const ws of set) {
    try { 
      ws.send(data); 
      console.log('✅ Message sent to WebSocket client');
    } catch (error) {
      console.error('❌ Failed to send to WebSocket client:', error);
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
  console.log('📡 Webhook URL: /telegram/webhook/' + WEBHOOK_SECRET);
});
