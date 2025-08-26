// ===== CSS Компоненты для виджета SnapTalk =====

export function generateWidgetComponents() {
  return `
    /* ===== SNAPTALK WIDGET COMPONENTS ===== */
    
    /* Кнопка минимизации - современный стиль с glassmorphism */
    .snaptalk-btn { 
      background: var(--snaptalk-gradient); 
      color: white; 
      border: none; 
      border-radius: var(--snaptalk-radius-full); 
      width: 60px; 
      height: 60px; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      box-shadow: var(--snaptalk-shadow-soft); 
      transition: all var(--snaptalk-transition-normal); 
      animation: snaptalk-elegant-entrance 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
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
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%);
      border-radius: inherit;
      transition: opacity var(--snaptalk-transition-fast);
      opacity: 0;
    }
    
    .snaptalk-btn:hover { 
      background: var(--snaptalk-hover-gradient);
      transform: scale(1.08) translateY(-3px); 
      box-shadow: var(--snaptalk-shadow-premium); 
    }
    
    .snaptalk-btn:hover::before {
      opacity: 1;
    }
    
    .snaptalk-btn:active {
      transform: scale(1.02) translateY(-1px);
      transition: all var(--snaptalk-transition-fast);
    }
    
    /* Контейнер приветствия - современный стиль с увеличенной шириной */
    .snaptalk-greeting {
      position: relative;
      margin-bottom: 1.5rem;
      animation: snaptalk-elegant-slide-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 520px;
      transform-origin: bottom right;
      transition: all var(--snaptalk-transition-normal);
    }
    
    /* Контейнер сообщения - простой layout без внешнего аватара */
    .snaptalk-greeting-container {
      display: flex;
      align-items: flex-end;
      padding: 0 4px;
    }
    
    /* Контейнер для сообщения */
    .snaptalk-message-content {
      flex: 1;
      min-width: 0;
      transition: all var(--snaptalk-transition-normal);
    }
    
    /* Специальный класс для широкого пузыря когда кнопка скрыта */
    .snaptalk-message-content.snaptalk-wide-bubble .snaptalk-message-bubble {
      max-width: 480px;
    }
    

    
    /* Пузырь сообщения - Apple Glassmorphism с кнопкой внутри */
    .snaptalk-message-bubble {
      position: relative;
      max-width: 420px;
      border-radius: 18px;
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: var(--snaptalk-shadow-message);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      animation: snaptalk-bubble-in 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      transition: all var(--snaptalk-transition-normal);
      flex: 1;
    }
    
    /* Когда кнопка внутри пузыря, добавляем padding снизу для неё */
    .snaptalk-message-bubble:has(.snaptalk-reply-btn:not(.snaptalk-hidden)) {
      padding-bottom: 26px;
    }
    
    /* Мини-аватар внутри пузыря сообщения - правый верхний угол */
    .snaptalk-bubble-avatar {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--snaptalk-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
      border: 2.5px solid rgba(255, 255, 255, 0.95);
      overflow: hidden;
      z-index: 3;
      font-size: 14px;
      font-weight: 600;
      color: white;
      transition: all var(--snaptalk-transition-normal);
    }
    
    .snaptalk-bubble-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    
    .snaptalk-bubble-avatar-fallback {
      font-size: 14px;
      color: white;
      font-weight: 600;
    }
    
    /* Корректировка padding текста когда есть мини-аватар */
    .snaptalk-message-bubble:has(.snaptalk-bubble-avatar) .snaptalk-message-text {
      padding-top: 8px;
      padding-right: 44px;
    }
    

    
    /* Текст сообщения */
    .snaptalk-message-text {
      font-size: 14px;
      line-height: 1.5;
      color: var(--snaptalk-text);
      margin: 0 0 12px 0;
      font-weight: 400;
    }
    
    /* Кнопка "Ответить" - в правом нижнем углу пузыря */
    .snaptalk-reply-btn {
      position: absolute;
      bottom: 4px;
      right: 12px;
      background: transparent;
      color: var(--snaptalk-primary);
      border: none;
      padding: 2px 4px;
      border-radius: var(--snaptalk-radius-sm);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all var(--snaptalk-transition-normal);
      animation: snaptalk-elegant-bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s both;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      letter-spacing: 0.02em;
      white-space: nowrap;
      z-index: 2;
    }
    
    .snaptalk-reply-btn span {
      font-weight: 700;
    }
    
    /* Пульсирующая точка рядом с кнопкой */
    .snaptalk-pulse-dot {
      width: 6px;
      height: 6px;
      background: var(--snaptalk-primary);
      border-radius: 50%;
      margin-left: 2px;
      animation: snaptalk-pulse 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }
    
    .snaptalk-reply-btn:hover {
      background: rgba(var(--snaptalk-primary-rgb), 0.1);
      transform: scale(1.05);
      color: var(--snaptalk-primary-hover);
    }
    
    .snaptalk-reply-btn:active {
      transform: scale(0.95);
    }
    
    /* Анимация печатания */
    .snaptalk-typing {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background: rgba(var(--snaptalk-primary-rgb), 0.1);
      border-radius: var(--snaptalk-radius-lg);
      margin: 4px 0;
    }
    
    .snaptalk-typing-dot {
      width: 6px;
      height: 6px;
      background: var(--snaptalk-primary);
      border-radius: 50%;
      animation: snaptalk-typing 1.4s infinite ease-in-out;
    }
    
    .snaptalk-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .snaptalk-typing-dot:nth-child(2) { animation-delay: -0.16s; }
    .snaptalk-typing-dot:nth-child(3) { animation-delay: 0s; }
  `;
}
