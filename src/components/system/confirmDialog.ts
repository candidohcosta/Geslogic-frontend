// src/components/system/confirmDialog.ts

export function confirmDialog(opts: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("app:showConfirmDialog", {
        detail: {
          title: opts.title,
          message: opts.message,
          confirmText: opts.confirmText ?? "Confirmar",
          cancelText: opts.cancelText ?? "Cancelar",
          resolve,
        },
      })
    );
  });
}