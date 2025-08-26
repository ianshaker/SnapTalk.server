// ===== Стили индикатора печатания =====

export function generateTypingStyles() {
  return `
    /* Анимация печатания */
    .snaptalk-typing {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 4px 0;
    }
    
    .snaptalk-typing-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--snaptalk-primary);
      animation: snaptalk-typing 1.4s ease-in-out infinite;
      opacity: 0.4;
    }
    
    .snaptalk-typing-dot:nth-child(1) { animation-delay: 0s; }
    .snaptalk-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .snaptalk-typing-dot:nth-child(3) { animation-delay: 0.4s; }
  `;
}
