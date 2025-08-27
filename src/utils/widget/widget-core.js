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
      
      // Инициализация TrackingService
      this.trackingService = new TrackingService({
        serverUrl: SERVER_URL,
        apiKey: API_KEY,
        clientId: CLIENT_ID
      });
      
      // Инициализация PageTracker
      this.pageTracker = new PageTracker(this.trackingService);
      
      // Инициализация SessionTracker
      this.sessionTracker = new SessionTracker({
        serverUrl: SERVER_URL,
        apiKey: API_KEY
      });
      
      this.initTracking();
      this.init();
      // Инициализация PageTracker после получения visitorId
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
    
    // Инициализация трекинга через TrackingService
    async initTracking() {
      try {
        const identifiers = await this.trackingService.initFingerprint();
        this.visitorId = identifiers.visitorId;
        this.requestId = identifiers.requestId;
        
        // Обновляем идентификаторы в SessionTracker
        this.sessionTracker.updateIdentifiers(this.visitorId, this.requestId);
        
        // 🔥 АВТОМАТИЧЕСКИЙ ТРЕКИНГ ВИЗИТА - ОТКЛЮЧЕН
        // this.trackVisit(); // Отключено для избежания дублирования с trackPageView
        
        // Отправляем session_start событие
        this.sessionTracker.trackSessionEvent('session_start');
      } catch (error) {
        console.warn('⚠️ Tracking initialization failed:', error);
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
          utm: this.trackingService.extractUTMParams()
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
    

    

    
    // ===== SESSION TRACKING METHODS =====
    
    // Инициализация отслеживания сессий
    initSessionTracking() {
      this.sessionTracker.initSessionTracking();
    }

  `;
}
