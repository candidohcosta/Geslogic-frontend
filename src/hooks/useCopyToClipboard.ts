// src/hooks/useCopyToClipboard.ts

import { useState } from 'react';

type CopyFn = (text: string) => Promise<boolean>;

export function useCopyToClipboard(): [boolean, CopyFn] {
  const [isCopied, setIsCopied] = useState(false);

  const copy: CopyFn = async (text) => {
    // 1. TENTA O MÉTODO MODERNO E SEGURO (navigator.clipboard)
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Resetar o estado após 2s
        return true;
      } catch (error) {
        console.warn('Falha ao usar navigator.clipboard. A tentar o método de fallback.', error);
      }
    }

    // 2. MÉTODO DE FALLBACK (para HTTP e navegadores antigos)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Evita que o ecrã "salte"
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      
      document.body.removeChild(textArea);

      if (successful) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        return true;
      }
    } catch (error) {
      console.error('Falha ao usar o método de fallback de cópia.', error);
    }

    // Se ambos falharem
    setIsCopied(false);
    return false;
  };

  return [isCopied, copy];
}