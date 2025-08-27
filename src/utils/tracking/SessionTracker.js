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
    
    // Отслеживание закрытия страницы
    window.addEventListener('beforeunload', () => {
      this.trackSessionEvent('session_end');
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
      if (this.isSessionActive) {
        this.trackSessionEvent('session_end', { reason: 'inactivity' });
        this.isSessionActive = false;
      }
    }, this.sessionInactivityTimeout);
  }

  // Отправка session события
  async trackSessionEvent(eventType, additionalData = {}) {
    if (!this.visitorId) {
      console.warn('⚠️ Cannot track session event: visitorId not available');
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