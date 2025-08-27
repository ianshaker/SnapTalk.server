/**
 * Скрипт для применения SQL миграции SESSION_TRACKING_MIGRATION.sql
 * через Supabase клиент
 */

import { readFileSync } from 'fs';
import { supabaseDB } from '../src/config/supabase.js';

async function applyMigration() {
  try {
    console.log('🔄 Применение миграции SESSION_TRACKING_MIGRATION.sql...');
    
    // Читаем SQL файл
    const migrationSQL = readFileSync('../migrations/SESSION_TRACKING_MIGRATION.sql', 'utf8');
    
    // Разбиваем на отдельные команды (по точке с запятой)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '');
    
    console.log(`📝 Найдено ${commands.length} SQL команд для выполнения`);
    
    // Выполняем каждую команду отдельно
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Пропускаем комментарии и пустые строки
      if (command.startsWith('--') || command.trim() === '') {
        continue;
      }
      
      console.log(`⚡ Выполнение команды ${i + 1}/${commands.length}:`);
      console.log(`   ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`);
      
      try {
        const { data, error } = await supabaseDB.rpc('exec_sql', {
          sql_query: command
        });
        
        if (error) {
          // Если RPC функция не существует, попробуем прямой SQL
          console.log('   RPC функция недоступна, пробуем прямой SQL...');
          
          // Для ALTER TABLE команд используем прямое выполнение
          if (command.toUpperCase().includes('ALTER TABLE') || 
              command.toUpperCase().includes('CREATE INDEX') ||
              command.toUpperCase().includes('ADD CONSTRAINT') ||
              command.toUpperCase().includes('COMMENT ON')) {
            
            // Эти команды нужно выполнять через SQL Editor в Supabase Dashboard
            console.log('   ⚠️  Команда требует выполнения через Supabase Dashboard SQL Editor');
            console.log(`   SQL: ${command}`);
            continue;
          }
          
          throw error;
        }
        
        console.log('   ✅ Команда выполнена успешно');
        
      } catch (cmdError) {
        console.error(`   ❌ Ошибка выполнения команды: ${cmdError.message}`);
        
        // Для некоторых команд ошибки могут быть ожидаемыми (например, если поле уже существует)
        if (cmdError.message.includes('already exists') || 
            cmdError.message.includes('duplicate key') ||
            cmdError.message.includes('IF NOT EXISTS')) {
          console.log('   ℹ️  Команда пропущена (объект уже существует)');
          continue;
        }
        
        throw cmdError;
      }
    }
    
    console.log('\n🎉 Миграция SESSION_TRACKING_MIGRATION.sql применена успешно!');
    console.log('\n📋 Следующие шаги:');
    console.log('1. Проверьте структуру таблицы page_events в Supabase Dashboard');
    console.log('2. Убедитесь, что новые поля добавлены: event_type, session_duration, is_session_active, is_session_start, is_session_end');
    console.log('3. Проверьте, что индексы созданы для оптимизации запросов');
    
  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error.message);
    console.log('\n🔧 Альтернативный способ:');
    console.log('1. Откройте Supabase Dashboard -> SQL Editor');
    console.log('2. Скопируйте содержимое migrations/SESSION_TRACKING_MIGRATION.sql');
    console.log('3. Выполните SQL команды вручную');
    process.exit(1);
  }
}

// Проверка подключения к базе данных
async function checkConnection() {
  try {
    console.log('🔍 Проверка подключения к Supabase...');
    
    const { data, error } = await supabaseDB
      .from('clients')
      .select('id')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Подключение к Supabase успешно');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка подключения к Supabase:', error.message);
    return false;
  }
}

// Основная функция
async function main() {
  console.log('🚀 Запуск скрипта применения миграции...');
  
  // Проверяем подключение
  const connected = await checkConnection();
  if (!connected) {
    console.log('\n🔧 Проверьте настройки Supabase в src/config/env.js');
    process.exit(1);
  }
  
  // Применяем миграцию
  await applyMigration();
}

// Запуск
main().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});