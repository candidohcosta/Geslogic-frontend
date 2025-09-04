// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * @description Copia um texto para a área de transferência de forma robusta.
 * Tenta usar a nova API do Clipboard; se falhar, usa o método legado 'document.execCommand'.
 * @param text O texto a ser copiado.
 * @returns {Promise<boolean>} 'true' se a cópia for bem-sucedida, 'false' caso contrário.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Tenta a API moderna
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn("A cópia com a API do Clipboard falhou, a tentar o método legado.", error);
    }
  }

  // 2. Fallback para o método legado
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; // Evita que a página "salte"
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (error) {
    console.error("A cópia com o método legado também falhou.", error);
    return false;
  }
}