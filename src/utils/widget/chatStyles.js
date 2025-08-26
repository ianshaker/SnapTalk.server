// ===== CSS Стили для чат-окна SnapTalk =====

export function generateChatStyles() {
  return `
    /* ===== CHAT WINDOW STYLES ===== */
    
    /* Чат-окно - Apple Glassmorphism */
    .snaptalk-chat {
      width: 380px;
      height: 520px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      box-shadow: 
        0 25px 45px -12px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      overflow: hidden;
      animation: snaptalk-elegant-entrance 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      transform-origin: bottom right;
    }
    
    /* Заголовок чата - Apple Glassmorphism */
    .snaptalk-chat-header {
      background: linear-gradient(135deg, 
        rgba(var(--snaptalk-primary-rgb), 0.9) 0%, 
        rgba(var(--snaptalk-secondary-rgb), 0.9) 100%);
      color: white;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      border-radius: 24px 24px 0 0;
      position: relative;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .snaptalk-back-btn {
      position: absolute;
      top: 12px;
      right: 16px;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      width: 32px;
      height: 32px;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--snaptalk-transition-fast);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      font-size: 18px;
      font-weight: 300;
    }
    
    .snaptalk-back-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
      border-color: rgba(255, 255, 255, 0.4);
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
    
    /* Область сообщений - Glassmorphism */
    .snaptalk-messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.02);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    /* Кастомный скролл */
    .snaptalk-messages::-webkit-scrollbar {
      width: 4px;
    }
    
    .snaptalk-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .snaptalk-messages::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }
    
    .snaptalk-messages::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.4);
    }
    
    /* Стили сообщений - стиль Apple Messages */
    .snaptalk-message {
      display: flex;
      max-width: 85%;
      margin-bottom: 8px;
      animation: snaptalk-bubble-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .snaptalk-message.user {
      align-self: flex-end;
      background: linear-gradient(135deg, 
        rgba(var(--snaptalk-primary-rgb), 0.8) 0%, 
        rgba(var(--snaptalk-secondary-rgb), 0.8) 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 18px 18px 4px 18px;
      font-size: 15px;
      word-wrap: break-word;
      box-shadow: var(--snaptalk-shadow-message);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-left: auto;
    }
    
    .snaptalk-message.manager {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.15);
      color: var(--snaptalk-text);
      padding: 12px 16px;
      border-radius: 18px 18px 18px 4px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 15px;
      word-wrap: break-word;
      box-shadow: var(--snaptalk-shadow-message);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      margin-right: auto;
    }
    
    .snaptalk-message.system {
      align-self: center;
      background: #f3f4f6;
      color: var(--snaptalk-text-muted);
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      text-align: center;
    }
    
    /* Поле ввода - Apple Glassmorphism */
    .snaptalk-input-area {
      padding: 16px 20px 20px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      display: flex;
      gap: 12px;
      align-items: flex-end;
      border-radius: 0 0 24px 24px;
    }
    
    .snaptalk-input {
      flex: 1;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 22px;
      padding: 14px 18px;
      font-size: 15px;
      font-family: inherit;
      resize: none;
      outline: none;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: all var(--snaptalk-transition-normal);
      max-height: 100px;
      min-height: 44px;
      line-height: 1.4;
      color: var(--snaptalk-text);
    }
    
    .snaptalk-input::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }
    
    .snaptalk-input:focus {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.4);
      outline: none;
    }
    
    .snaptalk-send-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      width: 44px;
      height: 44px;
      color: rgba(255, 255, 255, 0.9);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--snaptalk-transition-normal);
      flex-shrink: 0;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      font-size: 18px;
      font-weight: 300;
    }
    
    .snaptalk-send-btn::before {
      content: "→";
      font-size: 18px;
      color: inherit;
    }
    
    .snaptalk-send-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
      border-color: rgba(255, 255, 255, 0.4);
    }
    
    .snaptalk-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    /* Индикатор статуса подключения */
    .snaptalk-connection-status {
      padding: 4px 8px;
      font-size: 11px;
      text-align: center;
      background: #f3f4f6;
      color: var(--snaptalk-text-muted);
    }
    
    .snaptalk-connection-status.connected {
      background: #dcfce7;
      color: #166534;
    }
    
    .snaptalk-connection-status.connecting {
      background: #fef3c7;
      color: #92400e;
    }
    
    .snaptalk-connection-status.disconnected {
      background: #fecaca;
      color: #991b1b;
    }
    
    /* Индикатор печатания - Glassmorphism */
    .snaptalk-typing-indicator {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 18px 18px 18px 4px;
      padding: 12px 16px;
      align-self: flex-start;
      margin-right: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      max-width: 80%;
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
        width: calc(100vw - 1rem);
        height: calc(100vh - 2rem);
        max-height: none;
        border-radius: 20px;
        bottom: 1rem;
        right: 0.5rem;
        left: 0.5rem;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        animation: snaptalk-elegant-entrance 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .snaptalk-message {
        max-width: 90%;
      }
      
      .snaptalk-input-area {
        padding: 12px;
      }
    }
  `;
}
