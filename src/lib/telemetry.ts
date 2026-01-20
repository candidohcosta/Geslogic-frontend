// src/lib/telemetry.ts

// Armazena os últimos 5 URLs visitados
const routeHistory: string[] = [];
// Armazena os últimos 5 erros de consola
const errorLog: string[] = [];

export const TelemetryService = {
  // Chamado quando a rota muda
  trackRoute: (path: string) => {
    // Evitar duplicados consecutivos
    if (routeHistory[routeHistory.length - 1] !== path) {
      routeHistory.push(path);
      if (routeHistory.length > 10) routeHistory.shift(); // Mantém apenas os últimos 10
    }
  },

  // Obtém o URL "interessante" (o último que não seja a página de suporte atual)
  getPreviousRoute: () => {
    // Filtra rotas de suporte para encontrar onde o utilizador estava a trabalhar
    const relevantRoutes = routeHistory.filter(r => !r.includes('/support'));
    // Retorna o último, ou o atual se não houver histórico
    return relevantRoutes[relevantRoutes.length - 1] || window.location.href;
  },

  getFullHistory: () => [...routeHistory].reverse(),

  // Inicia a interceção de erros (chamar no main.tsx)
  initErrorCapture: () => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Guarda o erro no nosso log
      const errorMessage = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ');
      errorLog.push(`[${new Date().toLocaleTimeString()}] ${errorMessage}`);
      if (errorLog.length > 10) errorLog.shift();
      
      // Chama o console.error original para não esconder do developer
      originalConsoleError.apply(console, args);
    };

    // Captura erros globais não tratados (crashes de React)
    window.addEventListener('error', (event) => {
      errorLog.push(`[CRASH] ${event.message} at ${event.filename}:${event.lineno}`);
      if (errorLog.length > 10) errorLog.shift();
    });
  },

  getLastErrors: () => [...errorLog],
};