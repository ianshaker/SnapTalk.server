// ===== Главный файл стилей для виджета SnapTalk =====

import { generateWidgetVariables } from './variables.js';
import { generateWidgetComponents } from './components.js';

export function generateWidgetStyles(colorConfig, position) {
  return `
    ${generateWidgetVariables(colorConfig, position)}
    ${generateWidgetComponents()}
  `;
}