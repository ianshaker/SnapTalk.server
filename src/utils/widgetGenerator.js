// ===== Генератор JavaScript кода виджета =====
// DEPRECATED: Этот файл заменен модульной архитектурой в папке ./widget/
// Используйте import { generateWidgetJS } from './widget/index.js'

import { generateWidgetJS as generateModularWidget } from './widget/index.js';

export function generateWidgetJS(clientId, config, texts, serverUrl, apiKey = '', managerAvatarUrl = '') {
  // Перенаправляем на новую модульную реализацию
  return generateModularWidget(clientId, config, texts, serverUrl, apiKey, managerAvatarUrl);
}