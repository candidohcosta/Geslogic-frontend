// src/components/patterns/Drawer.tsx
import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import type { SVGProps } from 'react';

type DrawerSize = 'sm' | 'md' | 'lg' | 'xl';
type DrawerTone = 'brand' | 'neutral' | 'success' | 'danger';

const sizeToWidth: Record<DrawerSize, string> = {
  sm: 'w-[420px] max-w-[90vw]',
  md: 'w-[560px] max-w-[92vw]',
  lg: 'w-[720px] max-w-[94vw]',
  xl: 'w-[880px] max-w-[96vw]',
};

const toneToTopBorder: Record<DrawerTone, string> = {
  brand: 'border-t-brand-500',
  neutral: 'border-t-gray-300',
  success: 'border-t-emerald-500',
  danger: 'border-t-red-500',
};

const toneToTitle: Record<DrawerTone, string> = {
  brand: 'text-gray-900',
  neutral: 'text-gray-900',
  success: 'text-emerald-700',
  danger: 'text-red-700',
};

type IconType = React.ComponentType<SVGProps<SVGSVGElement>>;

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Título em texto simples; podes também passar JSX se quiseres */
  title: React.ReactNode;
  /** Ícone opcional a aparecer à esquerda do título */
  titleIcon?: IconType;
  /** Subtítulo/descrição breve */
  subtitle?: React.ReactNode;
  /** Cor/“tom” do header (apenas título e barra superior) */
  tone?: DrawerTone;
  size?: DrawerSize;
  children: React.ReactNode;
  /** Botões/ações no footer (à direita) */
  footer?: React.ReactNode;
  /** Quando true, faz o footer “colar” ao fundo com sombra */
  stickyFooter?: boolean;
  className?: string;
  /** Elemento a receber o foco inicial dentro do drawer */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Ações no topo à direita (ex.: ajuda, info, etc.) */
  headerActions?: React.ReactNode;
}

/**
 * Drawer acessível (side panel)
 * - Foco inicial restaurado
 * - Fecha com Esc e overlay
 * - Barra superior com “tone”
 * - Ícone no título, header actions, sticky footer opcional
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  titleIcon: TitleIcon,
  subtitle,
  tone = 'brand',
  size = 'md',
  children,
  footer,
  stickyFooter = true,
  className,
  initialFocusRef,
  headerActions,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  // Guardar/restaurar foco + bloquear scroll
  useEffect(() => {
    if (isOpen) {
      lastActiveRef.current = document.activeElement as HTMLElement;
      const el =
        (initialFocusRef?.current as HTMLElement | null) ||
        (panelRef.current?.querySelector('[data-autofocus]') as HTMLElement | null);

      el?.focus?.();
      document.body.style.overflow = 'hidden';
    } else {
      lastActiveRef.current?.focus?.();
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialFocusRef]);

  // Esc fecha
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const headerTitleClass = cn(
    'text-lg font-semibold',
    toneToTitle[tone] ?? 'text-gray-900'
  );

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Painel */}
      <div
        className={cn(
          'absolute right-0 top-0 h-full bg-white shadow-2xl border-l border-gray-200',
          'flex flex-col',
          sizeToWidth[size],
          'animate-in slide-in-from-right duration-200',
          className
        )}
        ref={panelRef}
      >
        {/* Header com brand accent (tom configurável) */}
        <div className="border-b border-gray-200">
          <div className={cn('border-t-2', toneToTopBorder[tone])} />
          <div className="px-5 py-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {TitleIcon && (
                  <span className="inline-flex w-5 h-5 text-brand-600">
                    <TitleIcon className="w-5 h-5" />
                  </span>
                )}
                <h2 id="drawer-title" className={headerTitleClass}>
                  {title}
                </h2>
              </div>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>

            {/* Ações opcionais (ex.: Ajuda, Info) */}
            {headerActions && (
              <div className="flex items-center gap-2 shrink-0">
                {headerActions}
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              'border-t border-gray-200 px-5 py-3',
              stickyFooter && 'sticky bottom-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 shadow-[0_-6px_12px_-8px_rgba(0,0,0,0.15)]'
            )}
          >
            <div className="flex justify-end gap-2">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Garante módulo válido em --isolatedModules mesmo em builds estritos */
export {};