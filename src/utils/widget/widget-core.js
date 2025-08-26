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
      
      this.initFingerprint();
      this.init();
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
      document.getElementById('snaptalk-toggle').addEventListener('click', () => this.toggleWidget());
      document.getElementById('snaptalk-reply').addEventListener('click', () => this.openChat());
      
      // Весь пузырь кликабельный на всех устройствах
      const bubble = document.querySelector('.snaptalk-message-bubble');
      if (bubble) {
        bubble.addEventListener('click', () => {
          this.openChat();
        });
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
          })
          .catch(error => {
            console.warn('⚠️ FingerprintJS failed to initialize:', error);
          });
      } catch (error) {
        console.warn('⚠️ FingerprintJS import failed:', error);
      }
    }
  `;
}
