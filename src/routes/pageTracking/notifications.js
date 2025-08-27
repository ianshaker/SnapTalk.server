/**
 * 📱 TELEGRAM NOTIFICATIONS MODULE
 * 
 * Модуль для отправки Telegram уведомлений в системе трекинга страниц:
 * - Отправка уведомлений о переходах по страницам
 * - Форматирование сообщений для Telegram
 * - Управление топиками для разных посетителей
 * - Обработка ошибок отправки
 */

import { sendToTopic, ensureTopicForVisitor } from '../../services/telegramService.js';
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
    
    // Форматирование сообщения с учетом статуса посетителя
    const message = formatTelegramMessage(metadata, isExistingVisitor);
    
    // Отправка уведомления через telegramService
    const telegramResult = await sendToTopic({
      clientId: client.id,
      text: message,
      prefix: '🔔 ',
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
 * Форматирование сообщения для Telegram
 * @param {Object} metadata - Метаданные события
 * @param {boolean} hasExistingTopic - Есть ли существующий топик для посетителя
 * @returns {string} - Отформатированное сообщение
 */
function formatTelegramMessage(metadata, hasExistingTopic = false) {
  const {
    siteName,
    visitorId,
    timestamp,
    eventData
  } = metadata;
  
  // Форматирование времени
  const timeFormatted = new Date(timestamp).toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Базовая информация
  let message = '';
  
  if (hasExistingTopic) {
    // Сообщение для существующего посетителя (более краткое)
    message += `🔄 **Переход по сайту**\n\n`;
  } else {
    // Сообщение для нового посетителя (более подробное)
    message += `🆕 **Новый посетитель на сайте**\n\n`;
    message += `👤 **Посетитель:** \`${visitorId}\`\n`;
  }
  
  message += `🌐 **Сайт:** ${siteName}\n`;
  message += `📄 **Страница:** ${eventData.page_path || '/'}\n`;
  
  // Заголовок страницы (если есть)
  if (eventData.page_title && eventData.page_title.trim()) {
    message += `📝 **Заголовок:** ${eventData.page_title}\n`;
  }
  
  // URL страницы
  if (eventData.page_url) {
    message += `🔗 **URL:** ${eventData.page_url}\n`;
  }
  
  // Реферер (если есть)
  if (eventData.referrer && eventData.referrer.trim() && eventData.referrer !== eventData.page_url) {
    try {
      const referrerUrl = new URL(eventData.referrer);
      const referrerDomain = referrerUrl.hostname;
      message += `📥 **Откуда:** ${referrerDomain}\n`;
    } catch {
      // Если не удалось распарсить URL, показываем как есть
      message += `📥 **Откуда:** ${eventData.referrer}\n`;
    }
  }
  
  // UTM параметры (если есть)
  if (eventData.utm_data && Object.keys(eventData.utm_data).length > 0) {
    message += `\n📊 **UTM параметры:**\n`;
    
    if (eventData.utm_data.utm_source) {
      message += `• Источник: ${eventData.utm_data.utm_source}\n`;
    }
    if (eventData.utm_data.utm_medium) {
      message += `• Канал: ${eventData.utm_data.utm_medium}\n`;
    }
    if (eventData.utm_data.utm_campaign) {
      message += `• Кампания: ${eventData.utm_data.utm_campaign}\n`;
    }
    if (eventData.utm_data.utm_term) {
      message += `• Ключевое слово: ${eventData.utm_data.utm_term}\n`;
    }
    if (eventData.utm_data.utm_content) {
      message += `• Контент: ${eventData.utm_data.utm_content}\n`;
    }
  }
  
  // Информация о браузере (если есть)
  if (eventData.user_agent) {
    const browserInfo = parseBrowserInfo(eventData.user_agent);
    if (browserInfo) {
      message += `\n🖥️ **Браузер:** ${browserInfo}\n`;
    }
  }
  
  // IP адрес (если есть)
  if (eventData.ip_address && eventData.ip_address !== '127.0.0.1' && eventData.ip_address !== '::1') {
    message += `🌍 **IP:** \`${eventData.ip_address}\`\n`;
  }
  
  // Время
  message += `\n⏰ **Время:** ${timeFormatted}`;
  
  return message;
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