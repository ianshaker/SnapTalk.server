// ===== HTML Шаблоны для виджета SnapTalk =====

export function generateWidgetHTML(texts) {
  return `
    
    <!-- Приветственное сообщение -->
    <div class="snaptalk-greeting snaptalk-hidden" id="snaptalk-greeting">
      <div class="snaptalk-greeting-container">
        <div class="snaptalk-message-content">
          <div class="snaptalk-message-bubble">
            <div class="snaptalk-bubble-avatar" id="snaptalk-bubble-avatar">
              <div class="snaptalk-online-indicator"></div>
            </div>
            <p class="snaptalk-message-text" id="snaptalk-greeting-text"></p>
            <button class="snaptalk-reply-btn snaptalk-hidden" id="snaptalk-reply">
              <span>\${WIDGET_TEXTS.reply || 'Ответить'}</span>
              <span class="snaptalk-pulse-dot"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function generateChatHTML(texts) {
  return `
    <!-- Чат-окно: 3 отдельные части -->
    <div class="snaptalk-chat snaptalk-hidden" id="snaptalk-chat">
      
      <!-- 🔵 ЧАСТЬ 1: ШАПКА (Header) -->
      <div class="snaptalk-chat-header">
        <div class="snaptalk-header-avatar" id="snaptalk-chat-avatar"></div>
        <div class="snaptalk-header-info">
          <h3 class="snaptalk-header-name">\${WIDGET_TEXTS.managerName || 'Поддержка'}</h3>
          <p class="snaptalk-header-status" id="snaptalk-status">\${WIDGET_TEXTS.managerStatus || 'Онлайн'}</p>
        </div>
        <button class="chat-close-btn" aria-label="Закрыть чат">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      
      <!-- 💬 ЧАСТЬ 2: ПЕРЕПИСКА (Messages Area) -->
      <div class="snaptalk-messages-area">
        <!-- Статус подключения -->
        <div class="snaptalk-connection-status" id="snaptalk-connection-status">
          Подключение...
        </div>
        
        <!-- Область сообщений -->
        <div class="snaptalk-messages" id="snaptalk-messages">
          <div class="snaptalk-message system">
            Чат начат. Мы обычно отвечаем в течение нескольких минут.
          </div>
        </div>
      </div>
      
      <!-- ⌨️ ЧАСТЬ 3: ПОЛЕ ВВОДА (Input Area) -->
      <div class="snaptalk-input-area">
        <div class="snaptalk-input-wrapper">
          <textarea
            id="snaptalk-input"
            class="snaptalk-input-field"
            placeholder="\${WIDGET_TEXTS.inputPlaceholder || 'Введите ваше сообщение...'}"
            rows="1"
          ></textarea>
          <button id="snaptalk-send" class="snaptalk-send-button" aria-label="Отправить">
            →
          </button>
        </div>
      </div>
      
    </div>
  `;
}

export function generateCompleteHTML(texts) {
  return `
    <div class="snaptalk-widget">
      ${generateWidgetHTML(texts)}
      ${generateChatHTML(texts)}
    </div>
  `;
}
