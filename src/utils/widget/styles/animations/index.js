// ===== Анимации виджета =====

export function generateAnimations() {
  return `
    /* ===== KEYFRAME ANIMATIONS ===== */
    
    @keyframes snaptalk-elegant-entrance {
      0% { 
        opacity: 0; 
        transform: translateY(20px) scale(0.8);
        filter: blur(10px);
      }
      50% { 
        opacity: 0.8; 
        transform: translateY(-5px) scale(1.05);
        filter: blur(2px);
      }
      100% { 
        opacity: 1; 
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }
    
    @keyframes snaptalk-elegant-slide-in {
      0% { 
        opacity: 0; 
        transform: translateX(50px) translateY(20px) scale(0.9);
        filter: blur(8px);
      }
      100% { 
        opacity: 1; 
        transform: translateX(0) translateY(0) scale(1);
        filter: blur(0);
      }
    }
    
    @keyframes snaptalk-elegant-bounce {
      0% { 
        opacity: 0; 
        transform: scale(0.3) translateY(20px);
      }
      50% { 
        opacity: 0.8; 
        transform: scale(1.1) translateY(-5px);
      }
      70% { 
        opacity: 0.9; 
        transform: scale(0.95) translateY(2px);
      }
      100% { 
        opacity: 1; 
        transform: scale(1) translateY(0);
      }
    }
    
    @keyframes snaptalk-bubble-in {
      0% { 
        opacity: 0; 
        transform: scale(0.8) translateY(10px);
        filter: blur(4px);
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
        opacity: 1; 
        transform: scale(1.05);
      }
      70% { 
        transform: scale(0.9);
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
