import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface ContextMenuState {
  open: boolean;
  x: number;     // coordenadas calculadas (já com scroll)
  y: number;
}

interface Options {
  /** Margem mínima às bordas do viewport */
  margin?: number;
  /** Largura/altura esperada do menu (para flip preditivo); pode ser afinado depois */
  estimatedSize?: { width: number; height: number };
}

export function useContextMenu(options: Options = {}) {
  const { margin = 8, estimatedSize = { width: 240, height: 280 } } = options;
  const [state, setState] = useState<ContextMenuState>({ open: false, x: 0, y: 0 });
  const anchorRef = useRef<{ x: number; y: number } | null>(null);

  const openAt = useCallback((pageX: number, pageY: number) => {
    anchorRef.current = { x: pageX, y: pageY };
    // posiciona “optimista”; corrigimos no próximo frame com medidas reais
    setState({ open: true, x: pageX, y: pageY });
    // flip no próximo frame quando tivermos DOM pronto
    requestAnimationFrame(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // converter page coords para viewport (para comparar com vw/vh)
      const clientX = pageX - window.scrollX;
      const clientY = pageY - window.scrollY;

      let dx = 0;
      let dy = 0;

      // FLIP horizontal se passar a direita
      if (clientX + estimatedSize.width + margin > vw) {
        dx = -estimatedSize.width;
      }
      // FLIP vertical se passar o fundo
      if (clientY + estimatedSize.height + margin > vh) {
        dy = -estimatedSize.height;
      }

      setState(prev => ({
        ...prev,
        x: pageX + dx,
        y: pageY + dy,
      }));
    });
  }, [estimatedSize.height, estimatedSize.width, margin]);

  const close = useCallback(() => setState(s => ({ ...s, open: false })), []);

  // reposiciona se a janela for redimensionada (fecha por simplicidade)
  useEffect(() => {
    const onResize = () => close();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [close]);

  // fecha no scroll global (evita menu “a pairar” longe)
  useEffect(() => {
    const onScroll = () => close();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [close]);

  return { state, openAt, close };
}