// ===== Стили контейнера виджета =====

export function generateContainerStyles(position) {
  return `
    /* Основной контейнер виджета */
    .snaptalk-widget {
      position: fixed;
      bottom: ${position.bottom || '1.5rem'};
      right: ${position.right || '1.5rem'};
      z-index: ${position.zIndex || 9999};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', sans-serif;
      font-size: 14px;
      line-height: 1.4;
      transition: all var(--snaptalk-transition-normal);
      pointer-events: none;
    }
    
    .snaptalk-widget * {
      box-sizing: border-box;
      pointer-events: auto;
    }
    
    /* Приветственное сообщение - элегантный стиль */
    .snaptalk-greeting {
      position: absolute;
      bottom: 80px;
      right: 0;
      max-width: 520px;
      animation: snaptalk-elegant-slide-in 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: bottom right;
      z-index: 1;
    }
    
    /* Контейнер приветствия */
    .snaptalk-greeting-container {
      display: flex;
      align-items: flex-end;
      gap: 14px;
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
  `;
}
