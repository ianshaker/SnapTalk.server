import express from 'express';
import { verifySupabaseToken } from '../middleware/auth.js';
import { chatVisualConfig } from '../config/chatConfig.js';
import { ClientsService } from '../config/supabase.js';

const router = express.Router();

// ===== API ключи для виджетов =====
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
    const clientData = req.body;

    // Валидация обязательных полей
    if (!clientData.clientName || !clientData.email || !clientData.apiKey) {
      return res.status(400).json({ 
        success: false,
        error: 'Required fields: clientName, email, apiKey' 
      });
    }

    // Проверяем уникальность API ключа
    if (apiKeys.has(clientData.apiKey)) {
      return res.status(409).json({ 
        success: false,
        error: 'API key already exists' 
      });
    }

    // Создаем клиента в Supabase
    const newClient = await ClientsService.createClient(req.user, clientData);
    
    // Создаем кастомную конфигурацию виджета
    const customConfig = {
      ...chatVisualConfig,
      position: {
        ...chatVisualConfig.position,
        bottom: clientData.widgetPosition?.includes('bottom') ? '1.5rem' : 'auto',
        top: clientData.widgetPosition?.includes('top') ? '1.5rem' : 'auto',
        right: clientData.widgetPosition?.includes('right') ? '1.5rem' : 'auto',
        left: clientData.widgetPosition?.includes('left') ? '1.5rem' : 'auto'
      },
      minimizedButton: {
        ...chatVisualConfig.minimizedButton,
        backgroundColor: clientData.widgetColor || '#70B347'
      },
      texts: {
        ...chatVisualConfig.texts,
        [clientData.language || 'ru']: {
          ...chatVisualConfig.texts[clientData.language || 'ru'],
          managerName: clientData.widgetTitle || 'Поддержка'
        }
      }
    };

    // Добавляем API ключ в систему виджетов
    try {
      const domain = clientData.websiteUrl ? new URL(clientData.websiteUrl).hostname : '*';
      apiKeys.set(clientData.apiKey, {
        clientName: clientData.clientName,
        domain,
        config: customConfig,
        language: clientData.language || 'ru',
        created: new Date().toISOString(),
        snapTalkClientId: newClient.id
      });
    } catch (urlError) {
      apiKeys.set(clientData.apiKey, {
        clientName: clientData.clientName,
        domain: '*',
        config: customConfig,
        language: clientData.language || 'ru',
        created: new Date().toISOString(),
        snapTalkClientId: newClient.id
      });
    }

    console.log(`🎯 SnapTalk client created in Supabase: ${newClient.clientName} (${newClient.id})`);

    // Возвращаем данные клиента с embed кодом
    res.json({
      success: true,
      data: {
        ...newClient,
        embedCode: `<script src="${req.protocol}://${req.get('host')}/api/widget.js?key=${newClient.apiKey}" async></script>`
      }
    });

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

/**
 * Получение списка клиентов пользователя
 * GET /clients
 */
router.get('/clients', verifySupabaseToken, async (req, res) => {
  try {
    // Получаем клиентов из Supabase
    const userClients = await ClientsService.getClientsByUser(req.user.id);

    // Добавляем embed код к каждому клиенту
    const clientsWithEmbedCode = userClients.map(client => ({
      ...client,
      embedCode: `<script src="${req.protocol}://${req.get('host')}/api/widget.js?key=${client.apiKey}" async></script>`
    }));

    console.log(`📋 Retrieved ${clientsWithEmbedCode.length} clients for user ${req.user.email}`);

    res.json({
      success: true,
      data: clientsWithEmbedCode,
      total: clientsWithEmbedCode.length
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

/**
 * Получение данных конкретного клиента
 * GET /clients/:id
 */
router.get('/clients/:id', verifySupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Получаем клиента из Supabase
    const client = await ClientsService.getClientById(id, req.user.id);

    res.json({
      success: true,
      data: client
    });

  } catch (error) {
    console.error('Get client error:', error);
    
    if (error.message === 'Client not found') {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

/**
 * Обновление данных клиента
 * PUT /clients/:id
 */
router.put('/clients/:id', verifySupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Обновляем клиента в Supabase
    const updatedClient = await ClientsService.updateClient(id, req.user.id, updates);

    // Обновляем API ключ если изменились настройки виджета
    if (updates.widgetColor || updates.widgetPosition || updates.language) {
      const apiKeyData = apiKeys.get(updatedClient.apiKey);
      if (apiKeyData) {
        const customConfig = {
          ...apiKeyData.config,
          position: {
            ...apiKeyData.config.position,
            bottom: updatedClient.widgetPosition?.includes('bottom') ? '1.5rem' : 'auto',
            top: updatedClient.widgetPosition?.includes('top') ? '1.5rem' : 'auto',
            right: updatedClient.widgetPosition?.includes('right') ? '1.5rem' : 'auto',
            left: updatedClient.widgetPosition?.includes('left') ? '1.5rem' : 'auto'
          },
          minimizedButton: {
            ...apiKeyData.config.minimizedButton,
            backgroundColor: updatedClient.widgetColor
          }
        };
        
        apiKeys.set(updatedClient.apiKey, {
          ...apiKeyData,
          config: customConfig,
          language: updatedClient.language
        });
      }
    }

    console.log(`📝 SnapTalk client updated in Supabase: ${updatedClient.clientName} (${id})`);

    res.json({
      success: true,
      data: updatedClient
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

/**
 * Удаление клиента
 * DELETE /clients/:id
 */
router.delete('/clients/:id', verifySupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Сначала получаем клиента чтобы удалить API ключ
    const client = await ClientsService.getClientById(id, req.user.id);
    
    // Удаляем клиента из Supabase
    await ClientsService.deleteClient(id, req.user.id);
    
    // Удаляем связанный API ключ
    apiKeys.delete(client.apiKey);

    console.log(`🗑️ SnapTalk client deleted from Supabase: ${client.clientName} (${id})`);

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    
    if (error.message === 'Client not found') {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

export default router;
