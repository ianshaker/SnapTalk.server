import express from 'express';
import { verifySupabaseToken } from '../middleware/auth.js';
import { chatVisualConfig } from '../config/chatConfig.js';

const router = express.Router();

// ===== Хранилище клиентов SnapTalk =====
export const snapTalkClients = new Map(); // В production использовать Supabase или БД
export const apiKeys = new Map([
  // Демонстрационный ключ
  ['demo-snaptalk-2025', {
    clientName: 'Demo Client',
    domain: '*', // любой домен для демо
    config: chatVisualConfig,
    language: 'ru',
    created: new Date().toISOString()
  }]
]);

/**
 * Создание нового клиента из фронтенда SnapTalk
 * POST /clients/create
 */
router.post('/clients/create', verifySupabaseToken, async (req, res) => {
  try {
    const {
      // Основная информация
      clientName,
      companyName,
      email,
      phone,
      position,
      
      // Веб интеграция
      websiteUrl,
      apiKey,
      widgetPosition = 'bottom-right',
      widgetColor = '#70B347',
      widgetTitle = 'Поддержка',
      
      // Telegram интеграция
      telegramBotToken,
      telegramGroupId,
      telegramBotName,
      
      // Настройки сервиса
      operatorsCount,
      tariffPlan,
      timezone = 'Europe/Moscow',
      language = 'ru',
      autoResponses = true,
      workingHoursEnabled = false,
      offlineMessage,
      emailNotifications,
      comments,
      integrationStatus = 'pending'
    } = req.body;

    // Валидация обязательных полей
    if (!clientName || !email || !apiKey) {
      return res.status(400).json({ 
        error: 'Required fields: clientName, email, apiKey' 
      });
    }

    // Проверяем уникальность API ключа
    if (snapTalkClients.has(apiKey) || apiKeys.has(apiKey)) {
      return res.status(409).json({ 
        error: 'API key already exists' 
      });
    }

    // Создаем ID клиента
    const clientId = `snaptalk_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    // Создаем кастомную конфигурацию виджета на основе настроек клиента
    const customConfig = {
      ...chatVisualConfig,
      // Применяем кастомизацию
      position: {
        ...chatVisualConfig.position,
        bottom: widgetPosition.includes('bottom') ? '1.5rem' : 'auto',
        top: widgetPosition.includes('top') ? '1.5rem' : 'auto',
        right: widgetPosition.includes('right') ? '1.5rem' : 'auto',
        left: widgetPosition.includes('left') ? '1.5rem' : 'auto'
      },
      minimizedButton: {
        ...chatVisualConfig.minimizedButton,
        backgroundColor: widgetColor
      },
      texts: {
        ...chatVisualConfig.texts,
        [language]: {
          ...chatVisualConfig.texts[language],
          managerName: widgetTitle || 'Поддержка'
        }
      }
    };

    // Данные клиента для хранения
    const clientData = {
      id: clientId,
      supabaseUserId: req.user.id,
      
      // Основная информация
      clientName,
      companyName,
      email,
      phone,
      position,
      
      // Веб интеграция
      websiteUrl,
      apiKey,
      widgetPosition,
      widgetColor,
      widgetTitle,
      
      // Telegram интеграция
      telegramBotToken,
      telegramGroupId,
      telegramBotName,
      
      // Настройки сервиса
      operatorsCount,
      tariffPlan,
      timezone,
      language,
      autoResponses,
      workingHoursEnabled,
      offlineMessage,
      emailNotifications,
      comments,
      integrationStatus,
      
      // Метаданные
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Сохраняем клиента
    snapTalkClients.set(clientId, clientData);
    
    // Добавляем API ключ в систему виджетов
    try {
      const domain = websiteUrl ? new URL(websiteUrl).hostname : '*';
      apiKeys.set(apiKey, {
        clientName,
        domain,
        config: customConfig,
        language,
        created: new Date().toISOString(),
        snapTalkClientId: clientId
      });
    } catch (urlError) {
      // Если URL некорректный, используем '*'
      apiKeys.set(apiKey, {
        clientName,
        domain: '*',
        config: customConfig,
        language,
        created: new Date().toISOString(),
        snapTalkClientId: clientId
      });
    }

    console.log(`🎯 SnapTalk client created: ${clientName} (${clientId})`);

    // Возвращаем данные клиента
    res.json({
      success: true,
      client: {
        id: clientId,
        clientName,
        companyName,
        email,
        apiKey,
        integrationStatus,
        embedCode: `<script src="${req.protocol}://${req.get('host')}/api/widget.js?key=${apiKey}" async></script>`,
        createdAt: clientData.createdAt
      }
    });

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Получение списка клиентов пользователя
 * GET /clients
 */
router.get('/clients', verifySupabaseToken, async (req, res) => {
  try {
    const userClients = Array.from(snapTalkClients.values())
      .filter(client => client.supabaseUserId === req.user.id)
      .map(client => ({
        id: client.id,
        clientName: client.clientName,
        companyName: client.companyName,
        email: client.email,
        websiteUrl: client.websiteUrl,
        apiKey: client.apiKey,
        integrationStatus: client.integrationStatus,
        language: client.language,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      }));

    res.json({
      clients: userClients,
      total: userClients.length
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Получение данных конкретного клиента
 * GET /clients/:id
 */
router.get('/clients/:id', verifySupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = snapTalkClients.get(id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Проверяем принадлежность клиента пользователю
    if (client.supabaseUserId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ client });

  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Обновление данных клиента
 * PUT /clients/:id
 */
router.put('/clients/:id', verifySupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = snapTalkClients.get(id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Проверяем принадлежность клиента пользователю
    if (client.supabaseUserId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Обновляем данные
    const updatedClient = {
      ...client,
      ...req.body,
      id, // Защищаем от изменения ID
      supabaseUserId: client.supabaseUserId, // Защищаем от изменения владельца
      updatedAt: new Date().toISOString()
    };

    snapTalkClients.set(id, updatedClient);

    // Обновляем API ключ если изменились настройки виджета
    if (req.body.widgetColor || req.body.widgetPosition || req.body.language) {
      const apiKeyData = apiKeys.get(client.apiKey);
      if (apiKeyData) {
        const customConfig = {
          ...apiKeyData.config,
          position: {
            ...apiKeyData.config.position,
            bottom: updatedClient.widgetPosition.includes('bottom') ? '1.5rem' : 'auto',
            top: updatedClient.widgetPosition.includes('top') ? '1.5rem' : 'auto',
            right: updatedClient.widgetPosition.includes('right') ? '1.5rem' : 'auto',
            left: updatedClient.widgetPosition.includes('left') ? '1.5rem' : 'auto'
          },
          minimizedButton: {
            ...apiKeyData.config.minimizedButton,
            backgroundColor: updatedClient.widgetColor
          }
        };
        
        apiKeys.set(client.apiKey, {
          ...apiKeyData,
          config: customConfig,
          language: updatedClient.language
        });
      }
    }

    console.log(`📝 SnapTalk client updated: ${updatedClient.clientName} (${id})`);

    res.json({
      success: true,
      client: updatedClient
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Удаление клиента
 * DELETE /clients/:id
 */
router.delete('/clients/:id', verifySupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = snapTalkClients.get(id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Проверяем принадлежность клиента пользователю
    if (client.supabaseUserId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Удаляем клиента и связанный API ключ
    snapTalkClients.delete(id);
    apiKeys.delete(client.apiKey);

    console.log(`🗑️ SnapTalk client deleted: ${client.clientName} (${id})`);

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
