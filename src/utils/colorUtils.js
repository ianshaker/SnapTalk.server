// ===== Утилиты для работы с цветами виджета =====

/**
 * Создает CSS градиент из двух цветов
 * @param {string} primaryColor - Основной цвет (hex)
 * @param {string} secondaryColor - Вторичный цвет (hex), опционально
 * @returns {string} CSS градиент или одиночный цвет
 */
export function createGradient(primaryColor, secondaryColor) {
  if (!primaryColor) return '#70B347'; // fallback
  
  if (!secondaryColor) {
    return primaryColor; // только основной цвет
  }
  
  return `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
}

/**
 * Затемняет цвет на указанный процент
 * @param {string} color - Hex цвет
 * @param {number} percent - Процент затемнения (0-100)
 * @returns {string} Затемненный hex цвет
 */
export function darkenColor(color, percent) {
  if (!color || !color.startsWith('#')) return color;
  
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

/**
 * Проверяет валидность hex цвета
 * @param {string} color - Hex цвет
 * @returns {boolean} true если валидный
 */
export function isValidHexColor(color) {
  if (!color || typeof color !== 'string') return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Создает hover эффект для градиента
 * @param {string} primaryColor - Основной цвет
 * @param {string} secondaryColor - Вторичный цвет
 * @returns {string} CSS градиент для hover состояния
 */
export function createHoverGradient(primaryColor, secondaryColor) {
  if (!secondaryColor) {
    return darkenColor(primaryColor, 15);
  }
  
  const darkerPrimary = darkenColor(primaryColor, 10);
  const darkerSecondary = darkenColor(secondaryColor, 10);
  
  return `linear-gradient(135deg, ${darkerPrimary} 0%, ${darkerSecondary} 100%)`;
}

/**
 * Создает конфигурацию цветов для виджета
 * @param {string} primaryColor - Основной цвет
 * @param {string} secondaryColor - Вторичный цвет (опционально)
 * @returns {object} Объект с конфигурацией цветов
 */
export function createWidgetColorConfig(primaryColor, secondaryColor) {
  const primary = primaryColor || '#70B347';
  const secondary = secondaryColor || '#A3D977';
  
  return {
    primary: primary,
    secondary: secondary,
    gradient: createGradient(primary, secondary),
    hoverGradient: createHoverGradient(primary, secondary),
    darkened: darkenColor(primary, 20)
  };
}
