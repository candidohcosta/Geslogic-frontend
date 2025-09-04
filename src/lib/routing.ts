// src/lib/routing.ts

/**
 * @description Analisa o hostname para extrair o slug da empresa de um subdomínio.
 * Ex: 'empresa-a.geslogic.local' -> 'empresa-a'
 * Ex: 'geslogic.local' -> null
 * Ex: 'www.geslogic.local' -> null
 * @param hostname O hostname atual (ex: window.location.hostname).
 * @returns O slug da empresa ou null se for o domínio principal.
 */
export const getCompanySlugFromHostname = (hostname: string): string | null => {
  // Define o teu domínio principal. Usar uma variável de ambiente é o ideal.
  const mainDomain = process.env.REACT_APP_MAIN_DOMAIN || 'geslogic.local';
  
  // Se o hostname for igual ao domínio principal, não há subdomínio.
  if (hostname === mainDomain) {
    return null;
  }
  
  // Remove o domínio principal do hostname.
  // Ex: 'empresa-a.geslogic.local'.replace('.geslogic.local', '') -> 'empresa-a'
  const slug = hostname.replace(`.${mainDomain}`, '');
  
  // Uma salvaguarda para subdomínios como 'www'
  if (slug === 'www' || slug === hostname) {
    return null;
  }
  
  return slug;
};