/**
 * 📱 TELEGRAM NOTIFICATIONS MODULE
 * 
 * Модуль для отправки Telegram уведомлений в системе трекинга страниц:
 * - Отправка уведомлений о переходах по страницам
 * - Форматирование сообщений для Telegram
 * - Управление топиками для разных посетителей
 * - Обработка ошибок отправки
 */

import { sendToTopic, ensureTopicForVisitor, ensureTopicForVisitorForClient, saveSiteVisit } from '../../services/telegramService.js';
import { formatTelegramMessage, getMessagePrefix, formatTabSwitchMessage, formatSessionEndMessage } from '../../services/messageFormatterService.js';
import { logWithTimestamp } from './utils.js';

/**
 * Отправка Telegram уведомления о переходе по странице
 * @param {Object} client - Данные клиента
 * @param {Object} eventData - Данные события
 * @param {string} visitorId - ID посетителя
 * @returns {Promise<Object>} - Результат отправки
 */
export async function sendTelegramNotification(client, eventData, visitorId) {
  try {
    // Валидация базовых входных данных
    if (!eventData || !visitorId) {
      logWithTimestamp('❌ Telegram notification failed: missing event data or visitor ID');
      return {
        success: false,
        error: 'Missing event data or visitor ID'
      };
    }
    
    if (!client) {
      logWithTimestamp('❌ Telegram notification failed: missing client data');
      return {
        success: false,
        error: 'Missing client data'
      };
    }
    
    // Сохранение визита перенесено в session.js для предотвращения дублирования
    
    // Проверка конфигурации Telegram (после сохранения визита)
    if (!client.telegram_group_id || !client.telegram_bot_token) {
      logWithTimestamp(`Telegram notification skipped: missing telegram configuration for client ${client.id}`);
      return {
        success: false,
        error: 'Missing Telegram configuration',
        skipped: true
      };
    }
    
    // Подготовка метаданных
    const metadata = {
      siteId: client.id,
      siteName: client.site_name || client.site_url || 'Unknown Site',
      visitorId: visitorId,
      timestamp: new Date().toISOString(),
      eventData: eventData
    };
    
    // Проверяем, существует ли уже посетитель для правильного форматирования сообщения
    // Для session событий используем поиск по конкретному клиенту
    const isSessionEvent = ['session_start', 'session_end', 'tab_switch'].includes(eventData.event_type);
    const topicInfo = isSessionEvent 
      ? await ensureTopicForVisitorForClient(
          client.id,
          client,
          visitorId,
          eventData.request_id,
          eventData.page_url,
          {
            title: eventData.page_title,
            ref: eventData.referrer,
            utm: eventData.utm_data
          }
        )
      : await ensureTopicForVisitor(
          client.id,
          client,
          visitorId,
          eventData.request_id,
          eventData.page_url,
          {
            title: eventData.page_title,
            ref: eventData.referrer,
            utm: eventData.utm_data
          }
        );
    

    
    const isExistingVisitor = topicInfo && typeof topicInfo === 'object' && topicInfo.isExistingVisitor;
    const lastSessionStatus = topicInfo && typeof topicInfo === 'object' ? topicInfo.lastSessionStatus : null;
    
    // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ
    logWithTimestamp(`🔍 DEBUG visitor ${visitorId.slice(0,8)}:`);
    logWithTimestamp(`🔍   topicInfo:`, JSON.stringify(topicInfo, null, 2));
    logWithTimestamp(`🔍   isExistingVisitor: ${isExistingVisitor}`);
    logWithTimestamp(`🔍   lastSessionStatus: ${lastSessionStatus}`);
    logWithTimestamp(`🔍   event_type: ${eventData.event_type}`);
    
    // Проверяем, нужно ли пропустить page_view уведомление
    // Если это page_view событие сразу после session_start, пропускаем его
    if (eventData.event_type === 'page_view' && eventData.isSessionStart) {
      logWithTimestamp(`📊 Пропускаем page_view уведомление для visitor ${visitorId.slice(0,8)} - это событие сразу после session_start`);
      return {
        success: true,
        skipped: true,
        reason: 'page_view_after_session_start',
        visitorId: visitorId,
        siteId: client.id
      };
    }
    
    // Форматирование сообщения в зависимости от типа события
    let message;
    const shortVisitorId = visitorId.slice(0, 8);
    const timeStr = new Date(eventData.event_timestamp).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
    
    switch (eventData.event_type) {
      case 'tab_switch':
        message = `🔄 Клиент переключил вкладку\n` +
                 `${shortVisitorId} • ${timeStr}\n` +
                 `${eventData.page_title || eventData.page_url}`;
        break;
      case 'session_end':
        const duration = eventData.session_duration ? 
          `${Math.round(eventData.session_duration / 1000)}с` : '?';
        message = `🔚 Клиент завершил сессию\n` +
                 `${shortVisitorId} • ${timeStr} • ⏱️${duration}\n` +
                 `${eventData.page_title || eventData.page_url}`;
        break;
      case 'page_view':
      case 'session_start':
      default:
        // Определяем тип посетителя на основе isExistingVisitor и last_session_status
        let visitorType;
        if (!isExistingVisitor) {
          visitorType = '👋 Новый посетитель';
        } else if (lastSessionStatus === 'closed') {
          visitorType = '🔄 ВОЗВРАТ ПОСЛЕ ЗАКРЫТИЯ САЙТА';
        } else if (lastSessionStatus === 'timeout') {
          visitorType = '⏰ ВОЗВРАТ ПОСЛЕ ТАЙМАУТА';
        } else {
          visitorType = '📄 Переход между страницами';
        }
        
        message = `${visitorType}\n` +
                 `${shortVisitorId} • ${timeStr}\n` +
                 `${eventData.page_title || eventData.page_url}\n` +
                 `🔗 ${eventData.referrer || 'Прямой переход'}`;
        

        break;
    }
    
    // Отправка уведомления через telegramService
    const telegramResult = await sendToTopic({
      clientId: client.id,
      text: message,
      prefix: '',
      client: client,
      visitorId: visitorId,
      requestId: eventData.request_id,
      url: eventData.page_url,
      meta: {
        title: eventData.page_title,
        ref: eventData.referrer,
        utm: eventData.utm_data
      }
    });
    
    // sendToTopic возвращает результат Telegram API напрямую
    if (telegramResult && telegramResult.message_id) {
      return {
        success: true,
        messageId: telegramResult.message_id,
        visitorId: visitorId,
        siteId: client.id
      };
    } else {
      logWithTimestamp(`❌ Telegram notification failed for visitor ${visitorId}: unexpected result format`);
      return {
        success: false,
        error: 'Unexpected result format from sendToTopic',
        visitorId: visitorId,
        siteId: client.id
      };
    }
    
  } catch (error) {
    logWithTimestamp(`❌ Error sending Telegram notification: ${error.message}`);
    return {
      success: false,
      error: error.message,
      visitorId: visitorId,
      siteId: client?.id
    };
  }
}



