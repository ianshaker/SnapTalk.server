/**
 * ✅ VALIDATION MODULE FOR PAGE TRACKING
 * 
 * Модуль валидации данных для системы трекинга страниц:
 * - Валидация входящих данных запросов
 * - Очистка и нормализация данных
 * - Проверка обязательных полей
 */

/**
 * Валидация входящих данных для трекинга страниц
 * @param {Object} data - Данные запроса
 * @returns {Object} - Результат валидации { isValid, errors, cleanData }
 */
export function validateTrackingData(data) {
  const errors = [];
  const cleanData = {};

  // Обязательные поля
  if (!data.siteKey || typeof data.siteKey !== 'string' || data.siteKey.trim().length === 0) {
    errors.push('siteKey is required and must be a non-empty string');
  } else {
    cleanData.siteKey = data.siteKey.trim();
  }

  if (!data.visitorId || typeof data.visitorId !== 'string' || data.visitorId.trim().length === 0) {
    errors.push('visitorId is required and must be a non-empty string');
  } else {
    cleanData.visitorId = data.visitorId.trim();
  }

  if (!data.url || typeof data.url !== 'string' || data.url.trim().length === 0) {
    errors.push('url is required and must be a non-empty string');
  } else {
    cleanData.url = data.url.trim();
    
    // Валидация URL
    try {
      new URL(cleanData.url);
    } catch {
      errors.push('url must be a valid URL');
    }
  }

  // path не обязательное поле - извлекается из URL в prepareEventData
  if (data.path !== undefined) {
    if (typeof data.path === 'string') {
      cleanData.path = data.path.trim();
      
      // Валидация пути (должен начинаться с /)
      if (cleanData.path && !cleanData.path.startsWith('/')) {
        cleanData.path = '/' + cleanData.path;
      }
    } else {
      errors.push('path must be a string if provided');
    }
  }

  // Опциональные поля
  if (data.requestId !== undefined) {
    if (typeof data.requestId === 'string') {
      cleanData.requestId = data.requestId.trim() || null;
    } else {
      errors.push('requestId must be a string if provided');
    }
  }

  if (data.clientId !== undefined) {
    if (typeof data.clientId === 'number' || (typeof data.clientId === 'string' && !isNaN(parseInt(data.clientId)))) {
      cleanData.clientId = parseInt(data.clientId);
    } else {
      errors.push('clientId must be a number if provided');
    }
  }

  if (data.title !== undefined) {
    if (typeof data.title === 'string') {
      cleanData.title = data.title.trim() || null;
    } else {
      errors.push('title must be a string if provided');
    }
  }

  if (data.referrer !== undefined) {
    if (typeof data.referrer === 'string') {
      cleanData.referrer = data.referrer.trim() || null;
    } else {
      errors.push('referrer must be a string if provided');
    }
  }

  // Валидация UTM параметров
  if (data.utm !== undefined) {
    if (typeof data.utm === 'object' && data.utm !== null) {
      cleanData.utm = {};
      
      const utmFields = ['source', 'medium', 'campaign', 'term', 'content'];
      for (const field of utmFields) {
        if (data.utm[field] !== undefined) {
          if (typeof data.utm[field] === 'string') {
            cleanData.utm[field] = data.utm[field].trim() || null;
          } else {
            errors.push(`utm.${field} must be a string if provided`);
          }
        }
      }
    } else {
      errors.push('utm must be an object if provided');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanData
  };
}

/**
 * Валидация данных для тестирования Telegram уведомлений
 * @param {Object} data - Данные запроса
 * @returns {Object} - Результат валидации { isValid, errors, cleanData }
 */
export function validateTelegramTestData(data) {
  const errors = [];
  const cleanData = {};

  // Обязательные поля для теста
  if (!data.siteKey || typeof data.siteKey !== 'string' || data.siteKey.trim().length === 0) {
    errors.push('siteKey is required and must be a non-empty string');
  } else {
    cleanData.siteKey = data.siteKey.trim();
  }

  if (!data.visitorId || typeof data.visitorId !== 'string' || data.visitorId.trim().length === 0) {
    errors.push('visitorId is required and must be a non-empty string');
  } else {
    cleanData.visitorId = data.visitorId.trim();
  }

  if (!data.url || typeof data.url !== 'string' || data.url.trim().length === 0) {
    errors.push('url is required and must be a non-empty string');
  } else {
    cleanData.url = data.url.trim();
    
    // Валидация URL
    try {
      new URL(cleanData.url);
    } catch {
      errors.push('url must be a valid URL');
    }
  }

  // Опциональные поля
  if (data.title !== undefined) {
    if (typeof data.title === 'string') {
      cleanData.title = data.title.trim() || null;
    } else {
      errors.push('title must be a string if provided');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanData
  };
}

/**
 * Валидация siteKey для операций с кэшем
 * @param {string} siteKey - API ключ клиента
 * @returns {Object} - Результат валидации { isValid, error, cleanSiteKey }
 */
export function validateSiteKey(siteKey) {
  if (!siteKey || typeof siteKey !== 'string' || siteKey.trim().length === 0) {
    return {
      isValid: false,
      error: 'siteKey is required and must be a non-empty string',
      cleanSiteKey: null
    };
  }

  return {
    isValid: true,
    error: null,
    cleanSiteKey: siteKey.trim()
  };
}

/**
 * Валидация visitorId для операций с кэшем
 * @param {string} visitorId - ID посетителя
 * @returns {Object} - Результат валидации { isValid, error, cleanVisitorId }
 */
export function validateVisitorId(visitorId) {
  if (!visitorId || typeof visitorId !== 'string' || visitorId.trim().length === 0) {
    return {
      isValid: false,
      error: 'visitorId is required and must be a non-empty string',
      cleanVisitorId: null
    };
  }

  return {
    isValid: true,
    error: null,
    cleanVisitorId: visitorId.trim()
  };
}