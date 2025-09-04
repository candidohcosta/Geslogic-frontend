// Em src/hooks/useCopyToClipboard.ts

import { useState } from "react";

type CopyFn = (text: string) => Promise<boolean>;

export function useCopyToClipboard(): [boolean, CopyFn] {
  const [isCopied, setIsCopied] = useState(false);

  const copy: CopyFn = async (text) => {
    // LOG 1: Vemos o que estamos a tentar copiar
    console.log("Tentando copiar para o clipboard:", text);

    if (!navigator?.clipboard) {
      console.error("ERRO: navigator.clipboard não é suportado ou não está disponível.");
      // Isto pode acontecer se o site não estiver a ser servido num contexto seguro (HTTPS ou localhost)
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      console.log("SUCESSO: Texto copiado!");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      return true;
    } catch (error) {
      // LOG 2: Vemos o erro exato
      console.error("ERRO: A chamada a navigator.clipboard.writeText() falhou:", error);
      setIsCopied(false);
      return false;
    }
  };

  return [isCopied, copy];
}