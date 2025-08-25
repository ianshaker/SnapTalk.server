// ===== CSS Стили для чат-окна SnapTalk =====

export function generateChatStyles() {
  return `
    /* ===== CHAT WINDOW STYLES ===== */
    
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
    
    /* Стили сообщений */
    .snaptalk-message {
      display: flex;
      max-width: 80%;
    }
    
    .snaptalk-message.user {
      align-self: flex-end;
      background: var(--snaptalk-primary);
      color: white;
      padding: 10px 14px;
      border-radius: 18px 18px 4px 18px;
      font-size: 14px;
      word-wrap: break-word;
    }
    
    .snaptalk-message.manager {
      align-self: flex-start;
      background: white;
      color: var(--snaptalk-text);
      padding: 10px 14px;
      border-radius: 18px 18px 18px 4px;
      border: 1px solid var(--snaptalk-border);
      font-size: 14px;
      word-wrap: break-word;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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
    
    /* Поле ввода */
    .snaptalk-input-area {
      padding: 16px;
      border-top: 1px solid var(--snaptalk-border);
      background: white;
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }
    
    .snaptalk-input {
      flex: 1;
      border: 1px solid var(--snaptalk-border);
      border-radius: 20px;
      padding: 10px 16px;
      font-size: 14px;
      font-family: inherit;
      resize: none;
      outline: none;
      transition: border-color 0.2s ease;
      max-height: 100px;
      min-height: 40px;
      line-height: 1.4;
    }
    
    .snaptalk-input:focus {
      border-color: var(--snaptalk-primary);
      box-shadow: 0 0 0 3px rgba(112, 179, 71, 0.1);
    }
    
    .snaptalk-send-btn {
      background: var(--snaptalk-primary);
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
      flex-shrink: 0;
    }
    
    .snaptalk-send-btn:hover {
      background: var(--snaptalk-primary-hover);
      transform: scale(1.05);
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
        width: calc(100vw - 2rem);
        height: calc(100vh - 4rem);
        max-height: 600px;
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
