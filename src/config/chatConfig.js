// ===== Конфигурация визуала чата =====
export const chatVisualConfig = {
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
