// ===== CSS Стили для виджета SnapTalk =====

export function generateWidgetStyles(widgetColor, hoverColor, position) {
  return `
    /* ===== SNAPTALK WIDGET STYLES ===== */
    
    /* CSS Variables для цветов */
    :root {
      --snaptalk-primary: ${widgetColor};
      --snaptalk-primary-hover: ${hoverColor};
      --snaptalk-bg: #ffffff;
      --snaptalk-text: #1f2937;
      --snaptalk-text-muted: #6b7280;
      --snaptalk-border: #e5e7eb;
      --snaptalk-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      --snaptalk-shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.15);
    }
    
    /* Основной контейнер виджета */
    .snaptalk-widget { 
      position: fixed; 
      bottom: ${position.bottom || '1.5rem'}; 
      right: ${position.right || '1.5rem'}; 
      z-index: ${position.zIndex || 9999}; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 380px;
      will-change: transform;
    }
    
    /* Минимизированная кнопка */
    .snaptalk-btn { 
      width: 60px; 
      height: 60px; 
      border-radius: 50%; 
      background: linear-gradient(135deg, var(--snaptalk-primary) 0%, var(--snaptalk-primary-hover) 100%); 
      border: none; 
      color: white; 
      font-size: 24px; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      box-shadow: var(--snaptalk-shadow); 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
      animation: snaptalk-bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); 
    }
    
    .snaptalk-btn:hover { 
      transform: scale(1.1) translateY(-2px); 
      box-shadow: var(--snaptalk-shadow-lg); 
    }
    
    .snaptalk-btn:active {
      transform: scale(1.05) translateY(-1px);
    }
    
    /* Контейнер приветствия */
    .snaptalk-greeting {
      position: relative;
      margin-bottom: 1rem;
      animation: snaptalk-slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 320px;
    }
    
    /* Кнопка закрытия */
    .snaptalk-close-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid white;
      color: white;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
      transition: all 0.2s ease;
      z-index: 10;
    }
    
    .snaptalk-close-btn:hover {
      background: #dc2626;
      transform: scale(1.1);
      color: var(--snaptalk-text);
    }
    
    /* Контейнер сообщения */
    .snaptalk-greeting-container {
      display: flex;
      align-items: flex-end;
      gap: 12px;
    }
    
    /* Аватар */
    .snaptalk-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--snaptalk-primary) 0%, var(--snaptalk-primary-hover) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: white;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: 3px solid var(--snaptalk-bg);
      overflow: hidden;
      position: relative;
    }
    
    /* Изображение аватара */
    .snaptalk-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      position: absolute;
      top: 0;
      left: 0;
    }
    
    /* Фолбэк аватар */
    .snaptalk-avatar-fallback {
      font-size: 16px;
      color: white;
      z-index: 1;
    }
    
    /* Пузырь сообщения */
    .snaptalk-message-bubble {
      position: relative;
      max-width: 280px;
      border-radius: 18px;
      padding: 16px 20px;
      background: var(--snaptalk-bg);
      border: 1px solid var(--snaptalk-border);
      box-shadow: var(--snaptalk-shadow);
      background: linear-gradient(135deg, var(--snaptalk-bg) 0%, #f8fafc 100%);
      backdrop-filter: blur(10px);
    }
    
    /* Хвостик сообщения - стиль Telegram */
    .snaptalk-message-tail {
      position: absolute;
      bottom: 16px;
      left: -8px;
      width: 16px;
      height: 16px;
      background: linear-gradient(135deg, var(--snaptalk-bg) 0%, #f8fafc 100%);
      border: 1px solid var(--snaptalk-border);
      border-top: none;
      border-right: none;
      transform: rotate(45deg);
      box-shadow: -2px 2px 4px rgba(0, 0, 0, 0.08);
      border-radius: 0 0 0 3px;
    }
    
    /* Текст сообщения */
    .snaptalk-message-text {
      font-size: 14px;
      line-height: 1.5;
      color: var(--snaptalk-text);
      margin: 0 0 12px 0;
      font-weight: 400;
    }
    
    /* Кнопка "Ответить" */
    .snaptalk-reply-btn {
      background: linear-gradient(135deg, var(--snaptalk-primary) 0%, var(--snaptalk-primary-hover) 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: snaptalk-fade-in-up 0.4s ease 0.5s both;
      position: relative;
      overflow: hidden;
    }
    
    .snaptalk-reply-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }
    
    .snaptalk-reply-btn:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    }
    
    .snaptalk-reply-btn:hover::before {
      left: 100%;
    }
    
    .snaptalk-reply-btn:active {
      transform: translateY(0) scale(0.98);
    }
    
    /* Анимация печатания */
    .snaptalk-typing {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    
    .snaptalk-typing-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--snaptalk-text-muted);
      animation: snaptalk-typing 1.4s infinite ease-in-out;
    }
    
    .snaptalk-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .snaptalk-typing-dot:nth-child(2) { animation-delay: -0.16s; }
    .snaptalk-typing-dot:nth-child(3) { animation-delay: 0s; }
    
    /* Анимации */
    @keyframes snaptalk-bounce-in {
      0% { 
        transform: scale(0) rotate(45deg);
        opacity: 0;
      }
      50% { 
        transform: scale(1.2) rotate(22.5deg);
      }
      100% { 
        transform: scale(1) rotate(0deg);
        opacity: 1;
      }
    }
    
    @keyframes snaptalk-slide-up {
      0% { 
        transform: translateY(20px) scale(0.95);
        opacity: 0;
      }
      100% { 
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
    
    @keyframes snaptalk-fade-in-up {
      0% { 
        opacity: 0; 
        transform: translateY(10px) scale(0.95);
      }
      100% { 
        opacity: 1; 
        transform: translateY(0) scale(1);
      }
    }
    
    @keyframes snaptalk-typing {
      0%, 80%, 100% { 
        transform: scale(0.8); 
        opacity: 0.4; 
      }
      40% { 
        transform: scale(1.2); 
        opacity: 1; 
      }
    }
    
    @keyframes blink {
      0%, 50% { 
        opacity: 1; 
      }
      51%, 100% { 
        opacity: 0; 
      }
    }
    
    /* Скрытие элементов */
    .snaptalk-hidden { 
      display: none !important; 
    }
    
    /* Иконки */
    .snaptalk-icon { 
      width: 1.2em; 
      height: 1.2em; 
      fill: currentColor; 
    }
  `;
}
