// ===== Генератор JavaScript кода виджета =====
export function generateWidgetJS(clientId, config, texts, serverUrl, apiKey = '') {
  const widgetColor = config.minimizedButton?.backgroundColor || '#70B347';
  const hoverColor = config.minimizedButton?.hoverBackgroundColor || '#5a9834';
  const position = config.position || {};
  
  return `
// SnapTalk Widget v2.1 - Modern Design
(function() {
  'use strict';
  
  console.log('🚀 SnapTalk Widget v2.1 загружен для: ${clientId}');
  
  // Проверяем, что виджет еще не загружен
  if (window.SnapTalkWidget) return;
  
  // Конфигурация
  const WIDGET_TEXTS = ${JSON.stringify(texts, null, 2)};
  const CLIENT_ID = '${clientId}';
  const API_KEY = '${apiKey}';
  const SERVER_URL = '${serverUrl}';
  const WIDGET_COLOR = '${widgetColor}';
  const HOVER_COLOR = '${hoverColor}';
  
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
      
      // Показываем приветствие сразу после загрузки страницы (минимальная задержка)
      setTimeout(() => this.showGreetingWithTyping(), 1000);
    }
    
    loadStyles() {
      const style = document.createElement('style');
      style.textContent = \`
        /* CSS Variables для цветов */
        :root {
          --snaptalk-primary: ${widgetColor};
          --snaptalk-primary-hover: ${hoverColor};
          --snaptalk-bg: #ffffff;
          --snaptalk-text: #1f2937;
          --snaptalk-text-muted: #6b7280;
          --snaptalk-border: #e5e7eb;
          --snaptalk-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          --snaptalk-shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.15);
        }
        
        /* Основной контейнер виджета */
        .snaptalk-widget { 
          position: fixed; 
          bottom: ${position.bottom || '1.5rem'}; 
          right: ${position.right || '1.5rem'}; 
          z-index: ${position.zIndex || 9999}; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 380px;
          will-change: transform;
        }
        
        /* Минимизированная кнопка */
        .snaptalk-btn { 
          width: 60px; 
          height: 60px; 
          border-radius: 50%; 
          background: linear-gradient(135deg, var(--snaptalk-primary) 0%, var(--snaptalk-primary-hover) 100%);
          color: white; 
          border: none; 
          cursor: pointer; 
          box-shadow: var(--snaptalk-shadow);
          display: flex; 
          align-items: center; 
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: snaptalk-bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          backdrop-filter: blur(10px);
          position: relative;
          overflow: hidden;
        }
        
        .snaptalk-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .snaptalk-btn:hover { 
          transform: scale(1.1) translateY(-2px);
          box-shadow: var(--snaptalk-shadow-lg);
        }
        
        .snaptalk-btn:hover::before {
          opacity: 1;
        }
        
        .snaptalk-btn:active {
          transform: scale(1.05) translateY(-1px);
        }
        
        /* Контейнер приветствия */
        .snaptalk-greeting {
          position: relative;
          margin-bottom: 1rem;
          animation: snaptalk-slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          max-width: 320px;
        }
        
        /* Кнопка закрытия */
        .snaptalk-close-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--snaptalk-bg);
          border: 2px solid var(--snaptalk-border);
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          color: var(--snaptalk-text-muted);
        }
        
        .snaptalk-close-btn:hover {
          background: #f9fafb;
          transform: scale(1.1);
          color: var(--snaptalk-text);
        }
        
        /* Контейнер сообщения */
        .snaptalk-greeting-container {
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }
        
        /* Аватар */
        .snaptalk-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--snaptalk-primary) 0%, var(--snaptalk-primary-hover) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: white;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 3px solid var(--snaptalk-bg);
        }
        
        /* Пузырь сообщения */
        .snaptalk-message-bubble {
          position: relative;
          max-width: 280px;
          border-radius: 18px;
          padding: 16px 20px;
          background: var(--snaptalk-bg);
          border: 1px solid var(--snaptalk-border);
          box-shadow: var(--snaptalk-shadow);
          background: linear-gradient(135deg, var(--snaptalk-bg) 0%, #f8fafc 100%);
          backdrop-filter: blur(10px);
        }
        
        /* Хвостик сообщения - стиль Telegram */
        .snaptalk-message-tail {
          position: absolute;
          bottom: 16px;
          left: -8px;
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, var(--snaptalk-bg) 0%, #f8fafc 100%);
          border: 1px solid var(--snaptalk-border);
          border-top: none;
          border-right: none;
          transform: rotate(45deg);
          box-shadow: -2px 2px 4px rgba(0, 0, 0, 0.08);
          border-radius: 0 0 0 3px;
        }
        
        /* Текст сообщения */
        .snaptalk-message-text {
          font-size: 14px;
          line-height: 1.5;
          color: var(--snaptalk-text);
          margin: 0 0 12px 0;
          font-weight: 400;
        }
        
        /* Кнопка "Ответить" */
        .snaptalk-reply-btn {
          background: linear-gradient(135deg, var(--snaptalk-primary) 0%, var(--snaptalk-primary-hover) 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: snaptalk-fade-in-up 0.4s ease 0.5s both;
          position: relative;
          overflow: hidden;
        }
        
        .snaptalk-reply-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }
        
        .snaptalk-reply-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }
        
        .snaptalk-reply-btn:hover::before {
          left: 100%;
        }
        
        .snaptalk-reply-btn:active {
          transform: translateY(0) scale(0.98);
        }
        
        /* Анимация печатания */
        .snaptalk-typing {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .snaptalk-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--snaptalk-text-muted);
          animation: snaptalk-typing 1.4s infinite ease-in-out;
        }
        
        .snaptalk-typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .snaptalk-typing-dot:nth-child(2) { animation-delay: -0.16s; }
        .snaptalk-typing-dot:nth-child(3) { animation-delay: 0s; }
        
        /* Анимации */
        @keyframes snaptalk-bounce-in {
          0% { 
            transform: scale(0) rotate(45deg);
            opacity: 0;
          }
          50% { 
            transform: scale(1.2) rotate(22.5deg);
          }
          100% { 
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes snaptalk-slide-up {
          0% { 
            transform: translateY(20px) scale(0.95);
            opacity: 0;
          }
          100% { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes snaptalk-fade-in-up {
          0% { 
            opacity: 0; 
            transform: translateY(10px) scale(0.95);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes snaptalk-typing {
          0%, 80%, 100% { 
            transform: scale(0.8); 
            opacity: 0.4; 
          }
          40% { 
            transform: scale(1.2); 
            opacity: 1; 
          }
        }
        
        @keyframes blink {
          0%, 50% { 
            opacity: 1; 
          }
          51%, 100% { 
            opacity: 0; 
          }
        }
        
        /* Скрытие элементов */
        .snaptalk-hidden { 
          display: none !important; 
        }
        
        /* Иконки */
        .snaptalk-icon { 
          width: 1.2em; 
          height: 1.2em; 
          fill: currentColor; 
        }
        
        /* Чат-окно */
        .snaptalk-chat {
          width: 350px;
          height: 500px;
          background: var(--snaptalk-bg);
          border-radius: 16px;
          box-shadow: var(--snaptalk-shadow-lg);
          border: 1px solid var(--snaptalk-border);
          overflow: hidden;
          animation: snaptalk-slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }
        
        /* Заголовок чата */
        .snaptalk-chat-header {
          background: linear-gradient(135deg, var(--snaptalk-primary) 0%, var(--snaptalk-primary-hover) 100%);
          color: white;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .snaptalk-back-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: background 0.2s ease;
        }
        
        .snaptalk-back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .snaptalk-chat-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        
        .snaptalk-chat-info h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .snaptalk-chat-info p {
          margin: 0;
          font-size: 12px;
          opacity: 0.8;
        }
        
        /* Область сообщений */
        .snaptalk-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        /* Стили сообщений */
        .snaptalk-message {
          display: flex;
          gap: 8px;
          animation: snaptalk-fade-in-up 0.3s ease;
        }
        
        .snaptalk-message.user {
          justify-content: flex-end;
        }
        
        .snaptalk-message.user .snaptalk-msg-bubble {
          background: linear-gradient(135deg, var(--snaptalk-primary) 0%, var(--snaptalk-primary-hover) 100%);
          color: white;
          border-radius: 16px 16px 4px 16px;
        }
        
        .snaptalk-message.manager .snaptalk-msg-bubble {
          background: #f3f4f6;
          color: var(--snaptalk-text);
          border-radius: 16px 16px 16px 4px;
        }
        
        .snaptalk-msg-bubble {
          max-width: 240px;
          padding: 10px 14px;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
        }
        
        .snaptalk-msg-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--snaptalk-primary) 0%, var(--snaptalk-primary-hover) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          flex-shrink: 0;
        }
        
        /* Поле ввода */
        .snaptalk-input-area {
          padding: 16px;
          border-top: 1px solid var(--snaptalk-border);
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        
        .snaptalk-input {
          flex: 1;
          border: 1px solid var(--snaptalk-border);
          border-radius: 20px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          resize: none;
          max-height: 100px;
          font-family: inherit;
          transition: border-color 0.2s ease;
        }
        
        .snaptalk-input:focus {
          border-color: var(--snaptalk-primary);
        }
        
        .snaptalk-send-btn {
          background: linear-gradient(135deg, var(--snaptalk-primary) 0%, var(--snaptalk-primary-hover) 100%);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .snaptalk-send-btn:hover {
          transform: scale(1.05);
        }
        
        .snaptalk-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        /* Индикатор печатания */
        .snaptalk-typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          font-size: 12px;
          color: var(--snaptalk-text-muted);
          border-top: 1px solid var(--snaptalk-border);
        }
        
        /* Респонсивность */
        @media (max-width: 480px) {
          .snaptalk-widget {
            bottom: 1rem;
            right: 1rem;
            max-width: calc(100vw - 2rem);
          }
          
          .snaptalk-message-bubble {
            max-width: calc(100vw - 80px);
          }
          
          .snaptalk-chat {
            width: calc(100vw - 2rem);
            height: calc(100vh - 4rem);
            max-height: 600px;
          }
        }
      \`;
      document.head.appendChild(style);
    }
    
    createWidget() {
      this.container = document.createElement('div');
      this.container.className = 'snaptalk-widget';
      this.container.innerHTML = \`
        <!-- Минимизированная кнопка (скрыта по умолчанию) -->
        <button class="snaptalk-btn snaptalk-hidden" id="snaptalk-toggle" aria-label="Открыть чат">
          <svg class="snaptalk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </button>
        
        <!-- Приветственное сообщение -->
        <div class="snaptalk-greeting snaptalk-hidden" id="snaptalk-greeting">
          <button class="snaptalk-close-btn" id="snaptalk-close-greeting" aria-label="Закрыть">
            <svg class="snaptalk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <div class="snaptalk-greeting-container">
            <div class="snaptalk-avatar">👋</div>
            <div class="snaptalk-message-bubble">
              <div class="snaptalk-message-tail"></div>
              <p class="snaptalk-message-text" id="snaptalk-greeting-text"></p>
              <button class="snaptalk-reply-btn snaptalk-hidden" id="snaptalk-reply">
                ✨ \${WIDGET_TEXTS.reply || 'Ответить'}
              </button>
            </div>
          </div>
        </div>
        
        <!-- Чат-окно -->
        <div class="snaptalk-chat snaptalk-hidden" id="snaptalk-chat">
          <!-- Заголовок чата -->
          <div class="snaptalk-chat-header">
            <button class="snaptalk-back-btn" id="snaptalk-back" aria-label="Назад">
              <svg class="snaptalk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div class="snaptalk-chat-avatar">👨‍💼</div>
            <div class="snaptalk-chat-info">
              <h3>\${WIDGET_TEXTS.managerName || 'Поддержка'}</h3>
              <p id="snaptalk-status">\${WIDGET_TEXTS.managerStatus || 'Онлайн'}</p>
            </div>
          </div>
          
          <!-- Область сообщений -->
          <div class="snaptalk-messages" id="snaptalk-messages">
            <!-- Сообщения будут добавляться здесь -->
          </div>
          
          <!-- Индикатор печатания -->
          <div class="snaptalk-typing-indicator snaptalk-hidden" id="snaptalk-typing">
            <div class="snaptalk-typing">
              <span class="snaptalk-typing-dot"></span>
              <span class="snaptalk-typing-dot"></span>
              <span class="snaptalk-typing-dot"></span>
            </div>
            <span>Печатает...</span>
          </div>
          
          <!-- Поле ввода -->
          <div class="snaptalk-input-area">
            <textarea 
              class="snaptalk-input" 
              id="snaptalk-input" 
              placeholder="\${WIDGET_TEXTS.placeholder || 'Введите ваше сообщение...'}"
              rows="1"
            ></textarea>
            <button class="snaptalk-send-btn" id="snaptalk-send" aria-label="Отправить">
              <svg class="snaptalk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m22 2-7 20-4-9-9-4z"/>
                <path d="M22 2 11 13"/>
              </svg>
            </button>
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
      document.getElementById('snaptalk-back').addEventListener('click', () => this.closeChat());
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
        const text = WIDGET_TEXTS.greeting || 'Здравствуйте! Меня зовут Сергей. Я готов вас проконсультировать. Какие у вас вопросы?';
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
    
    hideGreeting() {
      const greetingEl = document.getElementById('snaptalk-greeting');
      const toggleBtn = document.getElementById('snaptalk-toggle');
      
      greetingEl.style.animation = 'snaptalk-slide-up 0.3s ease reverse';
      setTimeout(() => {
        greetingEl.classList.add('snaptalk-hidden');
        greetingEl.style.animation = '';
        
        // Показываем кружок только если чат НЕ открыт
        if (!this.isOpen) {
          toggleBtn.classList.remove('snaptalk-hidden');
        }
      }, 300);
    }
    
    toggleWidget() {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    }
    
    connectWebSocket() {
      try {
        const wsUrl = SERVER_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws?clientId=' + CLIENT_ID;
        console.log('🔗 Подключаемся к WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          this.connected = true;
          console.log('✅ WebSocket подключен');
          this.updateConnectionStatus('Онлайн');
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Получено сообщение:', data);
            
            if (data.from === 'manager') {
              this.addMessage(data.text, 'manager');
            }
          } catch (error) {
            console.error('❌ Ошибка обработки сообщения:', error);
          }
        };
        
        this.ws.onclose = () => {
          this.connected = false;
          console.log('🔌 WebSocket отключен');
          this.updateConnectionStatus('Не в сети');
          
          // Переподключение через 3 секунды
          setTimeout(() => {
            if (!this.connected) {
              this.connectWebSocket();
            }
          }, 3000);
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket ошибка:', error);
          this.updateConnectionStatus('Ошибка подключения');
        };
      } catch (error) {
        console.error('❌ Ошибка создания WebSocket:', error);
      }
    }
    
    updateConnectionStatus(status) {
      const statusEl = document.getElementById('snaptalk-status');
      if (statusEl) {
        statusEl.textContent = status;
      }
    }
    
    openChat() {
      this.isOpen = true;
      this.hideGreeting();
      
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
      
      console.log('💬 Чат открыт для клиента:', CLIENT_ID);
    }
    
    closeChat() {
      this.isOpen = false;
      
      // Скрываем чат
      document.getElementById('snaptalk-chat').classList.add('snaptalk-hidden');
      document.getElementById('snaptalk-toggle').classList.remove('snaptalk-hidden');
      
      console.log('❌ Чат закрыт');
    }
    
    addMessage(text, type) {
      const messagesContainer = document.getElementById('snaptalk-messages');
      const messageEl = document.createElement('div');
      messageEl.className = \`snaptalk-message \${type}\`;
      
      if (type === 'user') {
        messageEl.innerHTML = \`
          <div class="snaptalk-msg-bubble">\${text}</div>
        \`;
      } else {
        messageEl.innerHTML = \`
          <div class="snaptalk-msg-avatar">👨‍💼</div>
          <div class="snaptalk-msg-bubble">\${text}</div>
        \`;
      }
      
      messagesContainer.appendChild(messageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      this.messages.push({ text, type, timestamp: Date.now() });
    }
    
    async sendMessage() {
      const input = document.getElementById('snaptalk-input');
      const sendBtn = document.getElementById('snaptalk-send');
      const text = input.value.trim();
      
      if (!text) return;
      
      // Добавляем сообщение пользователя
      this.addMessage(text, 'user');
      input.value = '';
      input.style.height = 'auto';
      
      // Отключаем кнопку отправки
      sendBtn.disabled = true;
      
      try {
        console.log('📤 Отправляем сообщение:', text);
        
        const response = await fetch(SERVER_URL + '/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: CLIENT_ID,
            apiKey: API_KEY,
            text: text,
            meta: {
              url: window.location.href,
              title: document.title,
              timestamp: Date.now()
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }
        
        const result = await response.json();
        console.log('✅ Сообщение отправлено:', result);
        
      } catch (error) {
        console.error('❌ Ошибка отправки сообщения:', error);
        this.addMessage('Ошибка отправки сообщения. Попробуйте еще раз.', 'manager');
      } finally {
        sendBtn.disabled = false;
      }
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