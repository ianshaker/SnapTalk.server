// ===== Стили кнопок виджета =====

export function generateButtonStyles() {
  return `
    /* Основная кнопка виджета - стиль Apple */
    .snaptalk-btn {
      background: var(--snaptalk-gradient);
      color: white;
      border: none;
      border-radius: var(--snaptalk-radius-full);
      width: 60px;
      height: 60px;
      cursor: pointer;
      box-shadow: var(--snaptalk-shadow-premium);
      transition: all var(--snaptalk-transition-normal);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      animation: snaptalk-elegant-entrance 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .snaptalk-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s ease;
    }
    
    .snaptalk-btn:hover {
      background: var(--snaptalk-hover-gradient);
      transform: translateY(-8px) scale(1.1);
      box-shadow: var(--snaptalk-shadow-premium);
      border-color: rgba(255, 255, 255, 0.5);
    }
    
    .snaptalk-btn:hover::before {
      left: 100%;
    }
    
    .snaptalk-btn:active {
      transform: translateY(-2px) scale(1.05);
    }
    
    .snaptalk-btn:focus {
      outline: none;
      box-shadow: var(--snaptalk-shadow-premium), 0 0 0 3px rgba(var(--snaptalk-primary-rgb), 0.3);
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
  `;
}
