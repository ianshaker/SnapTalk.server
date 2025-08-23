import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

/**
 * ENV (добавишь на Render):
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_SUPERGROUP_ID   (id супергруппы с включённым Forum)
 * - TELEGRAM_WEBHOOK_SECRET  (любой случайный текст, чтобы урл вебхука был скрытым)
 * - SUPABASE_URL (опц.)
 * - SUPABASE_SERVICE_ROLE (опц.)
 */

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID && Number(process.env.TELEGRAM_SUPERGROUP_ID);
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-secret';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

const sb = (SUPABASE_URL && SUPABASE_SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
  : null;

// Простейший кэш на случай отсутствия БД (пропадёт после рестарта)
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

// Создать топик в супергруппе (forum)
async function ensureTopic(clientId) {
  // ищем в БД/кэше
  let topicId = await dbGetTopic(clientId);
  if (topicId) return topicId;

  // создаём новый топик
  const title = `Client #${clientId}`;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/createForumTopic`;
  const { data } = await axios.post(url, {
    chat_id: SUPERGROUP_ID,
    name: title
  });
  if (!data.ok) throw new Error('createForumTopic failed: ' + JSON.stringify(data));
  topicId = data.result.message_thread_id;
  await dbSaveTopic(clientId, topicId);
  return topicId;
}

// Отправить сообщение в нужный топик
async function sendToTopic({ clientId, text, prefix = '' }) {
  if (!BOT_TOKEN || !SUPERGROUP_ID) throw new Error('Telegram env vars not set');
  const topicId = await ensureTopic(clientId);

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const msg = `${prefix}${text}`;
  const payload = {
    chat_id: SUPERGROUP_ID,
    message_thread_id: topicId,
    text: msg,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  const { data } = await axios.post(url, payload);
  if (!data.ok) throw new Error('sendMessage failed: ' + JSON.stringify(data));
  return data.result;
}

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

/**
 * Вход от сайта (посетитель пишет в модалке)
 * body: { clientId: string, text: string, meta?: any }
 */
app.post('/api/chat/send', async (req, res) => {
  try {
    const { clientId, text, meta } = req.body || {};
    if (!clientId || !text) return res.status(400).json({ ok: false, error: 'clientId and text required' });

    const prefix = meta?.utm
      ? `#${clientId} • ${meta.utm.source || ''}/${meta.utm.campaign || ''}/${meta.utm.term || ''}\n\n`
      : `#${clientId}\n\n`;

    await sendToTopic({ clientId, text, prefix });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

/**
 * Вебхук Телеграма (ответ менеджера → на сайт)
 * URL на Render будет: https://<service>.onrender.com/telegram/webhook/<WEBHOOK_SECRET>
 * Подписываем бот на этот вебхук после деплоя.
 */
app.post(`/telegram/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  try {
    const update = req.body;

    // интересуют только сообщения в топиках супергруппы
    const msg = update?.message;
    const text = msg?.text;
    const topicId = msg?.message_thread_id;
    const chatId = msg?.chat?.id;

    if (chatId !== SUPERGROUP_ID || !topicId || !text) {
      return res.sendStatus(200);
    }

    // Находим clientId по topicId
    let clientId = null;
    if (sb) {
      const { data, error } = await sb
        .from('client_topics')
        .select('client_id')
        .eq('topic_id', topicId)
        .maybeSingle();
      if (!error) clientId = data?.client_id || null;
    } else {
      // поиск в памяти
      for (const [cid, tid] of memoryMap.entries()) {
        if (tid === topicId) { clientId = cid; break; }
      }
    }

    if (!clientId) return res.sendStatus(200);

    // Здесь у тебя два пути доставки "обратно на сайт":
    // 1) через Supabase Realtime Broadcast (если используешь фронтенд-подписку на канал client:<id>)
    // 2) через собственный WebSocket-сервер (если выберешь вариант B)
    // Ниже пример для Supabase Broadcast:
    if (sb) {
      await sb.channel(`client:${clientId}`).send({
        type: 'broadcast',
        event: 'manager_message',
        payload: { from: 'manager', text, ts: Date.now() }
      });
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error('webhook error', e);
    return res.sendStatus(200);
  }
});

app.listen(PORT, () => {
  console.log('Server listening on', PORT);
});
