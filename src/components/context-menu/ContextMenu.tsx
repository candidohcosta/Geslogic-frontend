import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
  open: boolean;
  pageX: number;
  pageY: number;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Renderiza num portal, posiciona por pageX/pageY e faz flip com base nas medidas reais.
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  open, pageX, pageY, onClose, className, children
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

  // Fecha ao clicar fora / ESC
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Calcula posição com base no tamanho real do menu (pós-mount)
  useLayoutEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;

    // Primeiro coloca onde clicámos (com leve offset)
    const baseX = pageX + 2;
    const baseY = pageY + 2;

    // Mede
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // coordenadas em viewport para verificar overflow
    const clientX = baseX - window.scrollX;
    const clientY = baseY - window.scrollY;

    let finalX = baseX;
    let finalY = baseY;

    // Flip horizontal se sair pela direita
    if (clientX + rect.width + 8 > vw) {
      finalX = baseX - rect.width - 4;
    }
    // Flip vertical se sair por baixo
    if (clientY + rect.height + 8 > vh) {
      finalY = baseY - rect.height - 4;
    }

    setStyle({
      position: 'absolute',
      left: finalX,
      top: finalY,
      zIndex: 1000,
      visibility: 'visible',
    });
  }, [open, pageX, pageY]);

  if (!open) return null;

  return createPortal(
    <div
      ref={ref}
      style={style}
      className={[
        "min-w-[220px] max-w-[320px] rounded-md border",
        "border-gray-800/50 bg-gray-900 text-gray-100",
        "shadow-2xl ring-1 ring-black/30",
        "py-1",
        "animate-in fade-in zoom-in-95 duration-100 origin-top-left", // se usas tailwind-animate
        className || ""
      ].join(' ')}
      role="menu"
    >
      {children}
    </div>,
    document.body
  );
};

export default ContextMenu;
