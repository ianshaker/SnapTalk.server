// ===== Генератор JavaScript кода виджета =====
export function generateWidgetJS(clientId, config, texts, serverUrl) {
  return `
// SnapTalk Widget v1.0 - Generated for client: ${clientId}
(function() {
  'use strict';
  
  const SNAPTALK_CONFIG = ${JSON.stringify({ clientId, config, texts, serverUrl }, null, 2)};
  const CLIENT_ID = '${clientId}';
  const SERVER_URL = '${serverUrl}';
  
  // Проверяем, что виджет еще не загружен
  if (window.SnapTalkWidget) return;
  
  class SnapTalkWidget {
    constructor() {
      this.isOpen = false;
      this.isGreeting = true;
      this.messages = [];
      this.ws = null;
      this.connected = false;
      
      this.init();
    }
    
    init() {
      this.loadStyles();
      this.createWidget();
      this.connectWebSocket();
      
      // Автоматически показываем приветствие через 3 секунды
      setTimeout(() => this.showGreeting(), 3000);
    }
    
    loadStyles() {
      const style = document.createElement('style');
      style.textContent = \\\`
        .snaptalk-widget { 
          position: fixed; 
          bottom: \\\${SNAPTALK_CONFIG.config.position.bottom}; 
          right: \\\${SNAPTALK_CONFIG.config.position.right}; 
          z-index: \\\${SNAPTALK_CONFIG.config.position.zIndex}; 
          font-family: system-ui, -apple-system, sans-serif;
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
        .snaptalk-btn { 
          width: \\\${SNAPTALK_CONFIG.config.minimizedButton.width}; 
          height: \\\${SNAPTALK_CONFIG.config.minimizedButton.height}; 
          border-radius: \\\${SNAPTALK_CONFIG.config.minimizedButton.borderRadius}; 
          background: \\\${SNAPTALK_CONFIG.config.minimizedButton.backgroundColor}; 
          color: \\\${SNAPTALK_CONFIG.config.minimizedButton.color}; 
          border: none; 
          cursor: pointer; 
          box-shadow: \\\${SNAPTALK_CONFIG.config.minimizedButton.boxShadow}; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          transition: all 0.2s ease;
        }
        .snaptalk-btn:hover { 
          background: \\\${SNAPTALK_CONFIG.config.minimizedButton.hoverBackgroundColor}; 
          transform: scale(1.05);
        }
        .snaptalk-close-btn {
          position: \\\${SNAPTALK_CONFIG.config.closeButton.position};
          top: \\\${SNAPTALK_CONFIG.config.closeButton.top};
          right: \\\${SNAPTALK_CONFIG.config.closeButton.right};
          width: \\\${SNAPTALK_CONFIG.config.closeButton.width};
          height: \\\${SNAPTALK_CONFIG.config.closeButton.height};
          border-radius: \\\${SNAPTALK_CONFIG.config.closeButton.borderRadius};
          background: \\\${SNAPTALK_CONFIG.config.closeButton.backgroundColor};
          border: none;
          cursor: pointer;
          box-shadow: \\\${SNAPTALK_CONFIG.config.closeButton.boxShadow};
          z-index: \\\${SNAPTALK_CONFIG.config.closeButton.zIndex};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .snaptalk-close-btn:hover {
          background: \\\${SNAPTALK_CONFIG.config.closeButton.hoverBackgroundColor};
        }
        /* Additional CSS styles would go here... */
        .snaptalk-icon { width: 1em; height: 1em; fill: currentColor; }
      \\\`;
      document.head.appendChild(style);
    }
    
    createWidget() {
      this.container = document.createElement('div');
      this.container.className = 'snaptalk-widget';
      this.container.innerHTML = \\\`
        <button class="snaptalk-btn" id="snaptalk-toggle">
          <svg class="snaptalk-icon" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        
        <div class="snaptalk-greeting" id="snaptalk-greeting" style="display: none;">
          <button class="snaptalk-close-btn" id="snaptalk-close-greeting">
            <svg class="snaptalk-icon" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div class="snaptalk-greeting-bubble">
            <p class="snaptalk-greeting-text">\\\${SNAPTALK_CONFIG.texts.greeting}</p>
          </div>
          <button class="snaptalk-reply-btn" id="snaptalk-reply">
            \\\${SNAPTALK_CONFIG.texts.reply}
          </button>
        </div>
        
        <div class="snaptalk-chat" id="snaptalk-chat" style="display: none;">
          <div class="snaptalk-header">
            <div class="snaptalk-name">\\\${SNAPTALK_CONFIG.texts.managerName}</div>
          </div>
          <div class="snaptalk-messages" id="snaptalk-messages"></div>
          <div class="snaptalk-input-area">
            <input type="text" class="snaptalk-input" id="snaptalk-input" placeholder="\\\${SNAPTALK_CONFIG.texts.placeholder}">
            <button class="snaptalk-send-btn" id="snaptalk-send">Send</button>
          </div>
        </div>
      \\\`;
      
      document.body.appendChild(this.container);
      this.bindEvents();
    }
    
    bindEvents() {
      document.getElementById('snaptalk-toggle').addEventListener('click', () => this.toggleWidget());
      document.getElementById('snaptalk-close-greeting').addEventListener('click', () => this.hideGreeting());
      document.getElementById('snaptalk-reply').addEventListener('click', () => this.openChat());
      document.getElementById('snaptalk-send').addEventListener('click', () => this.sendMessage());
      document.getElementById('snaptalk-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
    
    connectWebSocket() {
      const wsUrl = SERVER_URL.replace('http', 'ws') + '/ws?clientId=' + CLIENT_ID;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.connected = true;
        console.log('SnapTalk: Connected to server');
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.from === 'manager') {
          this.addMessage(data.text, 'manager');
        }
      };
      
      this.ws.onclose = () => {
        this.connected = false;
        console.log('SnapTalk: Disconnected from server');
        setTimeout(() => this.connectWebSocket(), 3000);
      };
    }
    
    showGreeting() {
      if (!this.isOpen) {
        document.getElementById('snaptalk-greeting').style.display = 'flex';
      }
    }
    
    hideGreeting() {
      document.getElementById('snaptalk-greeting').style.display = 'none';
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
      document.getElementById('snaptalk-toggle').style.display = 'none';
      document.getElementById('snaptalk-chat').style.display = 'block';
      
      if (this.messages.length === 0) {
        this.addMessage(SNAPTALK_CONFIG.texts.greeting, 'initial');
      }
    }
    
    closeChat() {
      this.isOpen = false;
      document.getElementById('snaptalk-chat').style.display = 'none';
      document.getElementById('snaptalk-toggle').style.display = 'flex';
    }
    
    addMessage(text, type) {
      const messagesContainer = document.getElementById('snaptalk-messages');
      const messageEl = document.createElement('div');
      
      if (type === 'user') {
        messageEl.className = 'snaptalk-message-user';
        messageEl.innerHTML = '<div class="snaptalk-bubble">' + text + '</div>';
      } else {
        messageEl.className = 'snaptalk-message-manager';
        messageEl.innerHTML = '<div class="snaptalk-bubble">' + text + '</div>';
      }
      
      messagesContainer.appendChild(messageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      this.messages.push({ text, type, timestamp: Date.now() });
    }
    
    async sendMessage() {
      const input = document.getElementById('snaptalk-input');
      const text = input.value.trim();
      
      if (!text) return;
      
      input.value = '';
      this.addMessage(text, 'user');
      
      try {
        const response = await fetch(SERVER_URL + '/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: CLIENT_ID,
            text: text,
            meta: {
              url: window.location.href,
              title: document.title,
              timestamp: Date.now()
            }
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
      } catch (error) {
        console.error('SnapTalk: Failed to send message:', error);
        this.addMessage('Ошибка отправки сообщения. Попробуйте еще раз.', 'manager');
      }
    }
  }
  
  // Запускаем виджет после загрузки DOM
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
