// src/components/sidebar/SidebarGroup.tsx

import React, {
  Children,
  isValidElement,
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
  type SVGProps,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';

type IconType = React.ComponentType<SVGProps<SVGSVGElement>>;

interface SidebarGroupProps {
  id: string;
  title: string;
  icon: IconType;
  isOpen: boolean;
  onToggle: (id: string) => void;
  active?: boolean;
  collapsed?: boolean;
  /** Em mobile forçamos label visível (vem da Sidebar) */
  forceShowLabel?: boolean;
  /** Indica que este item tem submenu (mostra badge no rail) */
  hasChildren?: boolean;
  /** Em mobile, fechar drawer ao clicar num filho (já usado nos Links) */
  onNavigateChild?: () => void;
  children: ReactNode;
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({
  id,
  title,
  icon: Icon,
  isOpen,
  onToggle,
  active,
  collapsed,
  forceShowLabel,
  hasChildren,
  onNavigateChild,
  children,
}) => {
  const panelId = `${id}-panel`;

  // Desktop = quando NÃO forçamos label (mobile força label sempre visível)
  const isDesktop = !forceShowLabel;
  const shouldUseFlyout = Boolean(isDesktop && collapsed);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutVisible, setFlyoutVisible] = useState(false); // animação (opacity/translate)
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number; maxHeight: number }>({
    top: 0,
    left: 0,
    maxHeight: 0,
  });
  const closeTimer = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = (ms = 220) => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      setFlyoutVisible(false); // anima saída
      window.setTimeout(() => setFlyoutOpen(false), 120);
    }, ms);
  };

  /** Calcula posição/altura do flyout para minimizar scroll desnecessário */
  const computeFlyoutPos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const margin = 12;
    const vpH = window.innerHeight;

    // Colamos o topo ao botão, mas nunca acima do viewport
    let top = Math.max(rect.top + window.scrollY, window.scrollY + margin);

    // Espaço disponível até ao fim do viewport (com margem)
    let maxHeight = vpH - (top - window.scrollY) - margin;

    // Cap máximo (evita flyout enorme e barras prematuras por arredondamentos)
    const MAX_CAP = 680;
    maxHeight = Math.min(maxHeight, MAX_CAP);

    // Se por algum motivo ficar demasiado pequeno, reposiciona um pouco para cima
    const MIN_HEIGHT = 240;
    if (maxHeight < MIN_HEIGHT) {
      top = Math.max(window.scrollY + margin, vpH + window.scrollY - MIN_HEIGHT - margin);
      maxHeight = vpH - (top - window.scrollY) - margin;
    }

    const left = rect.right + window.scrollX + 8;
    setFlyoutPos({ top, left, maxHeight });
  };

  const openFlyout = () => {
    computeFlyoutPos();
    setFlyoutOpen(true);
    // liga a animação num tick a seguir (para permitir a transição)
    requestAnimationFrame(() => setFlyoutVisible(true));
  };

  // Reposiciona em scroll/resize
  useEffect(() => {
    if (!shouldUseFlyout || !flyoutOpen) return;
    const onScroll = () => computeFlyoutPos();
    const onResize = () => computeFlyoutPos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [shouldUseFlyout, flyoutOpen]);

  useEffect(() => () => clearCloseTimer(), []);

  /**
   * Força labels visíveis nos submenus dentro do flyout.
   * Entra no <li> e injeta props no <SidebarLink /> (filho real).
   * Faz narrowing para ReactElement<any> para aceder a props com segurança.
   */
  const forceLabelsDeep = (node: ReactNode): ReactNode => {
    if (!isValidElement(node)) return node;

    const el = node as ReactElement<any>;
    const typeAny = el.type as any;
    const typeName: string = typeAny?.displayName || typeAny?.name || '';

    if (typeName === 'SidebarLink') {
      return cloneElement(el, {
        collapsed: false,
        forceShowLabel: true,
      });
    }

    // Se for elemento nativo (ex.: 'li'), clona filhos recursivamente
    if (typeof el.type === 'string') {
      const newKids = Children.map(el.props?.children, forceLabelsDeep);
      return cloneElement(el, el.props as any, newKids);
    }

    // Fallback: clonar filhos (caso embrulhado noutro componente)
    const newKids = Children.map(el.props?.children, forceLabelsDeep);
    return cloneElement(el, el.props as any, newKids);
  };

  return (
    <li className="group relative min-w-0">
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          if (shouldUseFlyout) {
            setFlyoutOpen((v) => {
              if (!v) openFlyout();
              else {
                setFlyoutVisible(false);
                window.setTimeout(() => setFlyoutOpen(false), 120);
              }
              return !v;
            });
          } else {
            onToggle(id);
          }
        }}
        onMouseEnter={() => {
          if (shouldUseFlyout) openFlyout();
        }}
        onFocus={() => {
          if (shouldUseFlyout) openFlyout();
        }}
        onMouseLeave={() => {
          if (shouldUseFlyout) scheduleClose(260);
        }}
        onBlur={() => {
          if (shouldUseFlyout) scheduleClose(260);
        }}
        className={[
          'group/button relative',
          'w-full flex items-center justify-between text-left py-2 px-3 rounded-md text-sm font-medium transition-colors',
          active || isOpen ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white',
          (collapsed && !forceShowLabel) ? 'md:justify-center' : 'md:justify-between',
        ].join(' ')}
        aria-controls={panelId}
        aria-expanded={shouldUseFlyout ? flyoutOpen : isOpen}
      >
        <div className={['flex items-center gap-3', (collapsed && !forceShowLabel) ? 'md:justify-center' : ''].join(' ')}>
          <Icon className={['w-5 h-5', active || isOpen ? 'text-white' : 'text-gray-400 group-hover:text-white'].join(' ')} />
          {/* Em mobile (forceShowLabel), a label aparece sempre */}
          <span className={forceShowLabel ? 'inline' : (collapsed ? 'hidden md:sr-only' : 'inline')}>
            {title}
          </span>
        </div>

        {/* Badge no rail para indicar submenu (desktop colapsado) */}
        {hasChildren && isDesktop && collapsed && (
          <span
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 group-hover/button:text-gray-300"
            aria-hidden
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}

        {/* Seta normal (desktop expandido) */}
        {!collapsed && isDesktop && (
          <svg
            className={['w-4 h-4 transform transition-transform duration-200', isOpen ? 'rotate-90' : ''].join(' ')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {/* Tooltip do grupo (desktop colapsado) */}
      {isDesktop && collapsed && (
        <span
          className={[
            'pointer-events-none',
            'absolute left-full top-3 ml-2',
            'hidden md:block',
            'whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white',
            'opacity-0 translate-x-1 transition',
            'group-hover:opacity-100 group-hover:translate-x-0',
            'shadow-lg ring-1 ring-black/20',
            'z-50',
          ].join(' ')}
          role="tooltip"
        >
          {title}
        </span>
      )}

      {/* Submenu inline (mobile OU desktop expandido) */}
      {!shouldUseFlyout && isOpen && (
        <ul
          id={panelId}
          className={['mt-2 space-y-1', (collapsed && !forceShowLabel) ? 'ml-0 pl-0' : 'ml-4 border-l border-gray-700 pl-3'].join(' ')}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </ul>
      )}

      {/* Flyout premium (desktop colapsado) — via PORTAL para <body> */}
      {shouldUseFlyout && flyoutOpen &&
        createPortal(
          <div
            className="fixed z-[100]"
            style={{ top: flyoutPos.top, left: flyoutPos.left }}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={() => scheduleClose(240)}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Envelope com animação (opacity + translate-y 6px) */}
            <div
              className={[
                'transform-gpu transition-all duration-150 ease-out',
                flyoutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[6px]',
              ].join(' ')}
            >
              <div
                className="rounded-lg border border-gray-800 bg-gray-900 shadow-2xl ring-1 ring-black/30 w-64"
                role="dialog"
                aria-labelledby={`${panelId}-title`}
              >
                <div
                  id={`${panelId}-title`}
                  className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400 border-b border-gray-800"
                >
                  {title}
                </div>

                {/* Conteúdo com overflow só se precisar */}
                <div
                  className="overflow-y-auto overscroll-contain"
                  style={{ maxHeight: flyoutPos.maxHeight }}
                >
                  <ul className="p-2 space-y-1">
                    {
                      // Força labels visíveis nos SidebarLink, mesmo se embrulhados em <li>
                      Children.map(children, (child) => forceLabelsDeep(child))
                    }
                  </ul>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </li>
  );
};

export default SidebarGroup;