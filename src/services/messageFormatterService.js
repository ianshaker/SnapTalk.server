/**
 * 📝 MESSAGE FORMATTER SERVICE
 * 
 * Централизованный сервис для форматирования Telegram сообщений:
 * - Единая логика форматирования для всех типов уведомлений
 * - Поддержка различных типов посетителей (новый/повторный)
 * - Консистентное форматирование времени и данных
 * - Легкость в поддержке и изменении формата
 */

/**
 * Форматирование времени в московском часовом поясе
 * @param {Date|string} timestamp - Временная метка
 * @returns {string} - Отформатированное время
 */
function formatTimestamp(timestamp = new Date()) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  return date.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Форматирование базового сообщения для Telegram
 * @param {Object} options - Параметры сообщения
 * @param {string} options.url - URL страницы
 * @param {string} options.visitorId - ID посетителя
 * @param {string} [options.pageTitle] - Заголовок страницы
 * @param {Date|string} [options.timestamp] - Временная метка
 * @returns {string} - Отформатированное сообщение
 */
function formatBaseMessage({ url, visitorId, pageTitle, timestamp }) {
  const timeFormatted = formatTimestamp(timestamp);
  
  let message = `\`${url}\`\n`;
  message += `Visitor ID: ${visitorId}\n`;
  
  if (pageTitle && pageTitle.trim()) {
    message += `${pageTitle}\n\n`;
  } else {
    message += `\n`;
  }
  
  message += timeFormatted;
  
  return message;
}

/**
 * Форматирование сообщения для нового посетителя
 * @param {Object} options - Параметры сообщения
 * @param {string} options.url - URL страницы
 * @param {string} options.visitorId - ID посетителя
 * @param {string} [options.pageTitle] - Заголовок страницы
 * @param {Date|string} [options.timestamp] - Временная метка
 * @param {Object} [options.meta] - Дополнительные метаданные
 * @returns {string} - Отформатированное сообщение с префиксом
 */
export function formatNewVisitorMessage({ url, visitorId, pageTitle, timestamp, meta }) {
  return formatBaseMessage({ url, visitorId, pageTitle, timestamp });
}

/**
 * Форматирование сообщения для повторного посетителя
 * @param {Object} options - Параметры сообщения
 * @param {string} options.url - URL страницы
 * @param {string} options.visitorId - ID посетителя
 * @param {string} [options.pageTitle] - Заголовок страницы
 * @param {Date|string} [options.timestamp] - Временная метка
 * @param {Object} [options.meta] - Дополнительные метаданные
 * @param {string} [options.previousUrl] - Предыдущий URL
 * @param {Date|string} [options.firstVisit] - Время первого визита
 * @returns {string} - Отформатированное сообщение с префиксом
 */
export function formatReturnVisitorMessage({ url, visitorId, pageTitle, timestamp, meta, previousUrl, firstVisit }) {
  return formatBaseMessage({ url, visitorId, pageTitle, timestamp });
}

/**
 * Форматирование сообщения для перехода на другую страницу
 * @param {Object} options - Параметры сообщения
 * @param {string} options.url - URL страницы
 * @param {string} options.visitorId - ID посетителя
 * @param {string} [options.pageTitle] - Заголовок страницы
 * @param {Date|string} [options.timestamp] - Временная метка
 * @param {Object} [options.eventData] - Данные события
 * @returns {string} - Отформатированное сообщение
 */
export function formatPageTransitionMessage({ url, visitorId, pageTitle, timestamp, eventData }) {
  return formatBaseMessage({ 
    url: url || eventData?.page_url, 
    visitorId, 
    pageTitle: pageTitle || eventData?.page_title, 
    timestamp 
  });
}

/**
 * Получение префикса для сообщения в зависимости от типа посетителя
 * @param {boolean} isExistingVisitor - Является ли посетитель существующим
 * @param {boolean} isPageTransition - Является ли это переходом между страницами
 * @returns {string} - Префикс сообщения
 */
export function getMessagePrefix(isExistingVisitor = false, isPageTransition = false) {
  if (isPageTransition || isExistingVisitor) {
    return `👣 ПЕРЕХОД НА ДРУГУЮ СТРАНИЦУ\n\n`;
  } else {
    return `👤 НОВЫЙ ПОСЕТИТЕЛЬ\n\n`;
  }
}

/**
 * Универсальная функция форматирования Telegram сообщения
 * @param {Object} options - Параметры сообщения
 * @param {string} options.url - URL страницы
 * @param {string} options.visitorId - ID посетителя
 * @param {string} [options.pageTitle] - Заголовок страницы
 * @param {Date|string} [options.timestamp] - Временная метка
 * @param {boolean} [options.isExistingVisitor] - Является ли посетитель существующим
 * @param {boolean} [options.isPageTransition] - Является ли это переходом между страницами
 * @param {Object} [options.meta] - Дополнительные метаданные
 * @param {Object} [options.eventData] - Данные события (для совместимости с notifications.js)
 * @returns {Object} - Объект с сообщением и префиксом
 */
export function formatTelegramMessage(options) {
  const {
    url,
    visitorId,
    pageTitle,
    timestamp,
    isExistingVisitor = false,
    isPageTransition = false,
    meta,
    eventData
  } = options;

  // Определяем данные из eventData если они переданы (совместимость с notifications.js)
  const finalUrl = url || eventData?.page_url;
  const finalPageTitle = pageTitle || eventData?.page_title;
  const finalTimestamp = timestamp || new Date();

  const message = formatBaseMessage({
    url: finalUrl,
    visitorId,
    pageTitle: finalPageTitle,
    timestamp: finalTimestamp
  });

  const prefix = getMessagePrefix(isExistingVisitor, isPageTransition);

  return {
    message,
    prefix,
    fullMessage: prefix + message
  };
}

/**
 * Парсинг информации о браузере из User-Agent (вспомогательная функция)
 * @param {string} userAgent - User-Agent строка
 * @returns {string|null} - Информация о браузере
 */
export function parseBrowserInfo(userAgent) {
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
    console.error(`Error parsing browser info: ${error.message}`);
    return null;
  }
}

// Экспорт для обратной совместимости
export { formatTimestamp };