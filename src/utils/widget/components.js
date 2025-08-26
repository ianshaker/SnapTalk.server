// ===== Главный файл компонентов для виджета SnapTalk =====

import { generateWidgetComponents as generateComponents } from './widget-components.js';
import { generateWidgetAnimations } from './widget-animations.js';

export function generateWidgetComponents() {
  return `
    ${generateComponents()}
    ${generateWidgetAnimations()}
  `;
}