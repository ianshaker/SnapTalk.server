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
      gap: 8px; /* УМЕНЬШЕННЫЙ воздух между карточками: 12px → 8px */
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
      position: relative;
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.12),
        0 0 0 1px rgba(255, 255, 255, 0.1);
    }
    
    /* Кнопка закрытия */
     .chat-close-btn {
       position: absolute;
       top: 12px;
       right: 16px;
       width: 32px;
       height: 32px;
       background: rgba(255, 255, 255, 0.2);
       border: none;
       border-radius: 50%;
       color: white;
       cursor: pointer;
       display: flex;
       align-items: center;
       justify-content: center;
       transition: all 0.2s ease;
       z-index: 10;
     }
     
     .chat-close-btn:hover {
       background: rgba(255, 255, 255, 0.3);
       transform: scale(1.1);
     }
     
     .chat-close-btn:active {
       transform: scale(0.95);
     }
     
     .chat-close-btn svg {
       width: 16px;
       height: 16px;
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
    
    /* ⌨️ ПОЛЕ ВВОДА - Кнопка внутри input */
    .snaptalk-input-area {
      flex-shrink: 0;
      padding: 10px 0; /* УМЕНЬШЕННЫЙ отступ: 16px → 10px */
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
    
    /* Контейнер для центрирования статуса */
    .snaptalk-messages-area {
      text-align: center; /* Центрирование капсулы статуса */
    }
    
    .snaptalk-connection-status {
      display: inline-block; /* Компактная капсула */
      padding: 6px 12px;
      background: rgba(34, 197, 94, 0.15); /* Зеленый фон */
      border: 1px solid rgba(34, 197, 94, 0.3); /* Зеленая обводка */
      border-radius: 16px; /* Скругленная капсула */
      font-size: 12px;
      font-weight: 500;
      color: #059669; /* Зеленый текст */
      margin: 8px auto 8px auto; /* Отступ сверху + центрирование */
      text-align: center;
      width: fit-content; /* Только по ширине текста */
    }
    
    /* Элементы поля ввода */
    .snaptalk-input-wrapper {
      position: relative; /* Для абсолютного позиционирования кнопки */
      width: 100%; /* На всю ширину */
    }
    
    .snaptalk-input-field {
      width: 100%;
      background: white; /* Чистый белый фон */
      border: 1.5px solid rgba(0, 0, 0, 0.1);
      border-radius: 25px; /* Более круглый */
      padding: 14px 58px 14px 18px; /* ОТСТУП СПРАВА для кнопки: 58px */
      font-size: 14px;
      color: #333;
      resize: none;
      outline: none;
      transition: all 0.2s ease;
      font-family: inherit;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); /* Легкая тень */
      height: 52px; /* ФИКСИРОВАННАЯ высота для точного расчета */
      line-height: 1.2; /* Контроль высоты строки */
      min-height: 52px; /* Минимальная высота */
      max-height: 52px; /* Максимальная высота - не растягивается */
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
      position: absolute; /* АБСОЛЮТНОЕ позиционирование */
      right: 6px; /* Отступ от правого края */
      top: 6px; /* МАТЕМАТИЧЕСКИЙ ЦЕНТР: (52px - 40px) / 2 = 6px */
      width: 40px; /* Немного меньше для input */
      height: 40px;
      background: var(--snaptalk-primary);
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(var(--snaptalk-primary-rgb), 0.25); /* Меньше тень */
      /* Убираем transform: translateY для точного позиционирования */
    }
    
    .snaptalk-send-button:hover {
      background: var(--snaptalk-primary-hover);
      transform: scale(1.05); /* Только увеличение */
    }
    
    .snaptalk-send-button:active {
      transform: scale(0.95); /* Только уменьшение */
    }
  `;
}
