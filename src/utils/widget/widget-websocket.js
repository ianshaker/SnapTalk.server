// ===== WebSocket логика для виджета SnapTalk =====

export function generateWidgetWebSocket() {
  return `
    connectWebSocket() {
      if (this.ws) {
        this.ws.close();
      }
      
      this.updateConnectionStatus('connecting');
      
      try {
        const protocol = SERVER_URL.startsWith('https') ? 'wss' : 'ws';
        const wsUrl = SERVER_URL.replace(/^https?/, protocol) + '/ws?clientId=' + CLIENT_ID;
        
        console.log('🔗 Подключаемся к WebSocket:', wsUrl);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket подключен');
          this.connected = true;
          this.updateConnectionStatus('connected');
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Получено сообщение:', data);
            
            if (data.from === 'manager') {
              this.addMessage(data.text, 'manager');
            }
          } catch (e) {
            console.error('❌ Ошибка парсинга сообщения:', e);
          }
        };
        
        this.ws.onclose = () => {
          console.log('❌ WebSocket отключен');
          this.connected = false;
          this.updateConnectionStatus('disconnected');
          
          // Переподключение через 3 секунды
          setTimeout(() => {
            if (!this.connected && this.isOpen) {
              this.connectWebSocket();
            }
          }, 3000);
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket ошибка:', error);
          this.connected = false;
          this.updateConnectionStatus('disconnected');
        };
        
      } catch (error) {
        console.error('❌ Ошибка создания WebSocket:', error);
        this.updateConnectionStatus('disconnected');
      }
    }
    
    updateConnectionStatus(status) {
      const statusEl = document.getElementById('snaptalk-connection-status');
      if (!statusEl) return;
      
      statusEl.className = 'snaptalk-connection-status ' + status;
      
      switch (status) {
        case 'connected':
          statusEl.textContent = 'Подключен';
          break;
        case 'connecting':
          statusEl.textContent = 'Подключение...';
          break;
        case 'disconnected':
          statusEl.textContent = 'Нет связи';
          break;
      }
    }
  `;
}
