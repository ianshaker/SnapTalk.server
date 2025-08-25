// ===== Главный генератор виджета SnapTalk =====

import { generateWidgetStyles } from './styles.js';
import { generateChatStyles } from './chatStyles.js';
import { generateCompleteHTML } from './templates.js';
import { generateWidgetClass } from './SnapTalkWidget.js';

export function generateWidgetJS(clientId, config, texts, serverUrl, apiKey = '', managerAvatarUrl = '') {
  const widgetColor = config.minimizedButton?.backgroundColor || '#70B347';
  const hoverColor = config.minimizedButton?.hoverBackgroundColor || '#5a9834';
  const position = config.position || {};
  
  // Объединяем стили
  const combinedStyles = generateWidgetStyles(widgetColor, hoverColor, position) + generateChatStyles();
  
  // Получаем HTML шаблон
  const widgetHTML = generateCompleteHTML(texts);
  
  // Получаем класс виджета
  const widgetClass = generateWidgetClass();
  
  return `
// SnapTalk Widget v2.1 - Modular Architecture
(function() {
  'use strict';
  
  console.log('🚀 SnapTalk Widget v2.1 загружен для: ${clientId}');
  
  // Проверяем, что виджет еще не загружен
  if (window.SnapTalkWidget) return;
  
  // ===== КОНФИГУРАЦИЯ =====
  const WIDGET_TEXTS = ${JSON.stringify(texts, null, 2)};
  const CLIENT_ID = '${clientId}';
  const API_KEY = '${apiKey}';
  const SERVER_URL = '${serverUrl}';
  const WIDGET_COLOR = '${widgetColor}';
  const HOVER_COLOR = '${hoverColor}';
  const MANAGER_AVATAR_URL = '${managerAvatarUrl}';
  
  // ===== СТИЛИ =====
  const WIDGET_STYLES = \`${combinedStyles}\`;
  
  // ===== HTML ШАБЛОН =====
  const WIDGET_HTML = \`${widgetHTML}\`;
  
  // ===== КЛАСС ВИДЖЕТА =====
  ${widgetClass}
  
  // ===== ИНИЦИАЛИЗАЦИЯ =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.SnapTalkWidget = new SnapTalkWidget();
    });
  } else {
    window.SnapTalkWidget = new SnapTalkWidget();
  }
  
})();
`;
}