/**
 * Отправка тестового Telegram уведомления
 * @param {Object} client - Данные клиента
 * @param {string} visitorId - ID посетителя для теста
 * @param {string} testUrl - URL для теста
 * @returns {Promise<Object>} - Результат отправки
 */
export async function sendTestTelegramNotification(client, visitorId, testUrl) {
  try {
    logWithTimestamp(`Sending test Telegram notification for client ${client.id}`);
    
    // Подготовка тестовых данных события
    const testEventData = {
      page_url: testUrl,
      page_path: new URL(testUrl).pathname,
      page_title: 'Тестовая страница - Page Tracking API',
      referrer: 'https://test-referrer.com',
      user_agent: 'Mozilla/5.0 (Test Browser) PageTrackingAPI/1.0',
      ip_address: '192.168.1.100',
      utm_data: {
        utm_source: 'test',
        utm_medium: 'api',
        utm_campaign: 'page_tracking_test',
        utm_term: 'test_notification',
        utm_content: 'api_test'
      }
    };
    
    // Отправка тестового уведомления
    const result = await sendTelegramNotification(client, testEventData, visitorId);
    
    if (result.success) {
      logWithTimestamp(`Test Telegram notification sent successfully for client ${client.id}`);
      return {
        success: true,
        message: 'Test notification sent successfully',
        messageId: result.messageId,
        topicId: result.topicId,
        testData: {
          visitorId,
          testUrl,
          siteId: client.id,
          siteName: client.site_name || client.site_url
        }
      };
    } else {
      logWithTimestamp(`Test Telegram notification failed for client ${client.id}: ${result.error}`);
      return {
        success: false,
        error: result.error,
        testData: {
          visitorId,
          testUrl,
          siteId: client.id
        }
      };
    }
    
  } catch (error) {
    logWithTimestamp(`Error sending test Telegram notification: ${error.message}`);
    return {
      success: false,
      error: error.message,
      testData: {
        visitorId,
        testUrl,
        siteId: client?.id
      }
    };
  }
}

/**
 * Проверка конфигурации Telegram для клиента
 * @param {Object} client - Данные клиента
 * @returns {Object} - Результат проверки
 */
export function validateTelegramConfig(client) {
  const errors = [];
  const warnings = [];
  
  if (!client) {
    errors.push('Client data is missing');
    return { valid: false, errors, warnings };
  }
  
  if (!client.telegram_bot_token) {
    errors.push('Telegram bot token is missing');
  } else if (typeof client.telegram_bot_token !== 'string' || !client.telegram_bot_token.includes(':')) {
    errors.push('Telegram bot token format is invalid');
  }
  
  if (!client.telegram_group_id) {
    errors.push('Telegram group ID is missing');
  } else if (typeof client.telegram_group_id !== 'string' && typeof client.telegram_group_id !== 'number') {
    errors.push('Telegram group ID format is invalid');
  }
  
  if (client.telegram_topic_mapping && typeof client.telegram_topic_mapping !== 'object') {
    warnings.push('Telegram topic mapping should be an object');
  }
  
  const valid = errors.length === 0;
  
  return {
    valid,
    errors,
    warnings,
    hasTopicSupport: !!client.telegram_topic_mapping
  };
}