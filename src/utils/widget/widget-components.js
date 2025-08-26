// ===== CSS Компоненты для виджета SnapTalk =====

export function generateWidgetComponents() {
  return `
    /* ===== SNAPTALK WIDGET COMPONENTS ===== */
    

    
    /* Контейнер приветствия - современный стиль с увеличенной шириной */
    .snaptalk-greeting {
      position: relative;
      margin-bottom: 1.5rem;
      animation: snaptalk-fade-in 0.4s ease-out;
      max-width: 500px;
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
    

    
    /* Пузырь сообщения - Apple Glassmorphism полностью кликабельный */
    .snaptalk-message-bubble {
      position: relative;
      width: 440px;
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
      cursor: pointer;
      display: flex;
      align-items: center;
      min-height: 60px;
    }
    
    .snaptalk-message-bubble:active {
      transform: scale(0.98);
      opacity: 0.9;
    }
    

    
    /* Мини-аватар внутри пузыря сообщения - правый центр */
    .snaptalk-bubble-avatar {
      position: absolute;
      top: 50%;
      right: 8px;
      transform: translateY(-50%);
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: var(--snaptalk-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
      border: 2.5px solid rgba(255, 255, 255, 0.95);
      z-index: 3;
      font-size: 16px;
      font-weight: 600;
      color: white;
      transition: all var(--snaptalk-transition-normal);
    }
    
    .snaptalk-bubble-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      overflow: hidden;
    }
    
    .snaptalk-bubble-avatar-fallback {
      font-size: 14px;
      color: white;
      font-weight: 600;
    }
    
    /* Индикатор онлайн-статуса */
    .snaptalk-online-indicator {
      position: absolute;
      bottom: -3px;
      right: -3px;
      width: 12px;
      height: 12px;
      background: #00C851;
      border-radius: 50%;
      border: 2px solid white;
      animation: snaptalk-pulse-online 2s infinite;
      z-index: 5;
    }
    
    /* Корректировка padding текста когда есть мини-аватар */
    .snaptalk-message-bubble:has(.snaptalk-bubble-avatar) .snaptalk-message-text {
      padding-right: 50px;
    }
    

    
    /* Текст сообщения */
    .snaptalk-message-text {
      font-size: 14px;
      line-height: 1.5;
      color: var(--snaptalk-text);
      margin: 0;
      font-weight: 400;
    }
    
    /* Кнопка "Ответить" - скрыта на всех устройствах */
    .snaptalk-reply-btn {
      display: none;
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
