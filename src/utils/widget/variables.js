// ===== CSS Переменные и базовые стили для виджета SnapTalk =====

export function generateWidgetVariables(colorConfig, position) {
  return `
    /* ===== SNAPTALK WIDGET VARIABLES ===== */
    
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
      margin: 0; 
      font-size: 16px; 
      line-height: 1.5; 
      transition: all var(--snaptalk-transition-normal);
      max-width: 580px;
      width: auto;
    }
    
    /* Убеждаемся что стили не влияют на остальную страницу */
    .snaptalk-widget, 
    .snaptalk-widget * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      border: none;
      outline: none;
      text-decoration: none;
      list-style: none;
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
