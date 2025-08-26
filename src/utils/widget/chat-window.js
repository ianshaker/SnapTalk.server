// ===== CSS Стили для окна чата SnapTalk =====

export function generateChatWindow() {
  return `
    /* ===== CHAT WINDOW STRUCTURE ===== */
    
    /* Чат-окно - 3 отдельные части */
    .snaptalk-chat {
      width: 380px;
      height: 520px;
      border-radius: 24px;
      box-shadow: 
        0 25px 45px -12px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(255, 255, 255, 0.05);
      overflow: hidden;
      animation: snaptalk-smooth-show 0.3s ease-out;
      display: flex;
      flex-direction: column;
      transform-origin: bottom right;
    }
    
    /* 🔵 ЧАСТЬ 1: ШАПКА - Цвет компании */
    .snaptalk-chat-header {
      background: linear-gradient(135deg, var(--snaptalk-primary), var(--snaptalk-primary-hover));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 24px 24px 0 0;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    
    /* 💬 ЧАСТЬ 2: ПЕРЕПИСКА - Светлый blur */
    .snaptalk-messages-area {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* ⌨️ ЧАСТЬ 3: ПОЛЕ ВВОДА - Темная секция */
    .snaptalk-input-area {
      background: rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border-radius: 0 0 24px 24px;
      padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      gap: 12px;
      align-items: flex-end;
      flex-shrink: 0;
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
    
    .snaptalk-chat-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      overflow: hidden;
      position: relative;
    }
    
    .snaptalk-chat-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
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
    
    /* Элементы поля ввода */
    .snaptalk-input-wrapper {
      flex: 1;
    }
    
    .snaptalk-input-field {
      width: 100%;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 22px;
      padding: 12px 16px;
      font-size: 14px;
      color: #333;
      resize: none;
      outline: none;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    
    .snaptalk-input-field:focus {
      border-color: var(--snaptalk-primary);
      box-shadow: 0 0 0 3px rgba(var(--snaptalk-primary-rgb), 0.1);
    }
    
    .snaptalk-input-field::placeholder {
      color: rgba(0, 0, 0, 0.5);
    }
    
    .snaptalk-send-button {
      width: 44px;
      height: 44px;
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
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255, 255, 255, 0.2);
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
