// ===== CSS Стили для окна чата SnapTalk =====

export function generateChatWindow() {
  return `
    /* ===== CHAT WINDOW STRUCTURE ===== */
    
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
    
    /* Кнопка закрытия удалена по просьбе пользователя */
    
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
  `;
}
