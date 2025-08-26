// ===== Стили аватаров =====

export function generateAvatarStyles() {
  return `
    /* Аватар - стиль Apple */
    .snaptalk-avatar {
      width: 42px;
      height: 42px;
      border-radius: var(--snaptalk-radius-full);
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.8);
      background: var(--snaptalk-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: white;
      flex-shrink: 0;
      box-shadow: var(--snaptalk-shadow-soft);
      transition: all var(--snaptalk-transition-normal);
      position: relative;
    }
    
    .snaptalk-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
    }
    
    .snaptalk-avatar-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: var(--snaptalk-gradient);
      color: white;
      font-size: 16px;
      font-weight: 600;
    }
  `;
}
