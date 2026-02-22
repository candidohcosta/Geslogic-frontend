// src/lib/uiDialogs.ts
export async function showInfo(message: string, opts?: { title?: string }) {
  const title = opts?.title ?? 'GesLogic — Operador';

  // Electron: usa dialog nativo com titulo personalizado (preload deve expor electronAPI)
  const anyWin = window as any;
  if (anyWin.electronAPI?.showOperatorInfo) {
    try {
      await anyWin.electronAPI.showOperatorInfo(message);
      return;
    } catch {
      // fallback para Web modal se algo falhar
    }
  }

  // Web: dispara o InfoModal via CustomEvent
  const ev = new CustomEvent('app:showInfoDialog', { detail: { title, message } });
  window.dispatchEvent(ev);
}

export async function showConfirm(
  message: string,
  opts?: { title?: string; confirmText?: string; cancelText?: string }
): Promise<boolean> {
  const title = opts?.title ?? 'GesLogic — Operador';
  const confirmText = opts?.confirmText ?? 'Terminar';
  const cancelText = opts?.cancelText ?? 'Cancelar';

  // Electron: usar dialog nativo
  const anyWin = window as any;
  if (anyWin.electronAPI?.showOperatorConfirm) {
    try {
      const ok = await anyWin.electronAPI.showOperatorConfirm({ title, message, confirmText, cancelText });
      return !!ok;
    } catch { /* cai para Web */ }
  }

  // Web: disparar modal React controlado por portal
  const result = await new Promise<boolean>((resolve) => {
    const ev = new CustomEvent('app:showConfirmDialog', {
      detail: { title, message, confirmText, cancelText, resolve }
    } as any);
    window.dispatchEvent(ev);
  });

  return result;
}
