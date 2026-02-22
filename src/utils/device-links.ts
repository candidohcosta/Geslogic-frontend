// src/utils/device-links.ts

/**
 * Copia para a área de transferência, suportando HTTP (fallback com textarea).
 */
export async function safeCopyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // ignora e cai no fallback
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}

/**
 * Constroi um URL base a partir do .env (prioritário) ou, em falta,
 * tenta deduzir a partir do host atual substituindo o subdomínio.
 * Ex.: app.geslogic.local -> display.geslogic.local (mesma porta se existir).
 */
function resolveBaseFromEnvOrHost(
  envBase: string | undefined,
  desiredSubdomain: 'display' | 'kiosk'
): string {
  if (envBase) return envBase.replace(/\/+$/, ''); // remove trailing /

  // Fallback: construir a partir do host atual
  const { protocol, hostname, port } = window.location;

  // trocar subdomínio se existir (ex.: app.geslogic.local -> display.geslogic.local)
  let newHost = hostname;
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    parts[0] = desiredSubdomain; // substitui o subdomínio
    newHost = parts.join('.');
  } else {
    // sem subdomínio → prefixa (display.) para manter coerência
    newHost = `${desiredSubdomain}.${hostname}`;
  }

  // manter a porta em dev; em prod normalmente não há porta explícita
  const portPart = port ? `:${port}` : '';

  // Em produção, força https; em dev mantém o protocolo atual
  const finalProtocol =
    process.env.NODE_ENV === 'production' ? 'https:' : protocol;

  return `${finalProtocol}//${newHost}${portPart}`;
}

/**
 * URL de setup do Display: <base>/setup/<secret>
 */
export function buildDisplaySetupUrl(secret: string): string {
  const base = resolveBaseFromEnvOrHost(
    process.env.REACT_APP_DISPLAY_SETUP_BASE,
    'display'
  );
  return `${base}/setup/${encodeURIComponent(secret)}`;
}

/**
 * URL de setup do Kiosk: <base>/setup/<secret>
 */
export function buildKioskSetupUrl(secret: string): string {
  const base = resolveBaseFromEnvOrHost(
    process.env.REACT_APP_KIOSK_SETUP_BASE,
    'kiosk'
  );
  return `${base}/setup/${encodeURIComponent(secret)}`;
}