// ===== Главный класс виджета SnapTalk - модульная структура =====

import { generateWidgetCore } from './widget-core.js';
import { generateWidgetGreeting } from './widget-greeting.js';
import { generateWidgetWebSocket } from './widget-websocket.js';
import { generateWidgetMessaging } from './widget-messaging.js';

export function generateWidgetClass() {
  return `
  class SnapTalkWidget {
    ${generateWidgetCore()}
    
    ${generateWidgetGreeting()}
    
    ${generateWidgetWebSocket()}
    
    ${generateWidgetMessaging()}
  }
  `;
}