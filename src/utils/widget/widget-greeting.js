// ===== Логика приветствия и анимаций виджета SnapTalk =====

export function generateWidgetGreeting() {
  return `
    async showGreetingWithTyping() {
      if (this.isOpen) return;
      
      const greetingEl = document.getElementById('snaptalk-greeting');
      const textEl = document.getElementById('snaptalk-greeting-text');
      const replyBtn = document.getElementById('snaptalk-reply');
      
      // Показываем приветствие
      greetingEl.classList.remove('snaptalk-hidden');
      
      // Показываем анимацию печатания
      textEl.innerHTML = \`
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
          <span class="snaptalk-typing">
            <span class="snaptalk-typing-dot"></span>
            <span class="snaptalk-typing-dot"></span>
            <span class="snaptalk-typing-dot"></span>
          </span>
          <span style="color: var(--snaptalk-text-muted); font-size: 13px; font-style: italic;">
            \${WIDGET_TEXTS.managerName || 'Менеджер'} печатает...
          </span>
        </div>
      \`;
      
      // Через 2.5 секунды показываем текст сразу целиком
      setTimeout(() => {
        const text = WIDGET_TEXTS.greeting || 'Здравствуйте! Как дела? Чем могу помочь?';
        textEl.innerHTML = text; // Показываем текст сразу весь
        
        // Показываем кнопку "Ответить" с небольшой задержкой
        setTimeout(() => {
          replyBtn.classList.remove('snaptalk-hidden');
        }, 500);
      }, 2500);
    }
    
    typeText(element, text, callback) {
      element.innerHTML = ''; // Очищаем полностью (убираем точки)
      let i = 0;
      
      const typeChar = () => {
        if (i < text.length) {
          element.innerHTML += text.charAt(i);
          i++;
          
          // Добавляем мигающий курсор во время печатания
          const cursor = '<span style="animation: blink 1s infinite; margin-left: 1px; color: var(--snaptalk-primary);">|</span>';
          element.innerHTML += cursor;
          
          setTimeout(() => {
            // Убираем курсор перед следующим символом
            element.innerHTML = element.innerHTML.replace(cursor, '');
            typeChar();
          }, Math.random() * 60 + 30); // Случайная скорость от 30 до 90ms для реалистичности
        } else {
          // Убираем курсор в конце и показываем финальный текст
          element.innerHTML = text;
          if (callback) {
            setTimeout(callback, 800);
          }
        }
      };
      
      typeChar();
    }
    
    // Метод hideGreeting удален - кнопки закрытия больше нет
    
    toggleWidget() {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    }
  `;
}
