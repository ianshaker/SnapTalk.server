import express from 'express';
import { sb } from '../config/env.js';
import { memoryMap } from '../services/telegramService.js';

const router = express.Router();

// Функция для отправки сообщений клиентам через WebSocket
let pushToClient = null;

// Функция для установки pushToClient из server.js
export function setPushToClient(pushFunction) {
  pushToClient = pushFunction;
}

// ===== Webhook: Telegram -> сайт (ответ менеджера) =====
router.post('/webhook/:WEBHOOK_SECRET', async (req, res) => {
  try {
    const { WEBHOOK_SECRET } = req.params;
    const { SUPERGROUP_ID } = process.env;
    
    const update = req.body;
    const msg = update?.message;
    const text = msg?.text;
    const topicId = msg?.message_thread_id;
    const chatId = msg?.chat?.id;

    // Интересуют только сообщения в топиках нашей супергруппы
    if (!text || !topicId || chatId !== parseInt(SUPERGROUP_ID)) {
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
    if (pushToClient) {
      pushToClient(clientId, payload);
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error('webhook error', e);
    return res.sendStatus(200);
  }
});

export default router;