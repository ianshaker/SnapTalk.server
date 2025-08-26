// ===== Стили пузырей сообщений =====

export function generateBubbleStyles() {
  return `
    /* Пузырь сообщения - Apple Glassmorphism с кнопкой внутри */
    .snaptalk-message-bubble {
      position: relative;
      max-width: 420px;
      border-radius: 18px 18px 18px 4px;
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
    
    /* Хвостик сообщения - стиль Telegram */
    .snaptalk-message-tail {
      position: absolute;
      bottom: 16px;
      left: -10px;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 0 16px 16px;
      border-color: transparent transparent rgba(255, 255, 255, 0.15) transparent;
      filter: blur(0.5px);
      backdrop-filter: blur(15px);
      z-index: -1;
    }
    
    /* Текст сообщения */
    .snaptalk-message-text {
      line-height: 1.5;
      font-size: 15px;
      color: var(--snaptalk-text);
      margin: 0 0 12px 0;
      font-weight: 400;
    }
  `;
}
