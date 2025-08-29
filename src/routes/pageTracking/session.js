import { validateSessionTrackingData } from './validation.js';
import { findClientBySiteKey } from './clientCache.js';
import { savePageEvent } from './database.js';
import { prepareEventData, logWithTimestamp } from './utils.js';
import { sendTelegramNotification } from './notifications.js';
import { saveSiteVisit, updateSiteVisitOnSessionEnd } from '../../services/telegramService.js';
import { sb } from '../../config/env.js';
import visitorCache from '../../utils/cache/VisitorCache.js'; // 🔥 NEW

/**
 * Обработка session tracking событий
 * POST /api/track/session
 */
export async function trackSession(req, res) {
  try {
    // Обработка sendBeacon данных (могут прийти как текст)
    let requestBody = req.body;
    if (typeof req.body === 'string') {
      try {
        requestBody = JSON.parse(req.body);
      } catch (error) {
        logWithTimestamp(`❌ Failed to parse JSON from sendBeacon: ${error.message}`);
        return res.status(400).json({ error: 'Invalid JSON format' });
      }
    }

    // Валидация входящих данных
    const validationResult = validateSessionTrackingData(requestBody);
    if (!validationResult.isValid) {
      logWithTimestamp(`❌ Session validation failed: ${validationResult.errors.join(', ')}`);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.errors 
      });
    }

    const { siteKey, visitorId, eventType, requestId } = requestBody;

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
        sessionData.sessionDuration = requestBody.sessionDuration || null;
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
      url: requestBody.url || null,
      title: requestBody.title || null,
      referrer: requestBody.referrer || null,
      utm: requestBody.utm || null,
      userAgent: requestBody.userAgent || req.headers['user-agent'],
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

    // Обрабатываем site_visits в зависимости от типа события
    if (eventType === 'session_start') {
      logWithTimestamp(`📊 About to call saveSiteVisit for session_start, visitor ${visitorId}`);
      try {
        await saveSiteVisit(
          client.id,
          visitorId, // Используем исходный visitorId из requestBody
          eventData.request_id,
          eventData.page_url,
          {
            title: eventData.page_title,
            ref: eventData.referrer,
            utm: eventData.utm_data
          },
          eventData.user_agent,
          eventData.ip_address
        );
        logWithTimestamp(`📊 saveSiteVisit completed successfully for session_start, visitor ${visitorId}`);
      } catch (siteVisitError) {
        logWithTimestamp(`❌ Failed to save site visit for session_start: ${siteVisitError.message}`);
        logWithTimestamp(`❌ saveSiteVisit error details:`, siteVisitError);
      }
    } else if (eventType === 'session_end') {
      // Обновляем существующую запись при завершении сессии
      logWithTimestamp(`📊 About to call updateSiteVisitOnSessionEnd for session_end, visitor ${visitorId}`);
      try {
        await updateSiteVisitOnSessionEnd(visitorId, sessionData.sessionDuration);
        logWithTimestamp(`📊 updateSiteVisitOnSessionEnd completed successfully for session_end, visitor ${visitorId}`);
      } catch (updateVisitError) {
        logWithTimestamp(`❌ Failed to update site visit for session_end: ${updateVisitError.message}`);
        logWithTimestamp(`❌ updateSiteVisitOnSessionEnd error details:`, updateVisitError);
      }
    }

    // Отправка Telegram уведомления для session событий (ПЕРЕД обновлением статуса!)
    if (client.telegram_bot_token && client.telegram_group_id && ['session_start', 'session_end', 'tab_switch'].includes(eventType)) {
      try {
        // Отладочное логирование перед вызовом sendTelegramNotification
        logWithTimestamp(`🔍 About to call sendTelegramNotification with:`);
        logWithTimestamp(`🔍 - visitorId type: ${typeof visitorId}`);
        logWithTimestamp(`🔍 - visitorId value:`, visitorId);
        logWithTimestamp(`🔍 - eventData.visitor_id:`, eventData.visitor_id);
        
        // Создаем копию eventData с правильным visitorId для Telegram уведомлений
        const telegramEventData = { ...eventData, visitor_id: visitorId };
        logWithTimestamp(`🔍 - telegramEventData.visitor_id:`, telegramEventData.visitor_id);
        await sendTelegramNotification(client, telegramEventData, visitorId);
        logWithTimestamp(`📱 Telegram notification sent for ${eventType}`);
      } catch (telegramError) {
        logWithTimestamp(`❌ Telegram notification failed: ${telegramError.message}`);
        // Не прерываем выполнение, если уведомление не отправилось
      }
    }

    // Обновление last_session_status при начале и завершении сессии (ПОСЛЕ отправки уведомления!)
    if ((eventType === 'session_start' || eventType === 'session_end') && visitorId) {
      try {
        let lastSessionStatus;
        
        if (eventType === 'session_start') {
          lastSessionStatus = 'active';
        } else if (eventType === 'session_end') {
          // Определяем тип завершения сессии
          const sessionEndReason = requestBody.reason || 'closed';
          lastSessionStatus = sessionEndReason === 'inactivity' ? 'timeout' : 'closed';
        }
        
        const { error } = await sb
          .from('client_topics')
          .update({ 
            last_session_status: lastSessionStatus,
            updated_at: new Date().toISOString()
          })
          .eq('visitor_id', visitorId);
        
        if (error) {
          logWithTimestamp(`❌ Failed to update last_session_status: ${error.message}`);
        } else {
          logWithTimestamp(`✅ Updated last_session_status to '${lastSessionStatus}' for visitor ${visitorId}`);
          // 🔥 NEW: Update cache
          visitorCache.updateLastSessionStatus(visitorId, lastSessionStatus);
        }
      } catch (updateError) {
        logWithTimestamp(`❌ Error updating last_session_status: ${updateError.message}`);
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