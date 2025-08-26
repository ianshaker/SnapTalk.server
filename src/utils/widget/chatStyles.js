// ===== CSS Стили для чат-окна SnapTalk =====

export function generateChatStyles() {
  return `
    /* ===== CHAT WINDOW STYLES ===== */
    
    /* Чат-окно - премиальный дизайн */
    .snaptalk-chat {
      width: 380px;
      height: 520px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: var(--snaptalk-radius-lg);
      box-shadow: var(--snaptalk-shadow-premium);
      border: 1px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(20px);
      overflow: hidden;
      animation: snaptalk-elegant-entrance 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      transform-origin: bottom right;
    }
    
    /* Заголовок чата - стиль Apple */
    .snaptalk-chat-header {
      background: var(--snaptalk-gradient);
      color: white;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      border-radius: var(--snaptalk-radius-lg) var(--snaptalk-radius-lg) 0 0;
      position: relative;
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .snaptalk-back-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
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
    
    /* Область сообщений */
    .snaptalk-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
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
      background: var(--snaptalk-gradient);
      color: white;
      padding: 12px 16px;
      border-radius: 18px 18px 4px 18px;
      font-size: 15px;
      word-wrap: break-word;
      box-shadow: var(--snaptalk-shadow-message);
      backdrop-filter: blur(10px);
      margin-left: auto;
    }
    
    .snaptalk-message.manager {
      align-self: flex-start;
      background: linear-gradient(135deg, 
        rgba(241, 243, 244, 0.95) 0%, 
        rgba(255, 255, 255, 0.95) 100%);
      color: var(--snaptalk-text);
      padding: 12px 16px;
      border-radius: 18px 18px 18px 4px;
      border: 1px solid var(--snaptalk-border-light);
      font-size: 15px;
      word-wrap: break-word;
      box-shadow: var(--snaptalk-shadow-message);
      backdrop-filter: blur(10px);
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
    
    /* Поле ввода - стиль Apple */
    .snaptalk-input-area {
      padding: 16px 20px 20px 20px;
      border-top: 1px solid var(--snaptalk-border-light);
      background: rgba(248, 250, 252, 0.8);
      backdrop-filter: blur(10px);
      display: flex;
      gap: 12px;
      align-items: flex-end;
      border-radius: 0 0 var(--snaptalk-radius-lg) var(--snaptalk-radius-lg);
    }
    
    .snaptalk-input {
      flex: 1;
      border: 1px solid var(--snaptalk-border-light);
      border-radius: var(--snaptalk-radius-xl);
      padding: 14px 18px;
      font-size: 15px;
      font-family: inherit;
      resize: none;
      outline: none;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: all var(--snaptalk-transition-normal);
      max-height: 100px;
      min-height: 44px;
      line-height: 1.4;
    }
    
    .snaptalk-input:focus {
      border-color: var(--snaptalk-primary);
      box-shadow: 0 0 0 3px rgba(112, 179, 71, 0.1);
    }
    
    .snaptalk-send-btn {
      background: var(--snaptalk-gradient);
      border: none;
      border-radius: var(--snaptalk-radius-full);
      width: 44px;
      height: 44px;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--snaptalk-transition-normal);
      flex-shrink: 0;
      box-shadow: var(--snaptalk-shadow-button);
      backdrop-filter: blur(10px);
    }
    
    .snaptalk-send-btn:hover {
      background: var(--snaptalk-hover-gradient);
      transform: scale(1.08) translateY(-1px);
      box-shadow: var(--snaptalk-shadow-premium);
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
    
    /* Индикатор печатания */
    .snaptalk-typing-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: white;
      border-radius: 18px;
      border: 1px solid var(--snaptalk-border);
      font-size: 12px;
      color: var(--snaptalk-text-muted);
      align-self: flex-start;
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
        border-radius: var(--snaptalk-radius-lg);
        bottom: 1rem;
        right: 0.5rem;
        left: 0.5rem;
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
