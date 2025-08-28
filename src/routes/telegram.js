import express from 'express';
import { sb, SUPERGROUP_ID } from '../config/env.js';
import { memoryMap } from '../services/telegramService.js';
import { getTelegramToClientService } from '../services/telegramToClientService.js';

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
    
    console.log('🎯 [TELEGRAM WEBHOOK] Получен запрос от Telegram');
    
    // Получаем экземпляр сервиса
    const telegramService = getTelegramToClientService();
    
    // Обрабатываем сообщение через новый сервис
    const result = await telegramService.processIncomingMessage(req.body);
    
    // Логируем результат обработки
    if (result.success) {
      console.log('✅ [TELEGRAM WEBHOOK] Сообщение успешно обработано:', {
        messageId: result.messageId,
        clientId: result.clientId,
        clientName: result.clientName,
        processingTime: result.processingTime + 'ms',
        websocketDelivery: result.delivery?.websocket?.success,
        supabaseDelivery: result.delivery?.supabase?.success
      });
    } else {
      console.log('❌ [TELEGRAM WEBHOOK] Ошибка обработки сообщения:', {
        errorType: result.error?.type,
        errorMessage: result.error?.message,
        messageId: result.error?.messageId,
        processingTime: result.error?.processingTime
      });
    }
    
    return res.sendStatus(200);
  } catch (e) {
    console.error('❌ [TELEGRAM WEBHOOK] Критическая ошибка:', {
      error: e.message,
      stack: e.stack,
      requestBody: req.body,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    });
    return res.sendStatus(200);
  }
});

export default router;