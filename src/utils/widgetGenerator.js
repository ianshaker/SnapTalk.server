// ===== Генератор JavaScript кода виджета =====
export function generateWidgetJS(clientId, config, texts, serverUrl) {
  return `
// SnapTalk Widget v1.0 - Generated for client: ${clientId}
(function() {
  'use strict';
  
  // Простая тестовая версия виджета
  console.log('SnapTalk Widget загружен для клиента ${clientId}');
  
  // Создаем виджет
  const widget = document.createElement('div');
  widget.id = 'snaptalk-widget-${clientId}';
  widget.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: ${config.minimizedButton?.backgroundColor || '#70B347'};
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    font-family: Arial, sans-serif;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: transform 0.2s ease;
  \`;
  
  widget.innerHTML = '💬';
  widget.title = '${texts.managerName || 'Чат поддержки'}';
  
  // Обработчик клика
  widget.onclick = function() {
    alert('SnapTalk чат активирован!\\nКлиент: ${clientId}\\nТекст: ${texts.greeting || 'Привет!'}');
  };
  
  // Эффект при наведении
  widget.onmouseenter = function() {
    this.style.transform = 'scale(1.1)';
  };
  
  widget.onmouseleave = function() {
    this.style.transform = 'scale(1)';
  };
  
  // Добавляем виджет на страницу
  document.body.appendChild(widget);
  
  console.log('✅ SnapTalk Widget создан и добавлен на страницу');
  
  // Простая анимация появления
  setTimeout(() => {
    widget.style.animation = 'bounce 1s ease-out';
    const style = document.createElement('style');
    style.textContent = \`
      @keyframes bounce {
        0% { transform: scale(0); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
    \`;
    document.head.appendChild(style);
  }, 100);
  
})();
`;
}