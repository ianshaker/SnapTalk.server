import http from 'http';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';

/**
 * ENV (Render → Settings → Environment):
 * - TELEGRAM_BOT_TOKEN        // токен бота из BotFather
 * - TELEGRAM_SUPERGROUP_ID    // ИД супергруппы с включённым Forum (обязательно с минусом, напр. -1002996396033)
 * - TELEGRAM_WEBHOOK_SECRET   // произвольная строка для секьюрного пути вебхука
 * - SUPABASE_URL              // (опц.) URL проекта Supabase
 * - SUPABASE_SERVICE_ROLE     // (опц.) service role ключ Supabase (ТОЛЬКО НА СЕРВЕРЕ)
 */

const app = express();

// CORS: разрешаем твой сайт и *.lovable.app
const allowed = ['https://savov.lovable.app'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // health, Postman, Telegram webhook
    if (allowed.includes(origin) || /\.lovable\.app$/i.test(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
}));
app.options('*', cors());

app.use(bodyParser.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID && Number(process.env.TELEGRAM_SUPERGROUP_ID);
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-secret';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// Supabase client (если заданы переменные)
const sb = (SUPABASE_URL && SUPABASE_SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
  : null;

// ===== Доп. утилиты / тестовые руты =====
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/favicon.ico', (_req, res) => res.sendStatus(204));

// Главная страница с демонстрацией
app.get('/', (_req, res) => {
  const demoKey = 'demo-snaptalk-2025';
  const serverUrl = req.protocol + '://' + req.get('host');
  
  res.type('text/html').send(\`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SnapTalk Server - Live Chat Widget</title>
    <style>
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 2rem; 
            line-height: 1.6;
        }
        .hero { 
            text-align: center; 
            margin-bottom: 3rem; 
            padding: 2rem; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 1rem;
        }
        .section { 
            background: #f8fafc; 
            padding: 1.5rem; 
            border-radius: 0.5rem; 
            margin-bottom: 2rem; 
        }
        .code { 
            background: #1e293b; 
            color: #e2e8f0; 
            padding: 1rem; 
            border-radius: 0.5rem; 
            font-family: 'Monaco', 'Menlo', monospace; 
            overflow-x: auto;
            margin: 1rem 0;
        }
        .api-endpoint {
            background: #0ea5e9;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 0.25rem;
            font-family: monospace;
            display: inline-block;
            margin: 0.25rem;
        }
        .demo-btn {
            background: #10b981;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            margin: 0.5rem;
        }
        .demo-btn:hover { background: #059669; }
    </style>
</head>
<body>
    <div class="hero">
        <h1>🚀 SnapTalk Server</h1>
        <p>Modern live chat widget with Telegram integration</p>
    </div>

    <div class="section">
        <h2>💻 Embed Code для клиентов</h2>
        <p>Просто вставьте этот код на свой сайт:</p>
        <div class="code">&lt;script src="\${serverUrl}/api/widget.js?key=\${demoKey}" async&gt;&lt;/script&gt;</div>
        <p><strong>Это всё!</strong> Виджет автоматически загрузится со всеми настройками стилей с сервера.</p>
    </div>

    <div class="section">
        <h2>🔧 API Endpoints</h2>
        
        <h3>Для клиентов:</h3>
        <div class="api-endpoint">GET /api/widget.js?key=API_KEY</div> - Получить JavaScript код виджета<br>
        <div class="api-endpoint">GET /api/widget/config?key=API_KEY</div> - Получить JSON конфигурацию<br>
        <div class="api-endpoint">POST /api/chat/send</div> - Отправить сообщение в Telegram<br>
        <div class="api-endpoint">WebSocket /ws?clientId=ID</div> - Получать ответы в реальном времени<br>

        <h3>Для управления ключами:</h3>
        <div class="api-endpoint">POST /api/keys/create</div> - Создать новый API ключ<br>
        <div class="api-endpoint">GET /api/keys/:key</div> - Информация о ключе<br>
        <div class="api-endpoint">GET /api/keys</div> - Список всех ключей<br>
    </div>

    <div class="section">
        <h2>🎯 Демонстрация</h2>
        <p>На этой странице виджет уже подключен с демо-ключом. Попробуйте:</p>
        <button class="demo-btn" onclick="createDemoKey()">Создать новый API ключ</button>
        <button class="demo-btn" onclick="showApiKeys()">Показать все ключи</button>
        
        <div id="demo-result" style="margin-top: 1rem;"></div>
    </div>

    <div class="section">
        <h2>📋 Создание API ключа</h2>
        <div class="code">
curl -X POST \${serverUrl}/api/keys/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientName": "My Website",
    "domain": "example.com",
    "language": "ru"
  }'
        </div>
    </div>

    <script>
        async function createDemoKey() {
            try {
                const response = await fetch('/api/keys/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientName: 'Demo Test ' + Date.now(),
                        domain: 'demo.localhost',
                        language: 'ru'
                    })
                });
                const data = await response.json();
                document.getElementById('demo-result').innerHTML = 
                    '<div class="code">' + JSON.stringify(data, null, 2) + '</div>';
            } catch (e) {
                document.getElementById('demo-result').innerHTML = 'Error: ' + e.message;
            }
        }

        async function showApiKeys() {
            try {
                const response = await fetch('/api/keys');
                const data = await response.json();
                document.getElementById('demo-result').innerHTML = 
                    '<div class="code">' + JSON.stringify(data, null, 2) + '</div>';
            } catch (e) {
                document.getElementById('demo-result').innerHTML = 'Error: ' + e.message;
            }
        }
    </script>

    <!-- Подключаем демо виджет -->
    <script src="/api/widget.js?key=\${demoKey}" async></script>
</body>
</html>
  \`);
});

// ===== Хранилище связок clientId <-> topicId =====
const memoryMap = new Map(); // clientId -> topicId

// ===== Конфигурация визуала чата =====
const chatVisualConfig = {
  // Позиционирование виджета
  position: {
    bottom: "1.5rem", // 24px (bottom-6)
    right: "1.5rem",  // 24px (right-6)
    zIndex: 50
  },

  // Минимизированная кнопка
  minimizedButton: {
    width: "3.5rem",     // 56px (h-14 w-14)
    height: "3.5rem",    // 56px
    borderRadius: "50%", // rounded-full
    backgroundColor: "hsl(var(--primary))",
    color: "hsl(var(--primary-foreground))",
    hoverBackgroundColor: "hsl(var(--primary-hover))",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", // shadow-medium
    animation: "animate-scale-in",
    icon: {
      name: "MessageCircle",
      size: "1.5rem" // h-6 w-6
    }
  },

  // Контейнер виджета
  widget: {
    maxWidth: "20rem", // max-w-sm (320px)
    width: "20rem",    // w-80 (320px) в режиме чата
    animation: "animate-scale-fade-in"
  },

  // Кнопка закрытия
  closeButton: {
    position: "absolute",
    top: "-0.5rem",    // -top-2
    right: "-0.5rem",  // -right-2
    width: "1.5rem",   // h-6 w-6
    height: "1.5rem",
    borderRadius: "50%", // rounded-full
    backgroundColor: "hsl(var(--card))",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", // shadow-soft
    hoverBackgroundColor: "hsl(var(--accent))",
    zIndex: 10,
    icon: {
      name: "X",
      size: "0.75rem" // h-3 w-3
    }
  },

  // Режим приветствия
  greetingMode: {
    container: {
      display: "flex",
      alignItems: "end",
      gap: "0.75rem" // gap-3
    },

    // Пузырь сообщения
    messageBubble: {
      position: "relative",
      maxWidth: "18rem", // max-w-xs
      borderRadius: "1rem", // rounded-2xl
      padding: "0.75rem", // p-3
      backgroundColor: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", // shadow-medium
      background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)" // gradient-card
    },

    // Аватар в сообщении
    messageAvatar: {
      width: "1.5rem",  // w-6 h-6
      height: "1.5rem",
      borderRadius: "50%", // rounded-full
      background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      icon: {
        name: "MessageCircle",
        size: "0.75rem", // h-3 w-3
        color: "hsl(var(--primary-foreground))"
      }
    },

    // Текст сообщения
    messageText: {
      fontSize: "0.75rem", // text-xs
      lineHeight: "1.25",   // leading-snug
      color: "hsl(var(--foreground))"
    },

    // Хвостик сообщения
    messageTail: {
      position: "absolute",
      bottom: "0",
      right: "2rem", // right-8
      transform: "translateY(50%)",
      width: "0.75rem",  // w-3 h-3
      height: "0.75rem",
      backgroundColor: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderTop: "none",
      borderLeft: "none",
      transform: "translateY(50%) rotate(45deg)"
    },

    // Кнопка "Ответить"
    replyButton: {
      backgroundColor: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      hoverBackgroundColor: "hsl(var(--primary-hover))",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", // shadow-soft
      hoverBoxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", // hover:shadow-medium
      fontSize: "0.75rem", // text-xs
      padding: "0.5rem 0.75rem", // px-3 py-2
      borderRadius: "0.375rem", // rounded
      animation: "animate-fade-in",
      marginBottom: "0.5rem" // mb-2
    }
  },

  // Режим чата
  chatMode: {
    container: {
      borderRadius: "1rem", // rounded-2xl
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", // shadow-medium
      border: "1px solid hsl(var(--border))",
      overflow: "hidden",
      background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)" // gradient-card
    },

    // Заголовок чата
    header: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem", // gap-3
      padding: "1rem",    // p-4
      borderBottom: "1px solid hsl(var(--border))",

      backButton: {
        width: "2rem",   // h-8 w-8
        height: "2rem",
        icon: {
          name: "ArrowLeft",
          size: "1rem" // h-4 w-4
        }
      },

      avatar: {
        width: "2rem",   // w-8 h-8
        height: "2rem",
        borderRadius: "50%", // rounded-full
        background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)",
        icon: {
          name: "MessageCircle",
          size: "1rem", // h-4 w-4
          color: "hsl(var(--primary-foreground))"
        }
      },

      name: {
        fontSize: "0.875rem", // text-sm
        fontWeight: "500",     // font-medium
        color: "hsl(var(--foreground))"
      },

      status: {
        fontSize: "0.75rem", // text-xs
        color: "hsl(var(--muted-foreground))"
      }
    },

    // Область сообщений
    messagesArea: {
      height: "16rem",  // h-64
      overflowY: "auto",
      padding: "1rem",  // p-4
      gap: "0.75rem"    // space-y-3
    },

    // Стили сообщений
    messages: {
      // Сообщения пользователя
      user: {
        justifyContent: "flex-end", // justify-end
        bubble: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "0.5rem", // rounded-lg
          padding: "0.5rem",      // p-2
          maxWidth: "80%",        // max-w-[80%]
          fontSize: "0.875rem"    // text-sm
        }
      },

      // Сообщения менеджера
      manager: {
        display: "flex",
        alignItems: "start",
        gap: "0.5rem", // gap-2

        avatar: {
          width: "1.5rem",  // w-6 h-6
          height: "1.5rem",
          borderRadius: "50%", // rounded-full
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)",
          flexShrink: 0,
          icon: {
            name: "MessageCircle",
            size: "0.75rem", // h-3 w-3
            color: "hsl(var(--primary-foreground))"
          }
        },

        bubble: {
          backgroundColor: "hsl(var(--accent) / 0.8)", // bg-accent/80
          color: "hsl(var(--accent-foreground))",
          border: "1px solid hsl(var(--accent))",
          borderRadius: "0.5rem", // rounded-lg
          padding: "0.5rem",      // p-2
          maxWidth: "80%",        // max-w-[80%]
          fontSize: "0.875rem"    // text-sm
        }
      },

      // Начальное приветственное сообщение в чате
      initial: {
        display: "flex",
        alignItems: "start",
        gap: "0.5rem", // gap-2

        avatar: {
          width: "1.5rem",  // w-6 h-6
          height: "1.5rem",
          borderRadius: "50%", // rounded-full
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)",
          flexShrink: 0,
          icon: {
            name: "MessageCircle",
            size: "0.75rem", // h-3 w-3
            color: "hsl(var(--primary-foreground))"
          }
        },

        bubble: {
          backgroundColor: "hsl(var(--secondary) / 0.5)", // bg-secondary/50
          color: "hsl(var(--foreground))",
          borderRadius: "0.5rem", // rounded-lg
          padding: "0.5rem",      // p-2
          maxWidth: "80%",        // max-w-[80%]
          fontSize: "0.875rem"    // text-sm
        }
      }
    },

    // Область ввода
    inputArea: {
      padding: "1rem",        // p-4
      borderTop: "1px solid hsl(var(--border))",
      display: "flex",
      gap: "0.5rem",          // gap-2

      input: {
        flex: 1,
        // Использует стили из компонента Input
      },

      sendButton: {
        backgroundColor: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        hoverBackgroundColor: "hsl(var(--primary-hover))",
        width: "2.5rem",  // size="icon" equivalent
        height: "2.5rem",
        icon: {
          name: "Send",
          size: "1rem" // h-4 w-4
        }
      }
    }
  },

  // Анимации
  animations: {
    scaleIn: "animate-scale-in",
    fadeIn: "animate-fade-in", 
    scaleFadeIn: "animate-scale-fade-in"
  },

  // Цвета и темы
  colors: {
    primary: "hsl(var(--primary))",
    primaryForeground: "hsl(var(--primary-foreground))",
    primaryHover: "hsl(var(--primary-hover))",
    card: "hsl(var(--card))",
    border: "hsl(var(--border))",
    foreground: "hsl(var(--foreground))",
    mutedForeground: "hsl(var(--muted-foreground))",
    accent: "hsl(var(--accent))",
    accentForeground: "hsl(var(--accent-foreground))",
    secondary: "hsl(var(--secondary))"
  },

  // Тексты (локализация)
  texts: {
    ru: {
      greeting: "Здравствуйте, меня зовут Сергей. Я готов вас проконсультировать. Какие у вас вопросы?",
      reply: "Ответить",
      placeholder: "Введите ваше сообщение...",
      send: "Отправить",
      back: "Назад",
      managerName: "Сергей",
      managerStatus: "Онлайн"
    },
    en: {
      greeting: "Hello, my name is Sergey. I'm ready to consult with you. What questions do you have?",
      reply: "Reply",
      placeholder: "Type your message...",
      send: "Send", 
      back: "Back",
      managerName: "Sergey",
      managerStatus: "Online"
    }
  }
};

// ===== API ключи для клиентов =====
const apiKeys = new Map([
  // Демонстрационный ключ
  ['demo-snaptalk-2025', {
    clientName: 'Demo Client',
    domain: '*', // любой домен для демо
    config: chatVisualConfig,
    language: 'ru',
    created: new Date().toISOString()
  }]
]);

async function dbGetTopic(clientId) {
  if (!sb) return memoryMap.get(clientId) || null;
  const { data, error } = await sb
    .from('client_topics')
    .select('topic_id')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) { console.error('dbGetTopic error', error); return null; }
  return data?.topic_id ?? null;
}

async function dbSaveTopic(clientId, topicId) {
  if (!sb) { memoryMap.set(clientId, topicId); return; }
  const { error } = await sb
    .from('client_topics')
    .upsert({ client_id: clientId, topic_id: topicId }, { onConflict: 'client_id' });
  if (error) console.error('dbSaveTopic error', error);
}

// ===== Генератор JavaScript кода виджета =====
function generateWidgetJS(clientId, config, texts, serverUrl) {
  return `
// SnapTalk Widget v1.0 - Generated for client: ${clientId}
(function() {
  'use strict';
  
  const SNAPTALK_CONFIG = ${JSON.stringify({ clientId, config, texts, serverUrl }, null, 2)};
  const CLIENT_ID = '${clientId}';
  const SERVER_URL = '${serverUrl}';
  
  // Проверяем, что виджет еще не загружен
  if (window.SnapTalkWidget) return;
  
  class SnapTalkWidget {
    constructor() {
      this.isOpen = false;
      this.isGreeting = true;
      this.messages = [];
      this.ws = null;
      this.connected = false;
      
      this.init();
    }
    
    init() {
      this.loadStyles();
      this.createWidget();
      this.connectWebSocket();
      
      // Автоматически показываем приветствие через 3 секунды
      setTimeout(() => this.showGreeting(), 3000);
    }
    
    loadStyles() {
      const style = document.createElement('style');
      style.textContent = \`
        .snaptalk-widget { 
          position: fixed; 
          bottom: \${SNAPTALK_CONFIG.config.position.bottom}; 
          right: \${SNAPTALK_CONFIG.config.position.right}; 
          z-index: \${SNAPTALK_CONFIG.config.position.zIndex}; 
          font-family: system-ui, -apple-system, sans-serif;
          --primary: 220 70% 50%;
          --primary-foreground: 0 0% 98%;
          --primary-hover: 220 70% 45%;
          --card: 0 0% 100%;
          --border: 220 13% 91%;
          --foreground: 224 71% 4%;
          --muted-foreground: 215 16% 47%;
          --accent: 210 40% 94%;
          --accent-foreground: 222 47% 11%;
          --secondary: 210 40% 94%;
          --muted: 210 40% 96%;
        }
        .snaptalk-btn { 
          width: \${SNAPTALK_CONFIG.config.minimizedButton.width}; 
          height: \${SNAPTALK_CONFIG.config.minimizedButton.height}; 
          border-radius: \${SNAPTALK_CONFIG.config.minimizedButton.borderRadius}; 
          background: \${SNAPTALK_CONFIG.config.minimizedButton.backgroundColor}; 
          color: \${SNAPTALK_CONFIG.config.minimizedButton.color}; 
          border: none; 
          cursor: pointer; 
          box-shadow: \${SNAPTALK_CONFIG.config.minimizedButton.boxShadow}; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          transition: all 0.2s ease;
        }
        .snaptalk-btn:hover { 
          background: \${SNAPTALK_CONFIG.config.minimizedButton.hoverBackgroundColor}; 
          transform: scale(1.05);
        }
        .snaptalk-close-btn {
          position: \${SNAPTALK_CONFIG.config.closeButton.position};
          top: \${SNAPTALK_CONFIG.config.closeButton.top};
          right: \${SNAPTALK_CONFIG.config.closeButton.right};
          width: \${SNAPTALK_CONFIG.config.closeButton.width};
          height: \${SNAPTALK_CONFIG.config.closeButton.height};
          border-radius: \${SNAPTALK_CONFIG.config.closeButton.borderRadius};
          background: \${SNAPTALK_CONFIG.config.closeButton.backgroundColor};
          border: none;
          cursor: pointer;
          box-shadow: \${SNAPTALK_CONFIG.config.closeButton.boxShadow};
          z-index: \${SNAPTALK_CONFIG.config.closeButton.zIndex};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .snaptalk-close-btn:hover {
          background: \${SNAPTALK_CONFIG.config.closeButton.hoverBackgroundColor};
        }
        .snaptalk-greeting {
          max-width: \${SNAPTALK_CONFIG.config.widget.maxWidth};
          display: \${SNAPTALK_CONFIG.config.greetingMode.container.display};
          align-items: \${SNAPTALK_CONFIG.config.greetingMode.container.alignItems};
          gap: \${SNAPTALK_CONFIG.config.greetingMode.container.gap};
          margin-bottom: 1rem;
        }
        .snaptalk-greeting-bubble {
          position: \${SNAPTALK_CONFIG.config.greetingMode.messageBubble.position};
          max-width: \${SNAPTALK_CONFIG.config.greetingMode.messageBubble.maxWidth};
          border-radius: \${SNAPTALK_CONFIG.config.greetingMode.messageBubble.borderRadius};
          padding: \${SNAPTALK_CONFIG.config.greetingMode.messageBubble.padding};
          background: \${SNAPTALK_CONFIG.config.greetingMode.messageBubble.background};
          border: \${SNAPTALK_CONFIG.config.greetingMode.messageBubble.border};
          box-shadow: \${SNAPTALK_CONFIG.config.greetingMode.messageBubble.boxShadow};
        }
        .snaptalk-greeting-bubble::after {
          content: '';
          position: \${SNAPTALK_CONFIG.config.greetingMode.messageTail.position};
          bottom: \${SNAPTALK_CONFIG.config.greetingMode.messageTail.bottom};
          right: \${SNAPTALK_CONFIG.config.greetingMode.messageTail.right};
          width: \${SNAPTALK_CONFIG.config.greetingMode.messageTail.width};
          height: \${SNAPTALK_CONFIG.config.greetingMode.messageTail.height};
          background: \${SNAPTALK_CONFIG.config.greetingMode.messageTail.backgroundColor};
          border: \${SNAPTALK_CONFIG.config.greetingMode.messageTail.border};
          border-top: \${SNAPTALK_CONFIG.config.greetingMode.messageTail.borderTop};
          border-left: \${SNAPTALK_CONFIG.config.greetingMode.messageTail.borderLeft};
          transform: \${SNAPTALK_CONFIG.config.greetingMode.messageTail.transform};
        }
        .snaptalk-greeting-text {
          font-size: \${SNAPTALK_CONFIG.config.greetingMode.messageText.fontSize};
          line-height: \${SNAPTALK_CONFIG.config.greetingMode.messageText.lineHeight};
          color: \${SNAPTALK_CONFIG.config.greetingMode.messageText.color};
          margin: 0;
        }
        .snaptalk-reply-btn {
          background: \${SNAPTALK_CONFIG.config.greetingMode.replyButton.backgroundColor};
          color: \${SNAPTALK_CONFIG.config.greetingMode.replyButton.color};
          border: none;
          font-size: \${SNAPTALK_CONFIG.config.greetingMode.replyButton.fontSize};
          padding: \${SNAPTALK_CONFIG.config.greetingMode.replyButton.padding};
          border-radius: \${SNAPTALK_CONFIG.config.greetingMode.replyButton.borderRadius};
          cursor: pointer;
          box-shadow: \${SNAPTALK_CONFIG.config.greetingMode.replyButton.boxShadow};
          margin-bottom: \${SNAPTALK_CONFIG.config.greetingMode.replyButton.marginBottom};
          transition: all 0.2s ease;
        }
        .snaptalk-reply-btn:hover {
          background: \${SNAPTALK_CONFIG.config.greetingMode.replyButton.hoverBackgroundColor};
          box-shadow: \${SNAPTALK_CONFIG.config.greetingMode.replyButton.hoverBoxShadow};
        }
        .snaptalk-chat {
          width: \${SNAPTALK_CONFIG.config.widget.width};
          border-radius: \${SNAPTALK_CONFIG.config.chatMode.container.borderRadius};
          box-shadow: \${SNAPTALK_CONFIG.config.chatMode.container.boxShadow};
          border: \${SNAPTALK_CONFIG.config.chatMode.container.border};
          overflow: \${SNAPTALK_CONFIG.config.chatMode.container.overflow};
          background: \${SNAPTALK_CONFIG.config.chatMode.container.background};
          display: none;
        }
        .snaptalk-chat.active { display: block; }
        .snaptalk-header {
          display: \${SNAPTALK_CONFIG.config.chatMode.header.display};
          align-items: \${SNAPTALK_CONFIG.config.chatMode.header.alignItems};
          gap: \${SNAPTALK_CONFIG.config.chatMode.header.gap};
          padding: \${SNAPTALK_CONFIG.config.chatMode.header.padding};
          border-bottom: \${SNAPTALK_CONFIG.config.chatMode.header.borderBottom};
        }
        .snaptalk-back-btn {
          width: \${SNAPTALK_CONFIG.config.chatMode.header.backButton.width};
          height: \${SNAPTALK_CONFIG.config.chatMode.header.backButton.height};
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .snaptalk-avatar {
          width: \${SNAPTALK_CONFIG.config.chatMode.header.avatar.width};
          height: \${SNAPTALK_CONFIG.config.chatMode.header.avatar.height};
          border-radius: \${SNAPTALK_CONFIG.config.chatMode.header.avatar.borderRadius};
          background: \${SNAPTALK_CONFIG.config.chatMode.header.avatar.background};
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .snaptalk-name {
          font-size: \${SNAPTALK_CONFIG.config.chatMode.header.name.fontSize};
          font-weight: \${SNAPTALK_CONFIG.config.chatMode.header.name.fontWeight};
          color: \${SNAPTALK_CONFIG.config.chatMode.header.name.color};
          margin: 0;
        }
        .snaptalk-status {
          font-size: \${SNAPTALK_CONFIG.config.chatMode.header.status.fontSize};
          color: \${SNAPTALK_CONFIG.config.chatMode.header.status.color};
          margin: 0;
        }
        .snaptalk-messages {
          height: \${SNAPTALK_CONFIG.config.chatMode.messagesArea.height};
          overflow-y: \${SNAPTALK_CONFIG.config.chatMode.messagesArea.overflowY};
          padding: \${SNAPTALK_CONFIG.config.chatMode.messagesArea.padding};
          display: flex;
          flex-direction: column;
          gap: \${SNAPTALK_CONFIG.config.chatMode.messagesArea.gap};
        }
        .snaptalk-message-user {
          display: flex;
          justify-content: \${SNAPTALK_CONFIG.config.chatMode.messages.user.justifyContent};
        }
        .snaptalk-message-user .snaptalk-bubble {
          background: \${SNAPTALK_CONFIG.config.chatMode.messages.user.bubble.backgroundColor};
          color: \${SNAPTALK_CONFIG.config.chatMode.messages.user.bubble.color};
          border-radius: \${SNAPTALK_CONFIG.config.chatMode.messages.user.bubble.borderRadius};
          padding: \${SNAPTALK_CONFIG.config.chatMode.messages.user.bubble.padding};
          max-width: \${SNAPTALK_CONFIG.config.chatMode.messages.user.bubble.maxWidth};
          font-size: \${SNAPTALK_CONFIG.config.chatMode.messages.user.bubble.fontSize};
        }
        .snaptalk-message-manager {
          display: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.display};
          align-items: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.alignItems};
          gap: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.gap};
        }
        .snaptalk-message-manager .snaptalk-msg-avatar {
          width: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.avatar.width};
          height: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.avatar.height};
          border-radius: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.avatar.borderRadius};
          background: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.avatar.background};
          flex-shrink: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.avatar.flexShrink};
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .snaptalk-message-manager .snaptalk-bubble {
          background: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.bubble.backgroundColor};
          color: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.bubble.color};
          border: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.bubble.border};
          border-radius: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.bubble.borderRadius};
          padding: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.bubble.padding};
          max-width: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.bubble.maxWidth};
          font-size: \${SNAPTALK_CONFIG.config.chatMode.messages.manager.bubble.fontSize};
        }
        .snaptalk-input-area {
          padding: \${SNAPTALK_CONFIG.config.chatMode.inputArea.padding};
          border-top: \${SNAPTALK_CONFIG.config.chatMode.inputArea.borderTop};
          display: \${SNAPTALK_CONFIG.config.chatMode.inputArea.display};
          gap: \${SNAPTALK_CONFIG.config.chatMode.inputArea.gap};
        }
        .snaptalk-input {
          flex: \${SNAPTALK_CONFIG.config.chatMode.inputArea.input.flex};
          padding: 0.5rem;
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
          outline: none;
          font-size: 0.875rem;
        }
        .snaptalk-send-btn {
          background: \${SNAPTALK_CONFIG.config.chatMode.inputArea.sendButton.backgroundColor};
          color: \${SNAPTALK_CONFIG.config.chatMode.inputArea.sendButton.color};
          border: none;
          width: \${SNAPTALK_CONFIG.config.chatMode.inputArea.sendButton.width};
          height: \${SNAPTALK_CONFIG.config.chatMode.inputArea.sendButton.height};
          border-radius: 0.375rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .snaptalk-send-btn:hover {
          background: \${SNAPTALK_CONFIG.config.chatMode.inputArea.sendButton.hoverBackgroundColor};
        }
        .snaptalk-hidden { display: none !important; }
        
        /* SVG иконки */
        .snaptalk-icon { width: 1em; height: 1em; fill: currentColor; }
      \`;
      document.head.appendChild(style);
    }
    
    createWidget() {
      this.container = document.createElement('div');
      this.container.className = 'snaptalk-widget';
      this.container.innerHTML = \`
        <button class="snaptalk-btn" id="snaptalk-toggle">
          <svg class="snaptalk-icon" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        
        <div class="snaptalk-greeting" id="snaptalk-greeting" style="display: none;">
          <button class="snaptalk-close-btn" id="snaptalk-close-greeting">
            <svg class="snaptalk-icon" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div class="snaptalk-greeting-bubble">
            <p class="snaptalk-greeting-text">\${SNAPTALK_CONFIG.texts.greeting}</p>
          </div>
          <button class="snaptalk-reply-btn" id="snaptalk-reply">
            \${SNAPTALK_CONFIG.texts.reply}
          </button>
        </div>
        
        <div class="snaptalk-chat" id="snaptalk-chat">
          <div class="snaptalk-header">
            <button class="snaptalk-back-btn" id="snaptalk-back">
              <svg class="snaptalk-icon" viewBox="0 0 24 24">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12,19 5,12 12,5"></polyline>
              </svg>
            </button>
            <div class="snaptalk-avatar">
              <svg class="snaptalk-icon" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <div class="snaptalk-name">\${SNAPTALK_CONFIG.texts.managerName}</div>
              <div class="snaptalk-status">\${SNAPTALK_CONFIG.texts.managerStatus}</div>
            </div>
          </div>
          
          <div class="snaptalk-messages" id="snaptalk-messages"></div>
          
          <div class="snaptalk-input-area">
            <input type="text" class="snaptalk-input" id="snaptalk-input" placeholder="\${SNAPTALK_CONFIG.texts.placeholder}">
            <button class="snaptalk-send-btn" id="snaptalk-send">
              <svg class="snaptalk-icon" viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      \`;
      
      document.body.appendChild(this.container);
      this.bindEvents();
    }
    
    bindEvents() {
      document.getElementById('snaptalk-toggle').addEventListener('click', () => this.toggleWidget());
      document.getElementById('snaptalk-close-greeting').addEventListener('click', () => this.hideGreeting());
      document.getElementById('snaptalk-reply').addEventListener('click', () => this.openChat());
      document.getElementById('snaptalk-back').addEventListener('click', () => this.closeChat());
      document.getElementById('snaptalk-send').addEventListener('click', () => this.sendMessage());
      document.getElementById('snaptalk-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
    
    connectWebSocket() {
      const wsUrl = SERVER_URL.replace('http', 'ws') + '/ws?clientId=' + CLIENT_ID;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.connected = true;
        console.log('SnapTalk: Connected to server');
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.from === 'manager') {
          this.addMessage(data.text, 'manager');
        }
      };
      
      this.ws.onclose = () => {
        this.connected = false;
        console.log('SnapTalk: Disconnected from server');
        // Переподключение через 3 секунды
        setTimeout(() => this.connectWebSocket(), 3000);
      };
    }
    
    showGreeting() {
      if (!this.isOpen) {
        document.getElementById('snaptalk-greeting').style.display = 'flex';
      }
    }
    
    hideGreeting() {
      document.getElementById('snaptalk-greeting').style.display = 'none';
    }
    
    toggleWidget() {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    }
    
    openChat() {
      this.isOpen = true;
      this.hideGreeting();
      document.getElementById('snaptalk-toggle').style.display = 'none';
      document.getElementById('snaptalk-chat').classList.add('active');
      
      // Добавляем приветственное сообщение если чат пустой
      if (this.messages.length === 0) {
        this.addMessage(SNAPTALK_CONFIG.texts.greeting, 'initial');
      }
    }
    
    closeChat() {
      this.isOpen = false;
      document.getElementById('snaptalk-chat').classList.remove('active');
      document.getElementById('snaptalk-toggle').style.display = 'flex';
    }
    
    addMessage(text, type) {
      const messagesContainer = document.getElementById('snaptalk-messages');
      const messageEl = document.createElement('div');
      
      if (type === 'user') {
        messageEl.className = 'snaptalk-message-user';
        messageEl.innerHTML = \`<div class="snaptalk-bubble">\${text}</div>\`;
      } else {
        messageEl.className = 'snaptalk-message-manager';
        messageEl.innerHTML = \`
          <div class="snaptalk-msg-avatar">
            <svg class="snaptalk-icon" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="snaptalk-bubble">\${text}</div>
        \`;
      }
      
      messagesContainer.appendChild(messageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      this.messages.push({ text, type, timestamp: Date.now() });
    }
    
    async sendMessage() {
      const input = document.getElementById('snaptalk-input');
      const text = input.value.trim();
      
      if (!text) return;
      
      input.value = '';
      this.addMessage(text, 'user');
      
      try {
        const response = await fetch(SERVER_URL + '/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: CLIENT_ID,
            text: text,
            meta: {
              url: window.location.href,
              title: document.title,
              timestamp: Date.now()
            }
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
      } catch (error) {
        console.error('SnapTalk: Failed to send message:', error);
        this.addMessage('Ошибка отправки сообщения. Попробуйте еще раз.', 'manager');
      }
    }
  }
  
  // Запускаем виджет после загрузки DOM
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

// ===== Telegram helpers =====
async function ensureTopic(clientId) {
  let topicId = await dbGetTopic(clientId);
  if (topicId) return topicId;

  if (!BOT_TOKEN || !SUPERGROUP_ID) {
    throw new Error('Telegram env vars not set (BOT_TOKEN or SUPERGROUP_ID)');
  }

  const title = `Client #${clientId}`;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/createForumTopic`;
  const { data } = await axios.post(url, {
    chat_id: SUPERGROUP_ID,
    name: title
  });
  if (!data?.ok) throw new Error('createForumTopic failed: ' + JSON.stringify(data));
  topicId = data.result.message_thread_id;

  await dbSaveTopic(clientId, topicId);
  return topicId;
}

async function sendToTopic({ clientId, text, prefix = '' }) {
  const topicId = await ensureTopic(clientId);

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const msg = `${prefix}${text}`.slice(0, 4096);
  const payload = {
    chat_id: SUPERGROUP_ID,
    message_thread_id: topicId,
    text: msg,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  const { data } = await axios.post(url, payload);
  if (!data?.ok) throw new Error('sendMessage failed: ' + JSON.stringify(data));
  return data.result;
}

// ===== API: получение виджета по ключу =====
/**
 * Возвращает готовый JavaScript код виджета для встраивания
 * GET /api/widget.js?key=API_KEY
 */
app.get('/api/widget.js', (req, res) => {
  try {
    const apiKey = req.query.key;
    
    if (!apiKey) {
      return res.status(400).type('text/plain').send('// Error: API key required');
    }

    const keyData = apiKeys.get(apiKey);
    if (!keyData) {
      return res.status(404).type('text/plain').send('// Error: Invalid API key');
    }

    // Проверка домена (если не *)
    const origin = req.get('Origin') || req.get('Referer');
    if (keyData.domain !== '*' && origin && !origin.includes(keyData.domain)) {
      return res.status(403).type('text/plain').send('// Error: Domain not allowed');
    }

    // Генерируем уникальный clientId
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const clientId = `client-${timestamp}-${random}`;

    // Получаем тексты для языка
    const texts = keyData.config.texts[keyData.language] || keyData.config.texts.ru;

    // Генерируем JavaScript код виджета
    const widgetJS = generateWidgetJS(clientId, keyData.config, texts, req.protocol + '://' + req.get('host'));

    res.type('application/javascript').send(widgetJS);
  } catch (e) {
    console.error('Widget API error:', e);
    res.status(500).type('text/plain').send('// Error: Server error');
  }
});

/**
 * API для получения конфигурации виджета (JSON)
 * GET /api/widget/config?key=API_KEY
 */
app.get('/api/widget/config', (req, res) => {
  try {
    const apiKey = req.query.key;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key required' });
    }

    const keyData = apiKeys.get(apiKey);
    if (!keyData) {
      return res.status(404).json({ error: 'Invalid API key' });
    }

    // Проверка домена
    const origin = req.get('Origin') || req.get('Referer');
    if (keyData.domain !== '*' && origin && !origin.includes(keyData.domain)) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const clientId = `client-${timestamp}-${random}`;

    res.json({
      clientId,
      config: keyData.config,
      texts: keyData.config.texts[keyData.language] || keyData.config.texts.ru,
      serverUrl: req.protocol + '://' + req.get('host')
    });
  } catch (e) {
    console.error('Config API error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== API: управление ключами =====
/**
 * Создание нового API ключа
 * POST /api/keys/create
 * body: { clientName: string, domain: string, language?: string }
 */
app.post('/api/keys/create', (req, res) => {
  try {
    const { clientName, domain, language = 'ru' } = req.body;
    
    if (!clientName || !domain) {
      return res.status(400).json({ error: 'clientName and domain required' });
    }
    
    // Генерируем уникальный ключ
    const apiKey = \`snaptalk-\${Date.now()}-\${Math.random().toString(36).substr(2, 8)}\`;
    
    // Сохраняем ключ
    apiKeys.set(apiKey, {
      clientName,
      domain,
      config: chatVisualConfig,
      language,
      created: new Date().toISOString()
    });
    
    res.json({
      apiKey,
      clientName,
      domain,
      language,
      created: new Date().toISOString(),
      embedCode: \`<script src="\${req.protocol}://\${req.get('host')}/api/widget.js?key=\${apiKey}" async></script>\`
    });
  } catch (e) {
    console.error('Create API key error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Получение информации о ключе
 * GET /api/keys/:apiKey
 */
app.get('/api/keys/:apiKey', (req, res) => {
  try {
    const { apiKey } = req.params;
    const keyData = apiKeys.get(apiKey);
    
    if (!keyData) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json({
      apiKey,
      clientName: keyData.clientName,
      domain: keyData.domain,
      language: keyData.language,
      created: keyData.created,
      embedCode: \`<script src="\${req.protocol}://\${req.get('host')}/api/widget.js?key=\${apiKey}" async></script>\`
    });
  } catch (e) {
    console.error('Get API key error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Список всех ключей (для админа)
 * GET /api/keys
 */
app.get('/api/keys', (req, res) => {
  try {
    const keys = Array.from(apiKeys.entries()).map(([key, data]) => ({
      apiKey: key,
      clientName: data.clientName,
      domain: data.domain,
      language: data.language,
      created: data.created
    }));
    
    res.json({ keys, total: keys.length });
  } catch (e) {
    console.error('List API keys error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== API: сайт -> Telegram =====
/**
 * body: { clientId: string, text: string, meta?: { utm?, ref? } }
 */
app.post('/api/chat/send', async (req, res) => {
  try {
    const { clientId, text, meta } = req.body || {};
    if (!clientId || !text) {
      return res.status(400).json({ ok: false, error: 'clientId and text required' });
    }

    const utm = meta?.utm || {};
    const ref = meta?.ref || '';
    const prefixParts = [
      `#${clientId}`,
      utm.source ? `${utm.source}` : null,
      utm.campaign ? `${utm.campaign}` : null,
      utm.term ? `${utm.term}` : null,
      ref ? `ref:${ref}` : null,
    ].filter(Boolean);
    const prefix = prefixParts.length ? `${prefixParts.join(' / ')}\n\n` : `#${clientId}\n\n`;

    console.log(`💬 Site → Telegram: "${text}" → ${clientId}`);
    await sendToTopic({ clientId, text, prefix });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// ===== Webhook: Telegram -> сайт (ответ менеджера) =====
/**
 * Путь: https://<render-app>.onrender.com/telegram/webhook/<WEBHOOK_SECRET>
 */
app.post(`/telegram/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  try {
    const update = req.body;
    const msg = update?.message;
    const text = msg?.text;
    const topicId = msg?.message_thread_id;
    const chatId = msg?.chat?.id;

    // Интересуют только сообщения в топиках нашей супергруппы
    if (!text || !topicId || chatId !== SUPERGROUP_ID) {
      return res.sendStatus(200);
    }

    // Ищем clientId по topicId
    let clientId = null;
    if (sb) {
      const { data, error } = await sb
        .from('client_topics')
        .select('client_id')
        .eq('topic_id', topicId)
        .maybeSingle();
      if (!error) clientId = data?.client_id || null;
    } else {
      for (const [cid, tid] of memoryMap.entries()) {
        if (tid === topicId) { clientId = cid; break; }
      }
    }

    if (!clientId) return res.sendStatus(200);

    console.log(`📱 Telegram → Site: "${text}" → ${clientId}`);

    // 1) Supabase Broadcast (если подключён)
    if (sb) {
      try {
        await sb.channel(`client:${clientId}`).send({
          type: 'broadcast',
          event: 'manager_message',
          payload: { from: 'manager', text, ts: Date.now() }
        });
      } catch (broadcastError) {
        console.error('❌ Supabase broadcast error:', broadcastError);
      }
    }

    // 2) WebSocket push (всегда, если есть активные подписчики)
    const payload = { from: 'manager', text, ts: Date.now() };
    pushToClient(clientId, payload);

    return res.sendStatus(200);
  } catch (e) {
    console.error('webhook error', e);
    return res.sendStatus(200);
  }
});

// ===== HTTP+WS сервер и WS-хаб =====
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// clientId -> Set<WebSocket>
const hub = new Map();

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url, 'http://localhost'); // path и query
    const clientId = url.searchParams.get('clientId');
    if (!clientId) { ws.close(1008, 'clientId required'); return; }

    let set = hub.get(clientId);
    if (!set) { set = new Set(); hub.set(clientId, set); }
    set.add(ws);

    ws.on('close', () => {
      const s = hub.get(clientId);
      if (!s) return;
      s.delete(ws);
      if (!s.size) hub.delete(clientId);
    });
  } catch {
    try { ws.close(); } catch {}
  }
});

function pushToClient(clientId, payload) {
  const set = hub.get(clientId);
  if (!set || !set.size) return;
  
  const data = JSON.stringify(payload);
  for (const ws of set) {
    try { 
      ws.send(data); 
    } catch (error) {
      console.error('❌ WebSocket send failed:', error);
    }
  }
}

// Старт
server.listen(PORT, () => {
  console.log('🚀 SnapTalk Server listening on port', PORT);
  console.log('🔧 Environment check:');
  console.log('  - BOT_TOKEN:', BOT_TOKEN ? 'SET' : 'NOT SET');
  console.log('  - SUPERGROUP_ID:', SUPERGROUP_ID || 'NOT SET');
  console.log('  - WEBHOOK_SECRET:', WEBHOOK_SECRET || 'NOT SET');
  console.log('  - SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('  - SUPABASE_SERVICE_ROLE:', SUPABASE_SERVICE_ROLE ? 'SET' : 'NOT SET');
  console.log('📡 Webhook URL: /telegram/webhook/' + WEBHOOK_SECRET);
});
