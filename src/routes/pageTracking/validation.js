/**
 * ✅ VALIDATION MODULE FOR PAGE TRACKING
 * 
 * Модуль валидации данных для системы трекинга страниц:
 * - Валидация входящих данных запросов
 * - Очистка и нормализация данных
 * - Проверка обязательных полей
 * - Валидация session tracking полей
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

  // Валидация event_type (новое поле для session tracking)
  const validEventTypes = ['page_view', 'session_start', 'session_end', 'tab_switch'];
  if (data.eventType !== undefined) {
    if (typeof data.eventType === 'string' && validEventTypes.includes(data.eventType)) {
      cleanData.eventType = data.eventType;
    } else {
      errors.push(`eventType must be one of: ${validEventTypes.join(', ')}`);
    }
  } else {
    // По умолчанию page_view
    cleanData.eventType = 'page_view';
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

  // requestId теперь обязательное поле (приходит от fingerprint сервиса)
  if (!data.requestId || typeof data.requestId !== 'string' || data.requestId.trim().length === 0) {
    errors.push('requestId is required and must be a non-empty string (provided by fingerprint service)');
  } else {
    cleanData.requestId = data.requestId.trim();
  }

  // Опциональные поля

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

  // Валидация session tracking полей
  if (data.sessionDuration !== undefined) {
    if (typeof data.sessionDuration === 'number' && data.sessionDuration >= 0) {
      cleanData.sessionDuration = data.sessionDuration;
    } else {
      errors.push('sessionDuration must be a non-negative number if provided');
    }
  }

  if (data.isSessionActive !== undefined) {
    if (typeof data.isSessionActive === 'boolean') {
      cleanData.isSessionActive = data.isSessionActive;
    } else {
      errors.push('isSessionActive must be a boolean if provided');
    }
  }

  if (data.isSessionStart !== undefined) {
    if (typeof data.isSessionStart === 'boolean') {
      cleanData.isSessionStart = data.isSessionStart;
      
      // Проверка логики: не может быть одновременно началом и концом
      if (cleanData.isSessionStart && data.isSessionEnd) {
        errors.push('Event cannot be both session start and session end');
      }
    } else {
      errors.push('isSessionStart must be a boolean if provided');
    }
  }

  if (data.isSessionEnd !== undefined) {
    if (typeof data.isSessionEnd === 'boolean') {
      cleanData.isSessionEnd = data.isSessionEnd;
    } else {
      errors.push('isSessionEnd must be a boolean if provided');
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

/**
 * Валидация данных для session tracking API
 * @param {Object} data - Данные запроса
 * @returns {Object} - Результат валидации { isValid, errors, cleanData }
 */
export function validateSessionTrackingData(data) {
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

  // eventType обязательно для session API
  const validEventTypes = ['session_start', 'session_end', 'tab_switch'];
  if (!data.eventType || typeof data.eventType !== 'string' || !validEventTypes.includes(data.eventType)) {
    errors.push(`eventType is required and must be one of: ${validEventTypes.join(', ')}`);
  } else {
    cleanData.eventType = data.eventType;
  }

  // requestId обязательное поле
  if (!data.requestId || typeof data.requestId !== 'string' || data.requestId.trim().length === 0) {
    errors.push('requestId is required and must be a non-empty string');
  } else {
    cleanData.requestId = data.requestId.trim();
  }

  // Валидация sessionDuration для session_end
  if (data.eventType === 'session_end') {
    if (data.sessionDuration === undefined || typeof data.sessionDuration !== 'number' || data.sessionDuration < 0) {
      errors.push('sessionDuration is required for session_end events and must be a non-negative number');
    } else {
      cleanData.sessionDuration = data.sessionDuration;
    }
  } else if (data.sessionDuration !== undefined) {
    errors.push('sessionDuration can only be provided for session_end events');
  }

  // Опциональные поля
  if (data.url !== undefined) {
    if (typeof data.url === 'string' && data.url.trim().length > 0) {
      cleanData.url = data.url.trim();
      
      // Валидация URL
      try {
        new URL(cleanData.url);
      } catch {
        errors.push('url must be a valid URL if provided');
      }
    } else {
      errors.push('url must be a non-empty string if provided');
    }
  }

  if (data.title !== undefined) {
    if (typeof data.title === 'string') {
      cleanData.title = data.title.trim() || null;
    } else {
      errors.push('title must be a string if provided');
    }
  }

  if (data.userAgent !== undefined) {
    if (typeof data.userAgent === 'string') {
      cleanData.userAgent = data.userAgent.trim() || null;
    } else {
      errors.push('userAgent must be a string if provided');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanData
  };
}