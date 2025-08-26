// ===== Основной класс виджета SnapTalk =====

export function generateWidgetClass() {
  return `
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
      const avatarEl = document.getElementById('snaptalk-avatar');
      const chatAvatarEl = document.getElementById('snaptalk-chat-avatar');
      
      if (MANAGER_AVATAR_URL && MANAGER_AVATAR_URL.trim()) {
        // Настройка аватара в приветствии
        if (avatarEl) {
          const img = document.createElement('img');
          img.src = MANAGER_AVATAR_URL;
          img.alt = WIDGET_TEXTS.managerName || 'Менеджер';
          
          img.onerror = () => {
            avatarEl.innerHTML = '<span class="snaptalk-avatar-fallback">👤</span>';
          };
          
          avatarEl.appendChild(img);
        }
        
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
      } else {
        // Показываем фолбэк эмодзи
        if (avatarEl) {
          avatarEl.innerHTML = '<span class="snaptalk-avatar-fallback">👋</span>';
        }
        if (chatAvatarEl) {
          chatAvatarEl.innerHTML = '👨‍💼';
        }
      }
    }
    
    bindEvents() {
      document.getElementById('snaptalk-toggle').addEventListener('click', () => this.toggleWidget());
      document.getElementById('snaptalk-reply').addEventListener('click', () => this.openChat());
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
    
    async showGreetingWithTyping() {
      if (this.isOpen) return;
      
      const greetingEl = document.getElementById('snaptalk-greeting');
      const textEl = document.getElementById('snaptalk-greeting-text');
      const replyBtn = document.getElementById('snaptalk-reply');
      
      // Показываем приветствие
      greetingEl.classList.remove('snaptalk-hidden');
      
      // Показываем анимацию печатания
      textEl.innerHTML = \`
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
          <span class="snaptalk-typing">
            <span class="snaptalk-typing-dot"></span>
            <span class="snaptalk-typing-dot"></span>
            <span class="snaptalk-typing-dot"></span>
          </span>
          <span style="color: var(--snaptalk-text-muted); font-size: 13px; font-style: italic;">
            \${WIDGET_TEXTS.managerName || 'Менеджер'} печатает...
          </span>
        </div>
      \`;
      
      // Через 2.5 секунды показываем текст сразу целиком
      setTimeout(() => {
        const text = WIDGET_TEXTS.greeting || 'Здравствуйте! Как дела? Чем могу помочь?';
        textEl.innerHTML = text; // Показываем текст сразу весь
        
        // Показываем кнопку "Ответить" с небольшой задержкой
        setTimeout(() => {
          replyBtn.classList.remove('snaptalk-hidden');
        }, 500);
      }, 2500);
    }
    
    typeText(element, text, callback) {
      element.innerHTML = ''; // Очищаем полностью (убираем точки)
      let i = 0;
      
      const typeChar = () => {
        if (i < text.length) {
          element.innerHTML += text.charAt(i);
          i++;
          
          // Добавляем мигающий курсор во время печатания
          const cursor = '<span style="animation: blink 1s infinite; margin-left: 1px; color: var(--snaptalk-primary);">|</span>';
          element.innerHTML += cursor;
          
          setTimeout(() => {
            // Убираем курсор перед следующим символом
            element.innerHTML = element.innerHTML.replace(cursor, '');
            typeChar();
          }, Math.random() * 60 + 30); // Случайная скорость от 30 до 90ms для реалистичности
        } else {
          // Убираем курсор в конце и показываем финальный текст
          element.innerHTML = text;
          if (callback) {
            setTimeout(callback, 800);
          }
        }
      };
      
      typeChar();
    }
    
    // Метод hideGreeting удален - кнопки закрытия больше нет
    
    toggleWidget() {
      if (this.isOpen) {
        // Закрытие чата больше не поддерживается
        console.log('❌ Закрытие чата отключено');
      } else {
        this.openChat();
      }
    }
    
    connectWebSocket() {
      if (this.ws) {
        this.ws.close();
      }
      
      this.updateConnectionStatus('connecting');
      
      try {
        const protocol = SERVER_URL.startsWith('https') ? 'wss' : 'ws';
        const wsUrl = SERVER_URL.replace(/^https?/, protocol) + '/ws?clientId=' + CLIENT_ID;
        
        console.log('🔗 Подключаемся к WebSocket:', wsUrl);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket подключен');
          this.connected = true;
          this.updateConnectionStatus('connected');
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Получено сообщение:', data);
            
            if (data.from === 'manager') {
              this.addMessage(data.text, 'manager');
            }
          } catch (e) {
            console.error('❌ Ошибка парсинга сообщения:', e);
          }
        };
        
        this.ws.onclose = () => {
          console.log('❌ WebSocket отключен');
          this.connected = false;
          this.updateConnectionStatus('disconnected');
          
          // Переподключение через 3 секунды
          setTimeout(() => {
            if (!this.connected && this.isOpen) {
              this.connectWebSocket();
            }
          }, 3000);
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket ошибка:', error);
          this.connected = false;
          this.updateConnectionStatus('disconnected');
        };
        
      } catch (error) {
        console.error('❌ Ошибка создания WebSocket:', error);
        this.updateConnectionStatus('disconnected');
      }
    }
    
    updateConnectionStatus(status) {
      const statusEl = document.getElementById('snaptalk-connection-status');
      if (!statusEl) return;
      
      statusEl.className = 'snaptalk-connection-status ' + status;
      
      switch (status) {
        case 'connected':
          statusEl.textContent = 'Подключен';
          break;
        case 'connecting':
          statusEl.textContent = 'Подключение...';
          break;
        case 'disconnected':
          statusEl.textContent = 'Нет связи';
          break;
      }
    }
    
    openChat() {
      this.isOpen = true;
      
      // Скрываем приветствие
      const greetingEl = document.getElementById('snaptalk-greeting');
      greetingEl.classList.add('snaptalk-hidden');
      
      // Показываем чат и скрываем кружок
      document.getElementById('snaptalk-toggle').classList.add('snaptalk-hidden');
      document.getElementById('snaptalk-chat').classList.remove('snaptalk-hidden');
      
      // Подключаемся к WebSocket
      if (!this.connected) {
        this.connectWebSocket();
      }
      
      // Добавляем приветственное сообщение в чат
      if (this.messages.length === 0) {
        setTimeout(() => {
          this.addMessage(WIDGET_TEXTS.greeting || 'Здравствуйте! Как дела? Чем могу помочь?', 'manager');
        }, 500);
      }
      
      console.log('✅ Чат открыт');
    }
    
    // Метод closeChat удален - закрытие чата больше не поддерживается
    
    addMessage(text, type) {
      const messagesContainer = document.getElementById('snaptalk-messages');
      const messageEl = document.createElement('div');
      messageEl.className = \`snaptalk-message \${type}\`;
      messageEl.textContent = text;
      
      messagesContainer.appendChild(messageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      this.messages.push({ text, type, timestamp: Date.now() });
    }
    
    async sendMessage() {
      const input = document.getElementById('snaptalk-input');
      const text = input.value.trim();
      
      if (!text) return;
      
      // Добавляем сообщение пользователя
      this.addMessage(text, 'user');
      input.value = '';
      input.style.height = 'auto';
      
      try {
        console.log('📤 Отправляем сообщение:', text);
        
        // Собираем UTM метки и реферер
        const urlParams = new URLSearchParams(window.location.search);
        const meta = {
          utm: {
            source: urlParams.get('utm_source'),
            medium: urlParams.get('utm_medium'),
            campaign: urlParams.get('utm_campaign'),
            term: urlParams.get('utm_term'),
            content: urlParams.get('utm_content')
          },
          ref: document.referrer,
          url: window.location.href,
          userAgent: navigator.userAgent
        };
        
        const response = await fetch(SERVER_URL + '/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: CLIENT_ID,
            apiKey: API_KEY,
            text: text,
            meta: meta
          })
        });
        
        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}\`);
        }
        
        const result = await response.json();
        console.log('✅ Сообщение отправлено:', result);
        
      } catch (error) {
        console.error('❌ Ошибка отправки:', error);
        this.addMessage('❌ Не удалось отправить сообщение. Попробуйте позже.', 'system');
      }
    }
  }
  `;
}
