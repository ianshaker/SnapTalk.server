/**
 * 📱 TELEGRAM NOTIFICATIONS MODULE
 * 
 * Модуль для отправки Telegram уведомлений в системе трекинга страниц:
 * - Отправка уведомлений о переходах по страницам
 * - Форматирование сообщений для Telegram
 * - Управление топиками для разных посетителей
 * - Обработка ошибок отправки
 */

import { sendToTopic, ensureTopicForVisitor, saveSiteVisit } from '../../services/telegramService.js';
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
    // Валидация входных данных
    if (!client || !client.telegram_group_id || !client.telegram_bot_token) {
      logWithTimestamp(`Telegram notification skipped: missing telegram configuration for client ${client?.id}`);
      return {
        success: false,
        error: 'Missing Telegram configuration',
        skipped: true
      };
    }
    
    if (!eventData || !visitorId) {
      logWithTimestamp('Telegram notification failed: missing event data or visitor ID');
      return {
        success: false,
        error: 'Missing event data or visitor ID'
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
    
    logWithTimestamp(`Preparing Telegram notification for visitor ${visitorId} on site ${metadata.siteName}`);
    
    // Проверяем, существует ли уже посетитель для правильного форматирования сообщения
    const topicInfo = await ensureTopicForVisitor(
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
    
    // Форматирование сообщения в зависимости от типа события
    let message;
    const eventType = eventData.event_type;
    
    if (eventType === 'tab_switch') {
      message = formatTabSwitchMessage({
        eventData,
        visitorId,
        sessionDuration: eventData.session_duration
      });
    } else if (eventType === 'session_end') {
      message = formatSessionEndMessage({
        eventData,
        visitorId,
        sessionDuration: eventData.session_duration
      });
    } else {
      // Для session_start и page_view используем стандартное форматирование
      const messageResult = formatTelegramMessage({
        eventData,
        visitorId,
        isExistingVisitor,
        isPageTransition: isExistingVisitor
      });
      message = messageResult.fullMessage;
    }
    
    // Сохранение визита в таблицу site_visitors
    try {
      await saveSiteVisit(
        client.id,
        visitorId,
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
    } catch (siteVisitError) {
      logWithTimestamp(`Warning: Failed to save site visit: ${siteVisitError.message}`);
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
      logWithTimestamp(`Telegram notification sent successfully for visitor ${visitorId}`);
      return {
        success: true,
        messageId: telegramResult.message_id,
        visitorId: visitorId,
        siteId: client.id
      };
    } else {
      logWithTimestamp(`Telegram notification failed for visitor ${visitorId}: unexpected result format`);
      return {
        success: false,
        error: 'Unexpected result format from sendToTopic',
        visitorId: visitorId,
        siteId: client.id
      };
    }
    
  } catch (error) {
    logWithTimestamp(`Error sending Telegram notification: ${error.message}`);
    return {
      success: false,
      error: error.message,
      visitorId: visitorId,
      siteId: client?.id
    };
  }
}

/**
 * Форматирование сообщения для Telegram (устаревшая функция, теперь используется сервис)
 * @param {Object} metadata - Метаданные события
 * @param {boolean} hasExistingTopic - Есть ли существующий топик для посетителя
 * @returns {string} - Отформатированное сообщение
 * @deprecated Используйте formatTelegramMessage из messageFormatterService
 */
function formatTelegramMessageLegacy(metadata, hasExistingTopic = false) {
  const {
    siteName,
    visitorId,
    timestamp,
    eventData
  } = metadata;
  
  const result = formatTelegramMessage({
    eventData,
    visitorId,
    isExistingVisitor: hasExistingTopic,
    isPageTransition: hasExistingTopic
  });
  
  return result.fullMessage;
}

/**
 * Парсинг информации о браузере из User-Agent
 * @param {string} userAgent - User-Agent строка
 * @returns {string|null} - Информация о браузере
 */
function parseBrowserInfo(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return null;
  }
  
  try {
    // Простой парсинг основных браузеров
    if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
      const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+)/);
      return chromeMatch ? `Chrome ${chromeMatch[1]}` : 'Chrome';
    }
    
    if (userAgent.includes('Firefox/')) {
      const firefoxMatch = userAgent.match(/Firefox\/(\d+\.\d+)/);
      return firefoxMatch ? `Firefox ${firefoxMatch[1]}` : 'Firefox';
    }
    
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
      const safariMatch = userAgent.match(/Version\/(\d+\.\d+).*Safari/);
      return safariMatch ? `Safari ${safariMatch[1]}` : 'Safari';
    }
    
    if (userAgent.includes('Edg/')) {
      const edgeMatch = userAgent.match(/Edg\/(\d+\.\d+)/);
      return edgeMatch ? `Edge ${edgeMatch[1]}` : 'Edge';
    }
    
    if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) {
      const operaMatch = userAgent.match(/(?:Opera\/|OPR\/)([\d\.]+)/);
      return operaMatch ? `Opera ${operaMatch[1]}` : 'Opera';
    }
    
    // Мобильные браузеры
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      if (userAgent.includes('Chrome/')) {
        return 'Chrome Mobile';
      }
      if (userAgent.includes('Safari/')) {
        return 'Safari Mobile';
      }
      return 'Mobile Browser';
    }
    
    return null;
    
  } catch (error) {
    logWithTimestamp(`Error parsing browser info: ${error.message}`);
    return null;
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