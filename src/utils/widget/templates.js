// ===== HTML Шаблоны для виджета SnapTalk =====

export function generateWidgetHTML(texts) {
  return `
    <!-- Минимизированная кнопка (скрыта по умолчанию) -->
    <button class="snaptalk-btn snaptalk-hidden" id="snaptalk-toggle" aria-label="Открыть чат">
      <svg class="snaptalk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    </button>
    
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
    <!-- Чат-окно -->
    <div class="snaptalk-chat snaptalk-hidden" id="snaptalk-chat">
      <!-- Заголовок чата -->
      <div class="snaptalk-chat-header">
        <div class="snaptalk-chat-avatar" id="snaptalk-chat-avatar"></div>
        <div class="snaptalk-chat-info">
          <h3>\${WIDGET_TEXTS.managerName || 'Поддержка'}</h3>
          <p id="snaptalk-status">\${WIDGET_TEXTS.managerStatus || 'Онлайн'}</p>
        </div>
      </div>
      
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
      
      <!-- Поле ввода -->
      <div class="snaptalk-input-area">
        <textarea
          id="snaptalk-input"
          class="snaptalk-input"
          placeholder="\${WIDGET_TEXTS.inputPlaceholder || 'Введите ваше сообщение...'}"
          rows="1"
        ></textarea>
        <button id="snaptalk-send" class="snaptalk-send-btn" aria-label="Отправить">
          <svg class="snaptalk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22,2 15,22 11,13 2,9"></polygon>
          </svg>
        </button>
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
