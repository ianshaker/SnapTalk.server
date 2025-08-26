// ===== Главный файл стилей виджета =====

import { generateCSSVariables } from './variables.js';
import { generateButtonStyles } from './components/button.js';
import { generateBubbleStyles } from './components/bubble.js';
import { generateAvatarStyles } from './components/avatar.js';
import { generateTypingStyles } from './components/typing.js';
import { generateContainerStyles } from './layout/container.js';
import { generateAnimations } from './animations/index.js';

export function generateWidgetStyles(colorConfig, position) {
  return `
    /* ===== SNAPTALK WIDGET STYLES ===== */
    
    ${generateCSSVariables(colorConfig)}
    
    ${generateContainerStyles(position)}
    
    ${generateButtonStyles()}
    
    ${generateBubbleStyles()}
    
    ${generateAvatarStyles()}
    
    ${generateTypingStyles()}
    
    ${generateAnimations()}
    
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
