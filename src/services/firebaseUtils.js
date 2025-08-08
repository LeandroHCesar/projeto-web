// Configurações reais do projeto gerenciadordaytrade

const firebaseConfig = {
  apiKey: "AIzaSyARijMB4vQg12_xHE6IxRZ9qqSbW12b9cU",
  authDomain: "gerenciadordaytrade.firebaseapp.com",
  projectId: "gerenciadordaytrade",
  storageBucket: "gerenciadordaytrade.firebasestorage.app",
  messagingSenderId: "803094795026",
  appId: "1:803094795026:web:a7fc715f7b3a29c66819cb",
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar serviços
export const db = firebase.firestore();
export const auth = firebase.auth();

// Função para gerar ID único do usuário (simulação)
function generateUserId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Função para obter ou criar ID do usuário
export function getUserId() {
  let userId = localStorage.getItem("dayTradeUserId");
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem("dayTradeUserId", userId);
  }
  return userId;
}

// Função para formatar moeda brasileira
export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Função para formatar data brasileira
export function formatDate(date) {
  // Corrigir problema de fuso horário adicionando 1 dia
  const dataCorrigida = new Date(date);
  dataCorrigida.setDate(dataCorrigida.getDate() + 1);
  return new Intl.DateTimeFormat("pt-BR").format(dataCorrigida);
}

// Função para validar se um valor é numérico
export function isValidNumber(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

// Função para mostrar notificação
export function showNotification(message, type = "info") {
  // Criar elemento de notificação
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Estilos da notificação
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;

  // Cores baseadas no tipo
  const colors = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#4a9eff",
  };

  notification.style.backgroundColor = colors[type] || colors.info;

  // Adicionar ao DOM
  document.body.appendChild(notification);

  // Remover após 5 segundos
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-in";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Adicionar estilos CSS para animações das notificações
const notificationStyles = document.createElement("style");
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Exportar funções para uso global
window.firebaseUtils = {
  db,
  auth,
  getUserId,
  formatCurrency,
  formatDate,
  isValidNumber,
  showNotification,
};
