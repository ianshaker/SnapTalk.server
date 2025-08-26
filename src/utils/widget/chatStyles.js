// ===== Главный файл стилей чата для виджета SnapTalk =====

import { generateChatWindow } from './chat-window.js';
import { generateChatMessages } from './chat-messages.js';

export function generateChatStyles() {
  return `
    ${generateChatWindow()}
    ${generateChatMessages()}
  `;
}