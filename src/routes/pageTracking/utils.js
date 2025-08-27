/**
 * 🛠️ UTILITIES FOR PAGE TRACKING
 * 
 * Утилиты для системы трекинга страниц:
 * - Логирование с временными метками
 * - Извлечение пути из URL
 * - Вспомогательные функции
 */

/**
 * Утилита для логирования с временной меткой
 * @param {string} message - Сообщение для логирования
 * @param {*} data - Дополнительные данные (опционально)
 */
export function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] 📊 ${message}`, data);
  } else {
    console.log(`[${timestamp}] 📊 ${message}`);
  }
}

/**
 * Извлечение page_path из полного URL
 * @param {string} url - Полный URL
 * @returns {string} - Путь страницы
 */
export function extractPagePath(url) {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    
    // Добавляем query параметры если они есть
    if (urlObj.search) {
      path += urlObj.search;
    }
    
    // Добавляем hash если он есть
    if (urlObj.hash) {
      path += urlObj.hash;
    }
    
    return path;
  } catch (error) {
    logWithTimestamp(`Error extracting path from URL: ${url}`, error);
    // Возвращаем исходный URL как fallback
    return url;
  }
}

/**
 * Подготовка данных события для сохранения
 * @param {Object} eventData - Исходные данные события
 * @returns {Object} - Подготовленные данные для базы
 */
export function prepareEventData(eventData) {
  // Извлекаем page_path из URL
  const pagePath = eventData.url ? extractPagePath(eventData.url) : null;
  
  // Подготавливаем UTM параметры
  const utmData = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null
  };
  
  if (eventData.utm && typeof eventData.utm === 'object') {
    Object.keys(utmData).forEach(key => {
      const utmKey = key.replace('utm_', '');
      if (eventData.utm[utmKey] && typeof eventData.utm[utmKey] === 'string') {
        const value = eventData.utm[utmKey].trim();
        utmData[key] = value.length > 0 ? value : null;
      }
    });
  }
  
  // Подготавливаем основные данные
  // Проверяем тип visitorId для отладки
  if (eventData.visitorId && typeof eventData.visitorId !== 'string') {
    console.log('⚠️ WARNING: visitorId is not a string:', typeof eventData.visitorId, eventData.visitorId);
  }
  
  const preparedData = {
    site_id: eventData.clientId, // database.js ожидает site_id, а не client_id
    visitor_id: typeof eventData.visitorId === 'string' ? eventData.visitorId.trim() : eventData.visitorId,
    request_id: eventData.requestId?.trim() || null, // request_id должен приходить от fingerprint сервиса
    page_url: eventData.url?.trim() || null,
    page_path: pagePath,
    page_title: eventData.title?.trim() || null,
    referrer: eventData.referrer?.trim() || null,
    utm_data: utmData, // database.js ожидает utm_data как объект
    user_agent: eventData.userAgent?.trim() || null,
    ip_address: eventData.ipAddress?.trim() || null,
    event_timestamp: eventData.timestamp || new Date().toISOString(),
    
    // Session tracking поля
    event_type: eventData.eventType || 'page_view',
    session_duration: eventData.sessionDuration || null,
    is_session_active: eventData.isSessionActive !== undefined ? eventData.isSessionActive : true,
    is_session_start: eventData.isSessionStart || false,
    is_session_end: eventData.isSessionEnd || false
  };
  
  return preparedData;
}