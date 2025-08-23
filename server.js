import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

/**
 * ENV (ставим на Render → Settings → Environment):
 * - TELEGRAM_BOT_TOKEN        // токен бота из BotFather
 * - TELEGRAM_SUPERGROUP_ID    // ИД супергруппы с включённым Forum, ВНИМАНИЕ: с минусом! пример: -1002996396033
 * - TELEGRAM_WEBHOOK_SECRET   // произвольная строка для секьюрного пути вебхука
 * - SUPABASE_URL              // (опц.) URL проекта Supabase
 * - SUPABASE_SERVICE_ROLE     // (опц.) сервисный ключ Supabase (только на сервер!)
 */

const app = express();

// Разрешаем запросы только с твоего сайта и поддоменов *.lovable.app
const allowed = ['https://savov.lovable.app'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // health, Postman
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

// Клиент Supabase (если заданы переменные)
const sb = (SUPABASE_URL && SUPABASE_SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
  : null;

// Простейший in-memory кэш (на случай, если Supabase не подключён)
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

// Создать топик (forum topic) в супергруппе и запомнить маппинг
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

// Отправить сообщение в нужный топик
async function sendToTopic({ clientId, text, prefix = '' }) {
  const topicId = await ensureTopic(clientId);

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const msg = `${prefix}${text}`.slice(0, 4096); // ограничение Telegram
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

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

/**
 * Вход от сайта (посетитель пишет в модалке)
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

/**
 * Вебхук Телеграма (ответ менеджера → на сайт)
 * Путь: https://<render-app>.onrender.com/telegram/webhook/<WEBHOOK_SECRET>
 */
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

    // Дальше два пути доставки в браузер:
    // 1) Supabase Realtime Broadcast (если фронт подписан на client:<id>)
    if (sb) {
      await sb.channel(`client:${clientId}`).send({
        type: 'broadcast',
        event: 'manager_message',
        payload: { from: 'manager', text, ts: Date.now() }
      });
    }
    // 2) Либо свой WebSocket-хаб — добавим при необходимости.

    return res.sendStatus(200);
  } catch (e) {
    console.error('webhook error', e);
    return res.sendStatus(200);
  }
});

app.listen(PORT, () => {
  console.log('Server listening on', PORT);
});
