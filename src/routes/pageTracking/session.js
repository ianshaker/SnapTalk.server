import { validateSessionTrackingData } from './validation.js';
import { findClientBySiteKey } from './clientCache.js';
import { savePageEvent } from './database.js';
import { prepareEventData, logWithTimestamp } from './utils.js';
import { sendTelegramNotification } from './notifications.js';

/**
 * Обработка session tracking событий
 * POST /api/track/session
 */
export async function trackSession(req, res) {
  try {
    // Валидация входящих данных
    const validationResult = validateSessionTrackingData(req.body);
    if (!validationResult.isValid) {
      logWithTimestamp(`❌ Session validation failed: ${validationResult.errors.join(', ')}`);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.errors 
      });
    }

    const { siteKey, visitorId, eventType, requestId } = req.body;

    // Получение клиента по site key
    const client = await findClientBySiteKey(siteKey);
    if (!client) {
      logWithTimestamp(`❌ Client not found for site key: ${siteKey}`);
      return res.status(404).json({ error: 'Client not found' });
    }

    logWithTimestamp(`Processing session event '${eventType}' for client ${client.id} (${client.site_name || client.site_url})`);

    // Определение session tracking полей на основе типа события
    let sessionData = {
      isSessionActive: true,
      isSessionStart: false,
      isSessionEnd: false,
      sessionDuration: null
    };

    switch (eventType) {
      case 'session_start':
        sessionData.isSessionStart = true;
        sessionData.isSessionActive = true;
        break;
      
      case 'session_end':
        sessionData.isSessionEnd = true;
        sessionData.isSessionActive = false;
        sessionData.sessionDuration = req.body.sessionDuration || null;
        break;
      
      case 'tab_switch':
        sessionData.isSessionActive = true;
        break;
      
      default:
        logWithTimestamp(`❌ Unknown event type: ${eventType}`);
        return res.status(400).json({ error: 'Unknown event type' });
    }

    // Подготовка данных события
    const eventData = prepareEventData({
      clientId: client.id,
      visitorId: visitorId,
      requestId: requestId,
      url: req.body.url || null,
      title: req.body.title || null,
      referrer: req.body.referrer || null,
      utm: req.body.utm || null,
      userAgent: req.body.userAgent || req.headers['user-agent'],
      ipAddress: req.ip,
      timestamp: new Date().toISOString(),
      // Session tracking поля
      eventType: eventType,
      sessionDuration: sessionData.sessionDuration,
      isSessionActive: sessionData.isSessionActive,
      isSessionStart: sessionData.isSessionStart,
      isSessionEnd: sessionData.isSessionEnd
    });

    // Сохранение события в базу данных
    const savedEvent = await savePageEvent(eventData);
    logWithTimestamp(`✅ Session event '${eventType}' saved with ID: ${savedEvent.id}`);

    // Отправка Telegram уведомления для session событий
    if (client.telegram_enabled && ['session_start', 'session_end', 'tab_switch'].includes(eventType)) {
      try {
        await sendTelegramNotification(client, eventData, savedEvent);
        logWithTimestamp(`📱 Telegram notification sent for ${eventType}`);
      } catch (telegramError) {
        logWithTimestamp(`❌ Telegram notification failed: ${telegramError.message}`);
        // Не прерываем выполнение, если уведомление не отправилось
      }
    }

    // Успешный ответ
    res.json({
      success: true,
      eventId: savedEvent.id,
      eventType: eventType,
      timestamp: eventData.event_timestamp
    });

  } catch (error) {
    logWithTimestamp(`❌ Session tracking error: ${error.message}`);
    console.error('Session tracking error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}