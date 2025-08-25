import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE } from './env.js';

// Supabase конфигурация для операций с БД
const supabaseUrl = SUPABASE_URL;
const supabaseServiceKey = SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kenNzd2x3ZWJ4cnhwcnhybmFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyMjM2MCwiZXhwIjoyMDcxNjk4MzYwfQ.example_service_role_key';

console.log('🔧 Supabase config:', { 
  url: supabaseUrl, 
  hasServiceKey: !!supabaseServiceKey,
  keyPrefix: supabaseServiceKey?.substring(0, 20) + '...'
});

// Клиент для операций с таблицей clients
export const supabaseDB = createClient(supabaseUrl, supabaseServiceKey);

// Утилиты для работы с клиентами
export class ClientsService {
  
  // Создать нового клиента
  static async createClient(userData, clientData) {
    const { data, error } = await supabaseDB
      .from('clients')
      .insert({
        user_id: userData.id,
        client_name: clientData.clientName,
        email: clientData.email,
        api_key: clientData.apiKey,
        company_name: clientData.companyName,
        phone: clientData.phone,
        position: clientData.position,
        website_url: clientData.websiteUrl,
        timezone: clientData.timezone || 'Europe/Moscow',
        integration_status: clientData.integrationStatus || 'pending',
        widget_position: clientData.widgetPosition || 'bottom-right',
        widget_color: clientData.widgetColor || '#70B347',
        widget_title: clientData.widgetTitle || 'Поддержка',
        language: clientData.language || 'ru',
        telegram_bot_token: clientData.telegramBotToken,
        telegram_group_id: clientData.telegramGroupId,
        telegram_bot_name: clientData.telegramBotName,
        operators_count: clientData.operatorsCount,
        tariff_plan: clientData.tariffPlan,
        auto_responses: clientData.autoResponses,
        working_hours_enabled: clientData.workingHoursEnabled,
        offline_message: clientData.offlineMessage || 'Мы сейчас не в сети. Оставьте сообщение, и мы обязательно вам ответим!',
        email_notifications: clientData.emailNotifications,
        comments: clientData.comments
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create client: ${error.message}`);
    }

    return this.formatClientResponse(data);
  }

  // Получить список клиентов пользователя
  static async getClientsByUser(userId) {
    const { data, error } = await supabaseDB
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch clients: ${error.message}`);
    }

    return (data || []).map(client => this.formatClientResponse(client));
  }

  // Получить клиента по ID
  static async getClientById(clientId, userId) {
    const { data, error } = await supabaseDB
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Client not found');
      }
      throw new Error(`Failed to fetch client: ${error.message}`);
    }

    return this.formatClientResponse(data);
  }

  // Обновить клиента
  static async updateClient(clientId, userId, updates) {
    const { data, error } = await supabaseDB
      .from('clients')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update client: ${error.message}`);
    }

    return this.formatClientResponse(data);
  }

  // Удалить клиента
  static async deleteClient(clientId, userId) {
    const { error } = await supabaseDB
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete client: ${error.message}`);
    }

    return { success: true };
  }

  // Форматирование ответа: snake_case -> camelCase
  static formatClientResponse(dbClient) {
    return {
      id: dbClient.id,
      clientName: dbClient.client_name,
      companyName: dbClient.company_name,
      email: dbClient.email,
      phone: dbClient.phone,
      position: dbClient.position,
      websiteUrl: dbClient.website_url,
      apiKey: dbClient.api_key,
      integrationStatus: dbClient.integration_status,
      language: dbClient.language,
      widgetPosition: dbClient.widget_position,
      widgetColor: dbClient.widget_color,
      widgetColorSecondary: dbClient.widget_color_secondary,
      widgetTitle: dbClient.widget_title,
      timezone: dbClient.timezone,
      telegramBotToken: dbClient.telegram_bot_token,
      telegramGroupId: dbClient.telegram_group_id,
      telegramBotName: dbClient.telegram_bot_name,
      operatorsCount: dbClient.operators_count,
      tariffPlan: dbClient.tariff_plan,
      autoResponses: dbClient.auto_responses,
      workingHoursEnabled: dbClient.working_hours_enabled,
      offlineMessage: dbClient.offline_message,
      emailNotifications: dbClient.email_notifications,
      managerAvatarUrl: dbClient.manager_avatar_url,
      greetingMessage: dbClient.greeting_message,
      comments: dbClient.comments,
      createdAt: dbClient.created_at,
      updatedAt: dbClient.updated_at
    };
  }
}
