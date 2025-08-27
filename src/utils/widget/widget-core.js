// ===== Основа класса виджета SnapTalk - инициализация и события =====

export function generateWidgetCore() {
  return `
    constructor() {
      this.isOpen = false;
      this.isGreeting = true;
      this.messages = [];
      this.ws = null;
      this.connected = false;
      this.visitorId = null;
      this.requestId = null;
      
      // Session tracking
      this.sessionStartTime = Date.now();
      this.isSessionActive = true;
      this.lastActivityTime = Date.now();
      this.sessionInactivityTimeout = 30 * 60 * 1000; // 30 минут
      this.sessionInactivityTimer = null;
      
      this.initFingerprint();
      this.init();
      this.initPageTracking();
      this.initSessionTracking();
    }
    
    init() {
      this.loadStyles();
      this.createWidget();
      this.setupAvatar();
      
      // Показываем приветствие сразу после загрузки страницы (минимальная задержка)
      setTimeout(() => this.showGreetingWithTyping(), 1000);
    }
    
    loadStyles() {
      const style = document.createElement('style');
      style.textContent = WIDGET_STYLES;
      document.head.appendChild(style);
    }
    
    createWidget() {
      this.container = document.createElement('div');
      this.container.className = 'snaptalk-widget';
      this.container.innerHTML = WIDGET_HTML;
      
      document.body.appendChild(this.container);
      this.bindEvents();
    }
    
    setupAvatar() {
      const chatAvatarEl = document.getElementById('snaptalk-chat-avatar');
      const bubbleAvatarEl = document.getElementById('snaptalk-bubble-avatar');
      
      if (MANAGER_AVATAR_URL && MANAGER_AVATAR_URL.trim()) {
        // Настройка аватара в чате
        if (chatAvatarEl) {
          const chatImg = document.createElement('img');
          chatImg.src = MANAGER_AVATAR_URL;
          chatImg.alt = WIDGET_TEXTS.managerName || 'Менеджер';
          
          chatImg.onerror = () => {
            chatAvatarEl.innerHTML = '👨‍💼';
          };
          
          chatAvatarEl.appendChild(chatImg);
        }
        
        // Настройка мини-аватара в пузыре
        if (bubbleAvatarEl) {
          const bubbleImg = document.createElement('img');
          bubbleImg.src = MANAGER_AVATAR_URL;
          bubbleImg.alt = WIDGET_TEXTS.managerName || 'Менеджер';
          
          bubbleImg.onerror = () => {
            bubbleAvatarEl.innerHTML = '<span class="snaptalk-bubble-avatar-fallback">👤</span>';
          };
          
          bubbleAvatarEl.appendChild(bubbleImg);
        }
      } else {
        // Показываем фолбэк эмодзи
        if (chatAvatarEl) {
          chatAvatarEl.innerHTML = '👨‍💼';
        }
        if (bubbleAvatarEl) {
          bubbleAvatarEl.innerHTML = '<span class="snaptalk-bubble-avatar-fallback">👤</span>';
        }
      }
    }
    
    bindEvents() {
      document.getElementById('snaptalk-reply').addEventListener('click', () => this.openChat());
      
      // Весь пузырь кликабельный на всех устройствах
      const bubble = document.querySelector('.snaptalk-message-bubble');
      if (bubble) {
        bubble.addEventListener('click', () => {
          this.openChat();
        });
      }
      
      // Обработчик для кнопки закрытия чата
      const closeBtn = document.querySelector('.chat-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeChat());
      }
      
      document.getElementById('snaptalk-send').addEventListener('click', () => this.sendMessage());
      
      const input = document.getElementById('snaptalk-input');
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      // Автоматическое изменение размера textarea
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      });
    }
    
    // Инициализация FingerprintJS для идентификации пользователей
    initFingerprint() {
      try {
        const fpPromise = import('https://fpjscdn.net/v3/7F2fEiOrnZIiAu3sAA7h')
          .then(FingerprintJS => FingerprintJS.load({
            region: "eu"
          }));

        fpPromise
          .then(fp => fp.get())
          .then(result => {
            this.visitorId = result.visitorId;
            this.requestId = result.requestId;
            console.log('📌 SnapTalk FingerprintJS initialized:', result.visitorId);
            
            // 🔥 АВТОМАТИЧЕСКИЙ ТРЕКИНГ ВИЗИТА - ОТКЛЮЧЕН
            // this.trackVisit(); // Отключено для избежания дублирования с trackPageView
            
            // Отправляем session_start событие
            this.trackSessionEvent('session_start');
          })
          .catch(error => {
            console.warn('⚠️ FingerprintJS failed to initialize:', error);
          });
      } catch (error) {
        console.warn('⚠️ FingerprintJS import failed:', error);
      }
    }
    
    // Автоматический трекинг визита пользователя
    async trackVisit() {
      if (!this.visitorId) {
        console.warn('⚠️ Cannot track visit: visitorId not available');
        return;
      }
      
      try {
        const meta = {
          title: document.title,
          ref: document.referrer,
          url: window.location.href,
          userAgent: navigator.userAgent,
          utm: this.extractUTMParams()
        };
        
        const response = await fetch(SERVER_URL + '/api/visit/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: CLIENT_ID,
            apiKey: API_KEY,
            visitorId: this.visitorId,
            requestId: this.requestId,
            url: window.location.href,
            meta: meta
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('👤 Visit tracked successfully:', result);
        } else {
          console.warn('⚠️ Visit tracking failed:', response.status);
        }
      } catch (error) {
        console.warn('⚠️ Visit tracking error:', error);
      }
    }
    
    // Автоматический трекинг переходов страниц для SPA
    async trackPageView(url = window.location.href, title = document.title) {
      if (!this.visitorId) {
        console.warn('⚠️ Cannot track page view: visitorId not available');
        return;
      }
      
      // Обновляем время последней активности
      this.updateLastActivity();
      
      try {
        const response = await fetch(SERVER_URL + '/api/track/page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteKey: API_KEY,
            visitorId: this.visitorId,
            requestId: this.requestId, // request_id от fingerprint сервиса
            url: url,
            title: title,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            // Session tracking поля
            eventType: 'page_view',
            isSessionActive: this.isSessionActive
            // sessionDuration убираем - оно только для session_end событий
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
    }
    
    // Трекинг начальной загрузки страницы
    async trackInitialPageView() {
      if (this.visitorId) {
        await this.trackPageView();
      }
    }
    
    // Обработка SPA навигации
    async handleSPANavigation() {
      if (this.visitorId) {
        await this.trackPageView();
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
    
    // ===== SESSION TRACKING METHODS =====
    
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
          siteKey: API_KEY,
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
        
        const response = await fetch(SERVER_URL + '/api/track/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(\`🔄 Session event '\${eventType}' tracked successfully:\`, result);
        } else {
          console.warn(\`⚠️ Session event '\${eventType}' tracking failed:\`, response.status);
        }
      } catch (error) {
        console.warn(\`⚠️ Session event '\${eventType}' tracking error:\`, error);
      }
    }
  `;
}
