// ===== CSS Стили для окна чата SnapTalk =====

export function generateChatWindow() {
  return `
    /* ===== CHAT WINDOW STRUCTURE ===== */
    
    /* Чат-окно - Контейнер для 3 отдельных карточек */
    .snaptalk-chat {
      width: 380px;
      height: 520px;
      animation: snaptalk-smooth-show 0.3s ease-out;
      display: flex;
      flex-direction: column;
      transform-origin: bottom right;
      gap: 12px; /* Воздух между карточками */
      padding: 0;
      background: transparent;
    }
    
    /* 🔵 КАРТОЧКА 1: ШАПКА - Отдельная карточка */
    .snaptalk-chat-header {
      background: linear-gradient(135deg, var(--snaptalk-primary), var(--snaptalk-primary-hover));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 20px; /* Полностью скругленная */
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.12),
        0 0 0 1px rgba(255, 255, 255, 0.1);
    }
    
    /* 💬 КАРТОЧКА 2: ПЕРЕПИСКА - Отдельная карточка */
    .snaptalk-messages-area {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 20px; /* Полностью скругленная */
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    /* ⌨️ ПОЛЕ ВВОДА - Чистый стиль без обрамления */
    .snaptalk-input-area {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      flex-shrink: 0;
      padding: 16px 0; /* Только отступы, без фона */
      background: transparent; /* Прозрачный фон */
    }
    
    /* Элементы шапки */
    .snaptalk-header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--snaptalk-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .snaptalk-header-info {
      flex: 1;
    }
    
    .snaptalk-header-name {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 2px 0;
    }
    
    .snaptalk-header-status {
      color: rgba(255, 255, 255, 0.8);
      font-size: 13px;
      margin: 0;
    }
    
    /* Элементы области сообщений */
    .snaptalk-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .snaptalk-connection-status {
      text-align: center;
      padding: 8px 12px;
      background: rgba(74, 144, 226, 0.1);
      border-radius: 12px;
      font-size: 13px;
      color: #4A90E2;
      margin-bottom: 8px;
    }
    
    /* Элементы поля ввода */
    .snaptalk-input-wrapper {
      flex: 1;
    }
    
    .snaptalk-input-field {
      width: 100%;
      background: white; /* Чистый белый фон */
      border: 1.5px solid rgba(0, 0, 0, 0.1);
      border-radius: 25px; /* Более круглый */
      padding: 14px 18px;
      font-size: 14px;
      color: #333;
      resize: none;
      outline: none;
      transition: all 0.2s ease;
      font-family: inherit;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); /* Легкая тень */
    }
    
    .snaptalk-input-field:focus {
      border-color: var(--snaptalk-primary);
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.08),
        0 0 0 3px rgba(var(--snaptalk-primary-rgb), 0.15);
    }
    
    .snaptalk-input-field::placeholder {
      color: rgba(0, 0, 0, 0.4);
    }
    
    .snaptalk-send-button {
      width: 46px;
      height: 46px;
      background: var(--snaptalk-primary);
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 3px 12px rgba(var(--snaptalk-primary-rgb), 0.3); /* Цветная тень */
      /* Убираем backdrop-filter */
    }
    
    .snaptalk-send-button:hover {
      background: var(--snaptalk-primary-hover);
      transform: scale(1.05);
    }
    
    .snaptalk-send-button:active {
      transform: scale(0.95);
    }
  `;
}
