// ===== Логика сообщений и чата для виджета SnapTalk =====

export function generateWidgetMessaging() {
  return `
    openChat() {
      this.isOpen = true;
      
      // Скрываем приветствие
      const greetingEl = document.getElementById('snaptalk-greeting');
      greetingEl.classList.add('snaptalk-hidden');
      
      // Показываем чат и скрываем кружок
      document.getElementById('snaptalk-toggle').classList.add('snaptalk-hidden');
      document.getElementById('snaptalk-chat').classList.remove('snaptalk-hidden');
      
      // Подключаемся к WebSocket
      if (!this.connected) {
        this.connectWebSocket();
      }
      
      // Добавляем приветственное сообщение в чат
      if (this.messages.length === 0) {
        setTimeout(() => {
          this.addMessage(WIDGET_TEXTS.greeting || 'Здравствуйте! Как дела? Чем могу помочь?', 'manager');
        }, 500);
      }
      
      console.log('✅ Чат открыт');
    }
    
    // Метод closeChat удален - закрытие чата больше не поддерживается
    
    addMessage(text, type) {
      const messagesContainer = document.getElementById('snaptalk-messages');
      const messageEl = document.createElement('div');
      messageEl.className = \`snaptalk-message \${type}\`;
      messageEl.textContent = text;
      
      messagesContainer.appendChild(messageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      this.messages.push({ text, type, timestamp: Date.now() });
    }
    
    async sendMessage() {
      const input = document.getElementById('snaptalk-input');
      const text = input.value.trim();
      
      if (!text) return;
      
      // Добавляем сообщение пользователя
      this.addMessage(text, 'user');
      input.value = '';
      input.style.height = 'auto';
      
      try {
        console.log('📤 Отправляем сообщение:', text);
        
        // Собираем UTM метки и реферер
        const urlParams = new URLSearchParams(window.location.search);
        const meta = {
          utm: {
            source: urlParams.get('utm_source'),
            medium: urlParams.get('utm_medium'),
            campaign: urlParams.get('utm_campaign'),
            term: urlParams.get('utm_term'),
            content: urlParams.get('utm_content')
          },
          ref: document.referrer,
          url: window.location.href,
          userAgent: navigator.userAgent
        };
        
        const response = await fetch(SERVER_URL + '/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: CLIENT_ID,
            apiKey: API_KEY,
            text: text,
            meta: meta,
            visitorId: this.visitorId,   // FingerprintJS visitor ID
            requestId: this.requestId    // FingerprintJS request ID
          })
        });
        
        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}\`);
        }
        
        const result = await response.json();
        console.log('✅ Сообщение отправлено:', result);
        
      } catch (error) {
        console.error('❌ Ошибка отправки:', error);
        this.addMessage('❌ Не удалось отправить сообщение. Попробуйте позже.', 'system');
      }
    }
  `;
}
