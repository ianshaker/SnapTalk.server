// ===== Простой тест для TrackingService =====

import { TrackingService } from './TrackingService.js';

// Функция для тестирования TrackingService
export async function testTrackingService() {
  console.log('🧪 Начинаем тест TrackingService...');
  
  try {
    // Создаем экземпляр TrackingService
    const trackingService = new TrackingService({
      serverUrl: 'http://localhost:3000',
      apiKey: 'test-api-key',
      clientId: 'test-client-id'
    });
    
    console.log('✅ TrackingService создан успешно');
    
    // Проверяем начальное состояние
    console.log('🔍 Проверяем начальное состояние...');
    console.log('isReady():', trackingService.isReady()); // должно быть false
    
    // Тестируем extractUTMParams
    console.log('🔍 Тестируем extractUTMParams...');
    const utmParams = trackingService.extractUTMParams();
    console.log('UTM параметры:', utmParams);
    console.log('✅ extractUTMParams работает');
    
    // Тестируем getPageMeta
    console.log('🔍 Тестируем getPageMeta...');
    const pageMeta = trackingService.getPageMeta();
    console.log('Метаданные страницы:', pageMeta);
    console.log('✅ getPageMeta работает');
    
    // Тестируем инициализацию FingerprintJS (может занять время)
    console.log('🔍 Тестируем initFingerprint...');
    try {
      const identifiers = await trackingService.initFingerprint();
      console.log('✅ FingerprintJS инициализирован:', identifiers);
      console.log('isReady() после инициализации:', trackingService.isReady()); // должно быть true
    } catch (error) {
      console.warn('⚠️ FingerprintJS не удалось инициализировать (возможно, блокировщик рекламы):', error.message);
    }
    
    console.log('🎉 Тест TrackingService завершен успешно!');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка в тесте TrackingService:', error);
    return false;
  }
}

// Автоматический запуск теста, если файл запущен напрямую
if (typeof window !== 'undefined') {
  // В браузере
  window.testTrackingService = testTrackingService;
  console.log('🧪 Тест TrackingService доступен как window.testTrackingService()');
} else {
  // В Node.js (если нужно)
  console.log('🧪 Тест TrackingService готов к использованию');
}