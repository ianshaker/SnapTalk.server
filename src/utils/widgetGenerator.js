// ===== Генератор JavaScript кода виджета =====
export function generateWidgetJS(clientId, config, texts, serverUrl) {
  return `
// SnapTalk Widget v2.0 - Generated for client: ${clientId}
(function() {
  'use strict';
  
  console.log('🚀 SnapTalk Widget v2.0 загружен для: ${clientId}');
  
  // Проверяем, что виджет еще не загружен
  if (window.SnapTalkWidget) return;
  
  // Конфигурация из бэкенда
  const WIDGET_CONFIG = ${JSON.stringify(config, null, 2)};
  const WIDGET_TEXTS = ${JSON.stringify(texts, null, 2)};
  const CLIENT_ID = '${clientId}';
  const SERVER_URL = '${serverUrl}';
  
  class SnapTalkWidget {
    constructor() {
      this.isOpen = false;
      this.isGreeting = true;
      this.isTyping = false;
      this.messages = [];
      this.ws = null;
      this.connected = false;
      
      this.init();
    }
    
    init() {
      this.loadStyles();
      this.createWidget();
      this.connectWebSocket();
      
      // Показываем приветствие через 3 секунды с анимацией печатания
      setTimeout(() => this.showGreetingWithTyping(), 3000);
    }
    
    loadStyles() {
      const style = document.createElement('style');
      style.textContent = \`
        /* SnapTalk Widget Styles */
        .snaptalk-widget { 
          position: fixed; 
          bottom: \${WIDGET_CONFIG.position?.bottom || '1.5rem'}; 
          right: \${WIDGET_CONFIG.position?.right || '1.5rem'}; 
          z-index: \${WIDGET_CONFIG.position?.zIndex || 50}; 
          font-family: system-ui, -apple-system, sans-serif;
          
          /* CSS Variables для цветов */
          --primary: 220 70% 50%;
          --primary-foreground: 0 0% 98%;
          --primary-hover: 220 70% 45%;
          --card: 0 0% 100%;
          --border: 220 13% 91%;
          --foreground: 224 71% 4%;
          --muted-foreground: 215 16% 47%;
          --accent: 210 40% 94%;
          --accent-foreground: 222 47% 11%;
          --secondary: 210 40% 94%;
          --muted: 210 40% 96%;
        }
        
        /* Минимизированная кнопка */
        .snaptalk-btn { 
          width: \${WIDGET_CONFIG.minimizedButton?.width || '3.5rem'}; 
          height: \${WIDGET_CONFIG.minimizedButton?.height || '3.5rem'}; 
          border-radius: \${WIDGET_CONFIG.minimizedButton?.borderRadius || '50%'}; 
          background: \${WIDGET_CONFIG.minimizedButton?.backgroundColor || '#70B347'}; 
          color: \${WIDGET_CONFIG.minimizedButton?.color || 'white'}; 
          border: none; 
          cursor: pointer; 
          box-shadow: \${WIDGET_CONFIG.minimizedButton?.boxShadow || '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          transition: all 0.2s ease;
          animation: snaptalk-scale-in 0.3s ease-out;
        }
        
        .snaptalk-btn:hover { 
          background: \${WIDGET_CONFIG.minimizedButton?.hoverBackgroundColor || '#5a9834'}; 
          transform: scale(1.05);
        }
        
        /* Контейнер приветствия */
        .snaptalk-greeting {
          position: relative;
          max-width: \${WIDGET_CONFIG.widget?.maxWidth || '20rem'};
          margin-bottom: 1rem;
          animation: snaptalk-scale-fade-in 0.4s ease-out;
        }
        
        /* Кнопка закрытия */
        .snaptalk-close-btn {
          position: absolute;
          top: -0.5rem;
          right: -0.5rem;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          background: white;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .snaptalk-close-btn:hover {
          background: #f3f4f6;
        }
        
        /* Контейнер сообщения */
        .snaptalk-greeting-container {
          display: flex;
          align-items: end;
          gap: 0.75rem;
        }
        
        /* Аватар */
        .snaptalk-avatar {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          background: linear-gradient(135deg, \${WIDGET_CONFIG.minimizedButton?.backgroundColor || '#70B347'} 0%, #5a9834 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: white;
          font-size: 0.75rem;
        }
        
        /* Пузырь сообщения */
        .snaptalk-message-bubble {
          position: relative;
          max-width: 18rem;
          border-radius: 1rem;
          padding: 0.75rem;
          background: white;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          background: linear-gradient(135deg, white 0%, #f9fafb 100%);
        }
        
        /* Хвостик сообщения */
        .snaptalk-message-tail {
          position: absolute;
          bottom: 0;
          right: 2rem;
          width: 0.75rem;
          height: 0.75rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-left: none;
          transform: translateY(50%) rotate(45deg);
        }
        
        /* Текст сообщения */
        .snaptalk-message-text {
          font-size: 0.75rem;
          line-height: 1.25;
          color: #374151;
          margin: 0;
        }
        
        /* Кнопка "Ответить" */
        .snaptalk-reply-btn {
          background: \${WIDGET_CONFIG.minimizedButton?.backgroundColor || '#70B347'};
          color: white;
          border: none;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          cursor: pointer;
          margin-top: 0.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          animation: snaptalk-fade-in 0.3s ease-out 0.5s both;
        }
        
        .snaptalk-reply-btn:hover {
          background: \${WIDGET_CONFIG.minimizedButton?.hoverBackgroundColor || '#5a9834'};
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        /* Анимация печатания */
        .snaptalk-typing {
          display: inline-block;
        }
        
        .snaptalk-typing-dot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #9ca3af;
          margin: 0 1px;
          animation: snaptalk-typing 1.4s infinite ease-in-out;
        }
        
        .snaptalk-typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .snaptalk-typing-dot:nth-child(2) { animation-delay: -0.16s; }
        .snaptalk-typing-dot:nth-child(3) { animation-delay: 0s; }
        
        /* Анимации */
        @keyframes snaptalk-scale-in {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes snaptalk-scale-fade-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes snaptalk-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes snaptalk-typing {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        
        /* Скрытие элементов */
        .snaptalk-hidden { display: none !important; }
        
        /* Иконки */
        .snaptalk-icon { width: 1em; height: 1em; fill: currentColor; }
      \`;
      document.head.appendChild(style);
    }
    
    createWidget() {
      this.container = document.createElement('div');
      this.container.className = 'snaptalk-widget';
      this.container.innerHTML = \`
        <!-- Минимизированная кнопка -->
        <button class="snaptalk-btn" id="snaptalk-toggle">
          <svg class="snaptalk-icon" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        
        <!-- Приветственное сообщение -->
        <div class="snaptalk-greeting snaptalk-hidden" id="snaptalk-greeting">
          <button class="snaptalk-close-btn" id="snaptalk-close-greeting">
            <svg class="snaptalk-icon" viewBox="0 0 24 24" style="width: 12px; height: 12px;">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <div class="snaptalk-greeting-container">
            <div class="snaptalk-avatar">💬</div>
            <div class="snaptalk-message-bubble">
              <div class="snaptalk-message-tail"></div>
              <p class="snaptalk-message-text" id="snaptalk-greeting-text"></p>
              <button class="snaptalk-reply-btn snaptalk-hidden" id="snaptalk-reply">
                \${WIDGET_TEXTS.reply || 'Ответить'}
              </button>
            </div>
          </div>
        </div>
      \`;
      
      document.body.appendChild(this.container);
      this.bindEvents();
    }
    
    bindEvents() {
      document.getElementById('snaptalk-toggle').addEventListener('click', () => this.toggleWidget());
      document.getElementById('snaptalk-close-greeting').addEventListener('click', () => this.hideGreeting());
      document.getElementById('snaptalk-reply').addEventListener('click', () => this.openChat());
    }
    
    connectWebSocket() {
      // TODO: Реализовать WebSocket подключение
      console.log('WebSocket connection will be implemented');
    }
    
    async showGreetingWithTyping() {
      if (this.isOpen) return;
      
      const greetingEl = document.getElementById('snaptalk-greeting');
      const textEl = document.getElementById('snaptalk-greeting-text');
      const replyBtn = document.getElementById('snaptalk-reply');
      
      // Показываем приветствие
      greetingEl.classList.remove('snaptalk-hidden');
      
      // Показываем анимацию печатания
      textEl.innerHTML = \`
        <span class="snaptalk-typing">
          <span class="snaptalk-typing-dot"></span>
          <span class="snaptalk-typing-dot"></span>
          <span class="snaptalk-typing-dot"></span>
        </span>
      \`;
      
      // Через 2 секунды показываем текст
      setTimeout(() => {
        this.typeText(textEl, WIDGET_TEXTS.greeting || 'Здравствуйте! Я готов вас проконсультировать. Какие у вас вопросы?', () => {
          // Показываем кнопку "Ответить"
          replyBtn.classList.remove('snaptalk-hidden');
        });
      }, 2000);
    }
    
    typeText(element, text, callback) {
      element.innerHTML = '';
      let i = 0;
      
      const typeChar = () => {
        if (i < text.length) {
          element.innerHTML += text.charAt(i);
          i++;
          setTimeout(typeChar, 30); // Скорость печатания
        } else if (callback) {
          callback();
        }
      };
      
      typeChar();
    }
    
    hideGreeting() {
      document.getElementById('snaptalk-greeting').classList.add('snaptalk-hidden');
    }
    
    toggleWidget() {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    }
    
    openChat() {
      this.isOpen = true;
      this.hideGreeting();
      
      // TODO: Открыть полноценный чат
      alert('Чат откроется! Клиент: \${WIDGET_TEXTS.managerName || 'Поддержка'}');
      console.log('💬 Чат открыт для клиента:', CLIENT_ID);
    }
    
    closeChat() {
      this.isOpen = false;
      // TODO: Закрыть чат
    }
  }
  
  // Запускаем виджет
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.SnapTalkWidget = new SnapTalkWidget();
    });
  } else {
    window.SnapTalkWidget = new SnapTalkWidget();
  }
  
})();
`;
}