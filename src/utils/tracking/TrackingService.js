// ===== Базовый сервис трекинга для SnapTalk виджета =====

export class TrackingService {
  constructor(config = {}) {
    this.visitorId = null;
    this.requestId = null;
    this.serverUrl = config.serverUrl || '';
    this.apiKey = config.apiKey || '';
    this.clientId = config.clientId || '';
  }

  // Инициализация FingerprintJS для идентификации пользователей
  async initFingerprint() {
    try {
      const fpPromise = import('https://fpjscdn.net/v3/7F2fEiOrnZIiAu3sAA7h')
        .then(FingerprintJS => FingerprintJS.load({
          region: "eu"
        }));

      const fp = await fpPromise;
      const result = await fp.get();
      
      this.visitorId = result.visitorId;
      this.requestId = result.requestId;
      
      console.log('📌 SnapTalk FingerprintJS initialized:', result.visitorId);
      
      return {
        visitorId: this.visitorId,
        requestId: this.requestId
      };
    } catch (error) {
      console.warn('⚠️ FingerprintJS failed to initialize:', error);
      throw error;
    }
  }

  // Извлечение UTM параметров из URL
  extractUTMParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      source: urlParams.get('utm_source'),
      medium: urlParams.get('utm_medium'),
      campaign: urlParams.get('utm_campaign'),
      term: urlParams.get('utm_term'),
      content: urlParams.get('utm_content')
    };
  }

  // Получение метаданных страницы
  getPageMeta() {
    return {
      title: document.title,
      ref: document.referrer,
      url: window.location.href,
      userAgent: navigator.userAgent,
      utm: this.extractUTMParams()
    };
  }

  // Проверка готовности сервиса
  isReady() {
    return this.visitorId !== null && this.requestId !== null;
  }

  // Получение идентификаторов
  getIdentifiers() {
    return {
      visitorId: this.visitorId,
      requestId: this.requestId
    };
  }
}