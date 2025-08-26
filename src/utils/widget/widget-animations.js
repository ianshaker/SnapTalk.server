// ===== CSS Анимации для виджета SnapTalk =====

export function generateWidgetAnimations() {
  return `
    /* ===== SNAPTALK WIDGET ANIMATIONS ===== */
    
    @keyframes snaptalk-smooth-show {
      0% {
        opacity: 0;
        transform: scale(0.95);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes snaptalk-elegant-slide-in {
      0% {
        opacity: 0;
        transform: translateX(100%) scale(0.8);
        filter: blur(5px);
      }
      100% {
        opacity: 1;
        transform: translateX(0) scale(1);
        filter: blur(0);
      }
    }
    
    @keyframes snaptalk-elegant-bounce {
      0% {
        opacity: 0;
        transform: scale(0.3) translateY(100%);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.05) translateY(-10%);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    @keyframes snaptalk-bubble-in {
      0% {
        opacity: 0;
        transform: scale(0.8) translateY(20px);
        filter: blur(5px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
        filter: blur(0);
      }
    }
    
    @keyframes snaptalk-bounce-in {
      0% {
        opacity: 0;
        transform: scale(0.3);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.05);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes snaptalk-slide-up {
      0% {
        opacity: 0;
        transform: translateY(30px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes snaptalk-fade-in-up {
      0% {
        opacity: 0;
        transform: translateY(20px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes snaptalk-typing {
      0%, 80%, 100% { 
        transform: scale(0.8); 
        opacity: 0.4; 
      }
      40% { 
        transform: scale(1.2); 
        opacity: 1; 
      }
    }
    
    @keyframes blink {
      0%, 50% { 
        opacity: 1; 
      }
      51%, 100% { 
        opacity: 0; 
      }
    }
    
    @keyframes snaptalk-pulse {
      0% { 
        opacity: 0.6;
        transform: scale(1);
      }
      50% { 
        opacity: 1;
        transform: scale(1.2);
      }
      100% { 
        opacity: 0.6;
        transform: scale(1);
      }
    }
  `;
}
