// ===== CSS Стили для виджета SnapTalk =====

export function generateWidgetStyles(colorConfig, position) {
  return `
    /* ===== SNAPTALK WIDGET STYLES ===== */
    
    /* CSS Variables для цветов и современного дизайна */
    :root {
      --snaptalk-primary: ${colorConfig.primary};
      --snaptalk-secondary: ${colorConfig.secondary};
      --snaptalk-primary-rgb: ${colorConfig.primaryRgb};
      --snaptalk-secondary-rgb: ${colorConfig.secondaryRgb};
      --snaptalk-gradient: ${colorConfig.gradient};
      --snaptalk-hover-gradient: ${colorConfig.hoverGradient};
      --snaptalk-primary-hover: ${colorConfig.darkened};
      
      /* Цветовая схема в стиле Apple/Telegram */
      --snaptalk-bg: #ffffff;
      --snaptalk-bg-secondary: #f8fafc;
      --snaptalk-text: #1a202c;
      --snaptalk-text-muted: #718096;
      --snaptalk-text-light: #a0aec0;
      --snaptalk-border: #e2e8f0;
      --snaptalk-border-light: #f1f5f9;
      
      /* Современные тени */
      --snaptalk-shadow-soft: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      --snaptalk-shadow-premium: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      --snaptalk-shadow-button: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --snaptalk-shadow-message: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
      
      /* Скругления в стиле Apple */
      --snaptalk-radius-sm: 8px;
      --snaptalk-radius-md: 12px;
      --snaptalk-radius-lg: 20px;
      --snaptalk-radius-xl: 25px;
      --snaptalk-radius-full: 50px;
      
      /* Transitions для плавности */
      --snaptalk-transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      --snaptalk-transition-normal: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      --snaptalk-transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Основной контейнер виджета - современный и элегантный */
    .snaptalk-widget { 
      position: fixed; 
      bottom: ${position.bottom || '1.5rem'}; 
      right: ${position.right || '1.5rem'}; 
      z-index: ${position.zIndex || 9999}; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      max-width: 380px;
      width: 100%;
      will-change: transform;
      transform-origin: bottom right;
    }
    
    /* Минимизированная кнопка - стиль Apple */
    .snaptalk-btn { 
      width: 64px; 
      height: 64px; 
      border-radius: var(--snaptalk-radius-full); 
      background: var(--snaptalk-gradient); 
      border: none; 
      color: white; 
      font-size: 26px; 
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
    
    /* Контейнер приветствия - современный стиль */
    .snaptalk-greeting {
      position: relative;
      margin-bottom: 1.5rem;
      animation: snaptalk-elegant-slide-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 340px;
      transform-origin: bottom right;
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
    
    /* Контейнер сообщения - элегантный layout */
    .snaptalk-greeting-container {
      display: flex;
      align-items: flex-end;
      gap: 14px;
      padding: 0 4px;
    }
    
    /* Аватар - стиль Apple */
    .snaptalk-avatar {
      width: 42px;
      height: 42px;
      border-radius: var(--snaptalk-radius-full);
      background: var(--snaptalk-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: white;
      font-size: 18px;
      font-weight: 600;
      box-shadow: var(--snaptalk-shadow-button);
      border: 2px solid rgba(255, 255, 255, 0.9);
      overflow: hidden;
      position: relative;
      transition: all var(--snaptalk-transition-normal);
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
    
    /* Пузырь сообщения - Apple Glassmorphism */
    .snaptalk-message-bubble {
      position: relative;
      max-width: 290px;
      border-radius: 18px 18px 18px 4px;
      padding: 14px 18px 16px 18px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: var(--snaptalk-shadow-message);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      animation: snaptalk-bubble-in 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      transition: all var(--snaptalk-transition-normal);
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
    
    /* Кнопка "Ответить" - стиль Apple */
    .snaptalk-reply-btn {
      background: var(--snaptalk-gradient);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: var(--snaptalk-radius-xl);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: var(--snaptalk-shadow-button);
      transition: all var(--snaptalk-transition-normal);
      animation: snaptalk-elegant-bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s both;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(10px);
      letter-spacing: 0.02em;
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
      background: var(--snaptalk-hover-gradient);
      transform: translateY(-3px) scale(1.05);
      box-shadow: var(--snaptalk-shadow-premium);
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
    
    /* Анимации - современные и плавные */
    @keyframes snaptalk-elegant-entrance {
      0% { 
        transform: scale(0.8) translateY(10px);
        opacity: 0;
      }
      60% { 
        transform: scale(1.05) translateY(-2px);
        opacity: 0.8;
      }
      100% { 
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }
    
    @keyframes snaptalk-elegant-slide-in {
      0% { 
        transform: translateX(30px) scale(0.9);
        opacity: 0;
      }
      100% { 
        transform: translateX(0) scale(1);
        opacity: 1;
      }
    }
    
    @keyframes snaptalk-elegant-bounce {
      0% { 
        transform: translateY(20px) scale(0.8);
        opacity: 0;
      }
      50% { 
        transform: translateY(-5px) scale(1.02);
        opacity: 0.9;
      }
      100% { 
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
    
    @keyframes snaptalk-bubble-in {
      0% { 
        transform: scale(0.8) translateY(15px);
        opacity: 0;
      }
      60% { 
        transform: scale(1.02) translateY(-2px);
        opacity: 0.8;
      }
      100% { 
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }
    
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
