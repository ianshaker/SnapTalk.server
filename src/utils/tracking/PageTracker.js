// ===== Модуль трекинга страниц для SnapTalk виджета =====

export class PageTracker {
  constructor(trackingService) {
    this.trackingService = trackingService;
    this.serverUrl = trackingService.serverUrl;
    this.apiKey = trackingService.apiKey;
    
    // Флаг для предотвращения дублирования инициализации
    this.isInitialized = false;
  }

  // Автоматический трекинг переходов страниц для SPA
  async trackPageView(url = window.location.href, title = document.title) {
    if (!this.trackingService.isReady()) {
      console.warn('⚠️ Cannot track page view: TrackingService not ready');
      return;
    }
    
    const { visitorId, requestId } = this.trackingService.getIdentifiers();
    
    // Время последней активности теперь обновляется через SessionTracker в widget-core.js
    
    try {
      const response = await fetch(this.serverUrl + '/api/track/page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteKey: this.apiKey, // API_KEY используется как siteKey для совместимости
          visitorId: visitorId,
          requestId: requestId, // request_id от fingerprint сервиса
          url: url,
          title: title,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          // Session tracking поля
          eventType: 'page_view'
          // isSessionActive теперь управляется через SessionTracker
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('📄 Page view tracked successfully:', result);
      } else {
        console.warn('⚠️ Page view tracking failed:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ Page view tracking error:', error);
    }
  }

  // Инициализация отслеживания переходов страниц в SPA
  initPageTracking() {
    if (this.isInitialized) {
      console.warn('⚠️ PageTracking already initialized');
      return;
    }
    
    // Отслеживание начальной загрузки страницы
    if (document.readyState === 'complete') {
      setTimeout(() => this.trackInitialPageView(), 2000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.trackInitialPageView(), 2000);
      });
    }
    
    // Monkey-patch History API для отслеживания SPA переходов
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      setTimeout(() => this.handleSPANavigation(), 100);
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      setTimeout(() => this.handleSPANavigation(), 100);
    };
    
    // Отслеживание браузерной навигации (назад/вперед)
    window.addEventListener('popstate', () => {
      setTimeout(() => this.handleSPANavigation(), 100);
    });
    
    this.isInitialized = true;
    console.log('📄 PageTracker initialized successfully');
  }

  // Трекинг начальной загрузки страницы
  async trackInitialPageView() {
    if (this.trackingService.isReady()) {
      await this.trackPageView();
    }
  }

  // Обработка SPA навигации
  async handleSPANavigation() {
    if (this.trackingService.isReady()) {
      await this.trackPageView();
    }
  }

  // Метод для очистки monkey-patching (для будущего использования)
  cleanup() {
    // В будущем здесь будет логика для восстановления оригинальных методов History API
    console.log('📄 PageTracker cleanup called');
  }
}