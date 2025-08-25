import express from 'express';
import { verifySupabaseToken } from '../middleware/auth.js';
import { chatVisualConfig } from '../config/chatConfig.js';
import { ClientsService, supabaseDB } from '../config/supabase.js';

const router = express.Router();

// Функция для затемнения цвета
function darkenColor(color, percent) {
  // Проверяем формат HEX
  const hex = color.replace('#', '');
  if (hex.length !== 6) return color;
  
  const num = parseInt(hex, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

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

// ===== Загрузка активных клиентов в apiKeys при старте сервера =====
// ===== Функция для обновления конкретного клиента в кэше =====
export async function updateClientInApiKeys(apiKey) {
  try {
    console.log(`🔄 Updating client ${apiKey} in apiKeys cache...`);
    
    const { data: client, error } = await supabaseDB
      .from('clients')
      .select('*')
      .eq('api_key', apiKey)
      .eq('integration_status', 'active')
      .single();

    if (error || !client) {
      console.log(`❌ Client ${apiKey} not found or inactive, removing from cache`);
      apiKeys.delete(apiKey);
      return false;
    }

    const formattedClient = ClientsService.formatClientResponse(client);
    
    // Создаем обновленную конфигурацию
    const customConfig = {
      ...chatVisualConfig,
      position: {
        ...chatVisualConfig.position,
        bottom: formattedClient.widgetPosition?.includes('bottom') ? '1.5rem' : 'auto',
        top: formattedClient.widgetPosition?.includes('top') ? '1.5rem' : 'auto',
        right: formattedClient.widgetPosition?.includes('right') ? '1.5rem' : 'auto',
        left: formattedClient.widgetPosition?.includes('left') ? '1.5rem' : 'auto'
      },
      minimizedButton: {
        ...chatVisualConfig.minimizedButton,
        backgroundColor: formattedClient.widgetColor || '#70B347',
        hoverBackgroundColor: darkenColor(formattedClient.widgetColor || '#70B347', 20)
      },
      texts: {
        ...chatVisualConfig.texts,
        [formattedClient.language || 'ru']: {
          ...chatVisualConfig.texts[formattedClient.language || 'ru'],
          managerName: formattedClient.widgetTitle || formattedClient.clientName || 'Поддержка',
          greeting: formattedClient.greetingMessage || chatVisualConfig.texts[formattedClient.language || 'ru']?.greeting || 'Здравствуйте! Как дела? Чем могу помочь?'
        }
      }
    };

    // Обновляем кэш
    const existingData = apiKeys.get(apiKey);
    const domain = existingData?.domain || '*';
    
    apiKeys.set(apiKey, {
      clientName: formattedClient.clientName,
      domain,
      config: customConfig,
      language: formattedClient.language || 'ru',
      created: formattedClient.createdAt,
      snapTalkClientId: formattedClient.id,
      managerAvatarUrl: formattedClient.managerAvatarUrl
    });

    console.log(`✅ Updated client ${formattedClient.clientName} in apiKeys cache`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating client ${apiKey} in cache:`, error);
    return false;
  }
}

export async function loadActiveClientsToApiKeys() {
  try {
    console.log('🔄 Loading active clients into apiKeys...');
    
    const { data: activeClients, error } = await supabaseDB
      .from('clients')
      .select('*')
      .eq('integration_status', 'active');

    if (error) {
      console.error('❌ Failed to load active clients:', error);
      return;
    }

    if (!activeClients || activeClients.length === 0) {
      console.log('📋 No active clients found');
      return;
    }

    for (const dbClient of activeClients) {
      const client = ClientsService.formatClientResponse(dbClient);
      
      // Создаем кастомную конфигурацию виджета
      const customConfig = {
        ...chatVisualConfig,
        position: {
          ...chatVisualConfig.position,
          bottom: client.widgetPosition?.includes('bottom') ? '1.5rem' : 'auto',
          top: client.widgetPosition?.includes('top') ? '1.5rem' : 'auto',
          right: client.widgetPosition?.includes('right') ? '1.5rem' : 'auto',
          left: client.widgetPosition?.includes('left') ? '1.5rem' : 'auto'
        },
              minimizedButton: {
        ...chatVisualConfig.minimizedButton,
        backgroundColor: client.widgetColor || '#70B347',
        hoverBackgroundColor: darkenColor(client.widgetColor || '#70B347', 20)
      },
        texts: {
          ...chatVisualConfig.texts,
          [client.language || 'ru']: {
            ...chatVisualConfig.texts[client.language || 'ru'],
            managerName: client.widgetTitle || 'Поддержка',
            greeting: client.greetingMessage || chatVisualConfig.texts[client.language || 'ru']?.greeting || 'Здравствуйте! Как дела? Чем могу помочь?'
          }
        }
      };

      try {
        const domain = client.websiteUrl ? new URL(client.websiteUrl).hostname : '*';
        apiKeys.set(client.apiKey, {
          clientName: client.clientName,
          domain,
          config: customConfig,
          language: client.language || 'ru',
          created: client.createdAt,
          snapTalkClientId: client.id,
          managerAvatarUrl: client.managerAvatarUrl
        });
      } catch (urlError) {
        apiKeys.set(client.apiKey, {
          clientName: client.clientName,
          domain: '*',
          config: customConfig,
          language: client.language || 'ru',
          created: client.createdAt,
          snapTalkClientId: client.id,
          managerAvatarUrl: client.managerAvatarUrl
        });
      }
    }

    console.log(`✅ Loaded ${activeClients.length} active clients into apiKeys`);
    console.log(`🔑 Total API keys available: ${apiKeys.size}`);
    
  } catch (error) {
    console.error('💥 Error loading active clients:', error);
  }
}

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
        backgroundColor: clientData.widgetColor || '#70B347',
        hoverBackgroundColor: darkenColor(clientData.widgetColor || '#70B347', 20)
      },
      texts: {
        ...chatVisualConfig.texts,
        [clientData.language || 'ru']: {
          ...chatVisualConfig.texts[clientData.language || 'ru'],
          managerName: clientData.widgetTitle || 'Поддержка',
          greeting: clientData.greetingMessage || newClient.greetingMessage || chatVisualConfig.texts[clientData.language || 'ru']?.greeting || 'Здравствуйте! Как дела? Чем могу помочь?'
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
        snapTalkClientId: newClient.id,
        managerAvatarUrl: clientData.managerAvatarUrl
      });
    } catch (urlError) {
      apiKeys.set(clientData.apiKey, {
        clientName: clientData.clientName,
        domain: '*',
        config: customConfig,
        language: clientData.language || 'ru',
        created: new Date().toISOString(),
        snapTalkClientId: newClient.id,
        managerAvatarUrl: clientData.managerAvatarUrl
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
          language: updatedClient.language,
          managerAvatarUrl: updatedClient.managerAvatarUrl
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

/**
 * Активация клиента - изменение статуса на 'active'
 * PUT /clients/:id/activate
 */
router.put('/clients/:id/activate', verifySupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Обновляем статус на 'active'
    const updatedClient = await ClientsService.updateClient(id, req.user.id, {
      integration_status: 'active'
    });

    // Убеждаемся что API ключ добавлен в систему виджетов
    if (!apiKeys.has(updatedClient.apiKey)) {
      // Создаем кастомную конфигурацию виджета
      const customConfig = {
        ...chatVisualConfig,
        position: {
          ...chatVisualConfig.position,
          bottom: updatedClient.widgetPosition?.includes('bottom') ? '1.5rem' : 'auto',
          top: updatedClient.widgetPosition?.includes('top') ? '1.5rem' : 'auto',
          right: updatedClient.widgetPosition?.includes('right') ? '1.5rem' : 'auto',
          left: updatedClient.widgetPosition?.includes('left') ? '1.5rem' : 'auto'
        },
        minimizedButton: {
          ...chatVisualConfig.minimizedButton,
          backgroundColor: updatedClient.widgetColor || '#70B347'
        },
        texts: {
          ...chatVisualConfig.texts,
          [updatedClient.language || 'ru']: {
            ...chatVisualConfig.texts[updatedClient.language || 'ru'],
            managerName: updatedClient.widgetTitle || 'Поддержка',
            greeting: updatedClient.greetingMessage || chatVisualConfig.texts[updatedClient.language || 'ru']?.greeting || 'Здравствуйте! Как дела? Чем могу помочь?'
          }
        }
      };

      const domain = updatedClient.websiteUrl ? new URL(updatedClient.websiteUrl).hostname : '*';
      apiKeys.set(updatedClient.apiKey, {
        clientName: updatedClient.clientName,
        domain,
        config: customConfig,
        language: updatedClient.language || 'ru',
        created: new Date().toISOString(),
        snapTalkClientId: updatedClient.id,
        managerAvatarUrl: updatedClient.managerAvatarUrl
      });
    }

    console.log(`✅ SnapTalk client activated: ${updatedClient.clientName} (${id})`);

    res.json({
      success: true,
      data: {
        ...updatedClient,
        embedCode: `<script src="${req.protocol}://${req.get('host')}/api/widget.js?key=${updatedClient.apiKey}" async></script>`
      }
    });

  } catch (error) {
    console.error('Activate client error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

/**
 * Деактивация клиента - изменение статуса на 'inactive'  
 * PUT /clients/:id/deactivate
 */
router.put('/clients/:id/deactivate', verifySupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Получаем клиента чтобы удалить API ключ
    const client = await ClientsService.getClientById(id, req.user.id);
    
    // Обновляем статус на 'inactive'
    const updatedClient = await ClientsService.updateClient(id, req.user.id, {
      integration_status: 'inactive'
    });

    // Удаляем API ключ из системы виджетов
    apiKeys.delete(client.apiKey);

    console.log(`❌ SnapTalk client deactivated: ${updatedClient.clientName} (${id})`);

    res.json({
      success: true,
      data: updatedClient
    });

  } catch (error) {
    console.error('Deactivate client error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

export default router;
