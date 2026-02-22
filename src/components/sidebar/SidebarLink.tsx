// src/components/sidebar/SidebarLink.tsx
import React, {
  useEffect,
  useRef,
  useState,
  type SVGProps,
} from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';

type IconType = React.ComponentType<SVGProps<SVGSVGElement>>;

interface SidebarLinkProps {
  to: string;
  icon?: IconType;
  children: React.ReactNode;
  active?: boolean;
  /** Quando true, rail colapsado no desktop; quando mobile, ignoramos e mostramos label */
  collapsed?: boolean;
  /** Quando true (mobile), forçar label sempre visível e não mostrar tooltip */
  forceShowLabel?: boolean;
  /** Em mobile, permite fechar drawer depois da navegação */
  onNavigate?: () => void;
}

const OPEN_DELAY_MS = 180;  // ⇦ atraso de abertura do tooltip
const CLOSE_DELAY_MS = 100; // ⇦ atraso de fecho (rápido para não piscar)

const SidebarLink: React.FC<SidebarLinkProps> = ({
  to,
  icon: Icon,
  children,
  active,
  collapsed,
  forceShowLabel,
  onNavigate,
}) => {
  const isDesktop = !forceShowLabel; // coerente com Sidebar/SidebarGroup
  const showLabelInline = forceShowLabel || !collapsed;

  // ---------- Tooltip (via portal) quando rail está colapsado em desktop ----------
  const btnRef = useRef<HTMLAnchorElement | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipVisible, setTipVisible] = useState(false); // para animação
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clearTimers = () => {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const computePos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const cy = rect.top + rect.height / 2;
    const top = cy + window.scrollY;
    const left = rect.right + window.scrollX + 8; // afastamento de 8px
    setPos({ top, left });
  };

  const scheduleOpen = () => {
    clearTimers();
    openTimer.current = window.setTimeout(() => {
      computePos();
      setTipOpen(true);
      if (prefersReducedMotion) {
        setTipVisible(true);
      } else {
        requestAnimationFrame(() => setTipVisible(true));
      }
    }, OPEN_DELAY_MS);
  };

  const scheduleClose = (ms = CLOSE_DELAY_MS) => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      setTipVisible(false);
      // espera o fim da transição antes de desmontar
      window.setTimeout(() => setTipOpen(false), prefersReducedMotion ? 0 : 120);
    }, ms);
  };

  // Reposiciona em scroll/resize enquanto aberto
  useEffect(() => {
    if (!tipOpen) return;
    const onScroll = () => computePos();
    const onResize = () => computePos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipOpen]);

  useEffect(() => () => clearTimers(), []);

  const FallbackDot = () => (
    <span aria-hidden className="w-2.5 h-2.5 rounded-full bg-gray-500/70 block" />
  );

  return (
    <>
      <Link
        ref={btnRef}
        to={to}
        className={[
          'group relative min-w-0',
          'flex items-center gap-3 w-full text-left py-2 px-3 rounded-md text-sm transition-colors',
          active
            ? 'bg-gray-800 text-white font-semibold'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white',
          collapsed && !forceShowLabel ? 'md:justify-center' : 'md:justify-start',
          // melhor hit-area
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-0',
        ].join(' ')}
        onClick={(e) => {
          e.stopPropagation(); // evita overlay fechar antes
          onNavigate?.();      // mobile: fecha drawer (se aplicável)
        }}
        onMouseEnter={() => {
          if (isDesktop && collapsed) scheduleOpen();
        }}
        onFocus={() => {
          if (isDesktop && collapsed) scheduleOpen();
        }}
        onMouseLeave={() => {
          if (isDesktop && collapsed) scheduleClose();
        }}
        onBlur={() => {
          if (isDesktop && collapsed) scheduleClose();
        }}
      >
        <span className="flex-none w-6 h-6 grid place-items-center">
          {Icon ? (
            <Icon
              className={[
                'w-5 h-5',
                active ? 'text-white' : 'text-gray-400 group-hover:text-white',
              ].join(' ')}
            />
          ) : (
            <FallbackDot />
          )}
        </span>

        {/* Label inline (desktop expandido ou mobile) */}
        <span className={showLabelInline ? 'truncate inline' : 'hidden md:sr-only'}>
          {children}
        </span>
      </Link>

      {/* Tooltip via PORTAL — apenas desktop colapsado */}
      {isDesktop && collapsed && tipOpen &&
        createPortal(
          <div
            className="fixed z-[100]"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={() => {
              clearTimers(); // mantém aberto se entrares no balão
            }}
            onMouseLeave={() => scheduleClose(80)}
          >
            {/* 🔽 Troca de estilo aqui (A ou B) */}
            <div
              className={[
                prefersReducedMotion
                  ? ''
                  : 'transform-gpu transition-all duration-150 ease-out',
                tipVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[4px]',
              ].join(' ')}
            >
              {/* === Opção A — Minimal premium (recomendado para dashboard) === */}
              <div className="px-2.5 py-1.5 text-xs rounded-md bg-gray-900 text-white shadow-lg ring-1 ring-black/25 whitespace-nowrap">
                {children}
              </div>

              
              {/* // === Opção B — Brand accent (ativa trocando o bloco acima por este) === */}
              {/* <div className="relative">
                <div className="px-2.5 py-1.5 text-xs rounded-md bg-gray-900 text-white shadow-xl ring-1 ring-brand-500/35 whitespace-nowrap">
                  {children}
                </div> */}
                {/* // Flecha opcional (pequena) */}
                {/* <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-gray-900 ring-1 ring-brand-500/35" />
              </div> */}
              
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
};

// Ajuda o detetor no flyout a identificar este componente por nome
(SidebarLink as any).displayName = 'SidebarLink';

export default SidebarLink;