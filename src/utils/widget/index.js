// ===== Главный генератор виджета SnapTalk =====

import { generateWidgetStyles } from './styles.js';
import { generateChatStyles } from './chatStyles.js';
import { generateCompleteHTML } from './templates.js';
import { generateWidgetClass } from './SnapTalkWidget.js';
import { createWidgetColorConfig } from '../colorUtils.js';
import { TrackingService } from '../tracking/TrackingService.js';
import { PageTracker } from '../tracking/PageTracker.js';
import { SessionTracker } from '../tracking/SessionTracker.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Читаем TrackingService как строку для встраивания
function getTrackingServiceCode() {
  const trackingServicePath = path.join(__dirname, '../tracking/TrackingService.js');
  const code = fs.readFileSync(trackingServicePath, 'utf8');
  // Убираем export и делаем класс доступным глобально
  return code.replace('export class TrackingService', 'class TrackingService');
}

// Читаем PageTracker как строку для встраивания
function getPageTrackerCode() {
  const pageTrackerPath = path.join(__dirname, '../tracking/PageTracker.js');
  const code = fs.readFileSync(pageTrackerPath, 'utf8');
  // Убираем export и делаем класс доступным глобально
  return code.replace('export class PageTracker', 'class PageTracker');
}

// Читаем SessionTracker как строку для встраивания
function getSessionTrackerCode() {
  const sessionTrackerPath = path.join(__dirname, '../tracking/SessionTracker.js');
  const code = fs.readFileSync(sessionTrackerPath, 'utf8');
  // Убираем export и делаем класс доступным глобально
  return code.replace('export class SessionTracker', 'class SessionTracker');
}

export function generateWidgetJS(clientId, config, texts, serverUrl, apiKey = '', managerAvatarUrl = '') {
  const primaryColor = config.minimizedButton?.primary || config.minimizedButton?.backgroundColor || '#70B347';
  const secondaryColor = config.minimizedButton?.secondary || config.minimizedButton?.widgetColorSecondary || '#A3D977';
  const position = config.position || {};
  
  // Создаем конфигурацию цветов
  const colorConfig = createWidgetColorConfig(primaryColor, secondaryColor);
  
  // Объединяем стили
  const combinedStyles = generateWidgetStyles(colorConfig, position) + generateChatStyles();
  
  // Получаем HTML шаблон
  const widgetHTML = generateCompleteHTML(texts);
  
  // Получаем класс виджета
  const widgetClass = generateWidgetClass();
  
  // Получаем код TrackingService, PageTracker и SessionTracker
  const trackingServiceCode = getTrackingServiceCode();
  const pageTrackerCode = getPageTrackerCode();
  const sessionTrackerCode = getSessionTrackerCode();
  
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
  const COLOR_CONFIG = ${JSON.stringify(colorConfig, null, 2)};
  const MANAGER_AVATAR_URL = '${managerAvatarUrl}';
  
  // ===== СТИЛИ =====
  const WIDGET_STYLES = \`${combinedStyles}\`;
  
  // ===== HTML ШАБЛОН =====
  const WIDGET_HTML = \`${widgetHTML}\`;
  
  // ===== TRACKING SERVICE =====
  ${trackingServiceCode}
  
  // ===== PAGE TRACKER =====
  ${pageTrackerCode}
  
  // ===== SESSION TRACKER =====
  ${sessionTrackerCode}
  
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
