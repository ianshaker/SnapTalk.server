// ===== Модуль трекинга сессий для SnapTalk виджета =====

export class SessionTracker {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || '';
    this.apiKey = config.apiKey || '';
    this.visitorId = config.visitorId || null;
    this.requestId = config.requestId || null;
    
    // Session tracking properties
    this.sessionStartTime = Date.now();
    this.isSessionActive = true;
    this.lastActivityTime = Date.now();
    this.sessionInactivityTimeout = 30 * 60 * 1000; // 30 минут
    this.sessionInactivityTimer = null;
    
    this.sessionEndSent = false; // Флаг для предотвращения дублирования session_end
  }

  // Обновление идентификаторов после инициализации
  updateIdentifiers(visitorId, requestId) {
    this.visitorId = visitorId;
    this.requestId = requestId;
  }

  // Инициализация отслеживания сессий
  initSessionTracking() {
    // Отслеживание активности пользователя
    ['click', 'scroll', 'keypress', 'mousemove'].forEach(event => {
      document.addEventListener(event, () => this.updateLastActivity(), { passive: true });
    });
    
    // Отслеживание переключения вкладок
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackSessionEvent('tab_switch', { action: 'hidden' });
      } else {
        this.trackSessionEvent('tab_switch', { action: 'visible' });
        this.updateLastActivity();
      }
    });
    
    // Отслеживание закрытия страницы (множественные обработчики для надежности)
    window.addEventListener('beforeunload', () => {
      this.sendSessionEventBeacon('session_end', { reason: 'beforeunload' });
    });
    
    window.addEventListener('pagehide', () => {
      this.sendSessionEventBeacon('session_end', { reason: 'pagehide' });
    });
    
    // Обработка unload как резервный вариант
    window.addEventListener('unload', () => {
      this.sendSessionEventBeacon('session_end', { reason: 'unload' });
    });
    
    // Запускаем таймер неактивности
    this.resetInactivityTimer();
  }

  // Обновление времени последней активности
  updateLastActivity() {
    this.lastActivityTime = Date.now();
    this.resetInactivityTimer();
  }

  // Сброс таймера неактивности
  resetInactivityTimer() {
    if (this.sessionInactivityTimer) {
      clearTimeout(this.sessionInactivityTimer);
    }
    
    this.sessionInactivityTimer = setTimeout(() => {
      if (this.isSessionActive && !this.sessionEndSent) {
        this.trackSessionEvent('session_end', { reason: 'inactivity' });
        this.isSessionActive = false;
      }
    }, this.sessionInactivityTimeout);
  }

  // Отправка session события через sendBeacon для надежности при закрытии страницы
  sendSessionEventBeacon(eventType, additionalData = {}) {
    if (!this.visitorId) {
      console.warn('⚠️ Cannot track session event: visitorId not available');
      return;
    }
    
    // Предотвращаем дублирование session_end событий
    if (eventType === 'session_end' && this.sessionEndSent) {
      console.log('🔄 Session end already sent, skipping duplicate');
      return;
    }
    
    try {
      const payload = {
        siteKey: this.apiKey,
        visitorId: this.visitorId,
        requestId: this.requestId,
        eventType: eventType,
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        isSessionActive: this.isSessionActive,
        ...additionalData
      };
      
      // Для session_end добавляем специальные поля
      if (eventType === 'session_end') {
        payload.isSessionEnd = true;
        payload.sessionDuration = Date.now() - this.sessionStartTime;
        this.isSessionActive = false;
        this.sessionEndSent = true;
      }
      
      // Используем sendBeacon для надежной отправки при закрытии страницы
      if (navigator.sendBeacon) {
        // Создаем Blob с правильным Content-Type для корректной обработки сервером
        const blob = new Blob([JSON.stringify(payload)], {
          type: 'application/json'
        });
        const success = navigator.sendBeacon(
          this.serverUrl + '/api/track/session',
          blob
        );
        console.log(`🔄 Session event '${eventType}' sent via beacon:`, success);
        return success;
      } else {
        // Fallback для старых браузеров
        console.warn('⚠️ sendBeacon not supported, using synchronous XHR');
        const xhr = new XMLHttpRequest();
        xhr.open('POST', this.serverUrl + '/api/track/session', false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
        return true;
      }
    } catch (error) {
      console.warn(`⚠️ Session event '${eventType}' beacon error:`, error);
      return false;
    }
  }

  // Отправка session события
  async trackSessionEvent(eventType, additionalData = {}) {
    if (!this.visitorId) {
      console.warn('⚠️ Cannot track session event: visitorId not available');
      return;
    }
    
    // Предотвращаем дублирование session_end событий
    if (eventType === 'session_end' && this.sessionEndSent) {
      console.log('🔄 Session end already sent, skipping duplicate');
      return;
    }
    
    try {
      const payload = {
        siteKey: this.apiKey, // API_KEY используется как siteKey для совместимости
        visitorId: this.visitorId,
        requestId: this.requestId,
        eventType: eventType,
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        isSessionActive: this.isSessionActive,
        ...additionalData
      };
      
      // Для session_end добавляем специальные поля
      if (eventType === 'session_end') {
        payload.isSessionEnd = true;
        payload.sessionDuration = Date.now() - this.sessionStartTime;
        this.isSessionActive = false;
        this.sessionEndSent = true; // Устанавливаем флаг
      } else if (eventType === 'session_start') {
        payload.isSessionStart = true;
      }
      
      const response = await fetch(this.serverUrl + '/api/track/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`🔄 Session event '${eventType}' tracked successfully:`, result);
      } else {
        console.warn(`⚠️ Session event '${eventType}' tracking failed:`, response.status);
      }
    } catch (error) {
      console.warn(`⚠️ Session event '${eventType}' tracking error:`, error);
    }
  }

  // Получение статуса сессии
  getSessionStatus() {
    return {
      isActive: this.isSessionActive,
      startTime: this.sessionStartTime,
      lastActivity: this.lastActivityTime,
      duration: Date.now() - this.sessionStartTime
    };
  }



  // Очистка таймеров при уничтожении
  destroy() {
    if (this.sessionInactivityTimer) {
      clearTimeout(this.sessionInactivityTimer);
      this.sessionInactivityTimer = null;
    }
  }
}