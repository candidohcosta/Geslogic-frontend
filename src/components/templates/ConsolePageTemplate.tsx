// src/components/templates/ConsolePageTemplate.tsx
import React from 'react';
import { Page } from '../../components/layout/Page';
import { cn } from '../../lib/utils';
import type { IconType } from './types';

interface HeaderProps {
  icon?: IconType;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

interface AccentConfig {
  /** Acento a envolver o conteúdo principal (children) */
  content?: boolean;
  /** Padding interno do content wrapper (Default: true) */
  contentPadding?: boolean;
  /** Classe da cor de marca (default: 'border-t-brand-500') */
  brandClassName?: string;
}

interface ConsolePageTemplateProps {
  header: HeaderProps;
  /** Banner solto logo abaixo do header (opcional) */
  banner?: React.ReactNode;
  /** Configuração de acentos (borda superior de marca) */
  accent?: AccentConfig;
  /** Conteúdo do console (card com editor/resultados) */
  children: React.ReactNode;
}

function AccentSection({
  children,
  withAccent,
  padded = true,
  brandClassName = 'border-t-brand-500',
  className,
}: {
  children: React.ReactNode;
  withAccent?: boolean;
  padded?: boolean;
  brandClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm min-w-0',
        withAccent && cn('border-t-2', brandClassName),
        className,
      )}
    >
      <div className={cn(padded ? 'p-4 md:p-5' : '')}>{children}</div>
    </div>
  );
}

/**
 * Template para páginas “console-like” (editor + resultados),
 * com cadeia h-full/min-h-0/min-w-0 e suporte a acento de marca no conteúdo.
 */
export function ConsolePageTemplate({ header, banner, accent, children }: ConsolePageTemplateProps) {
  const Icon = header.icon;
  const brandTop = accent?.brandClassName ?? 'border-t-brand-500';
  const contentAccent = !!accent?.content;
  const contentPadded = accent?.contentPadding !== false;

  return (
    <Page>
      <Page.Header>
        <div className="px-4 pt-4 pb-3 flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-6 w-6 text-brand-500" />}
              <h1 className="text-2xl font-semibold text-gray-800 truncate">{header.title}</h1>
            </div>
            {header.subtitle && <p className="text-sm text-gray-600">{header.subtitle}</p>}
          </div>
          {header.actions && <div className="shrink-0">{header.actions}</div>}
        </div>

        {banner && <div className="px-4 pb-2">{banner}</div>}
      </Page.Header>

      <Page.Body>
        <div className="px-4 pb-6 h-full min-h-0 min-w-0 overflow-x-hidden">
          {contentAccent ? (
            <AccentSection
              withAccent
              padded={contentPadded}
              brandClassName={brandTop}
            >
              {children}
            </AccentSection>
          ) : (
            children
          )}
        </div>
      </Page.Body>
    </Page>
  );
}