// src/components/templates/UtilityPageTemplate.tsx
import React from 'react';
import { Page } from '../../components/layout/Page';
import { cn } from '../../lib/utils';
import type { IconType } from './types';

interface HeaderProps {
  icon?: IconType;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode; // botoeira à direita
}

interface AccentConfig {
  options?: boolean;
  secondary?: boolean;
  content?: boolean;
  contentPadding?: boolean;
  brandClassName?: string;
}

interface UtilityPageTemplateProps {
  header: HeaderProps;
  optionsBar?: React.ReactNode;
  secondaryBar?: React.ReactNode;
  banner?: React.ReactNode;
  accent?: AccentConfig;
  children: React.ReactNode;
}

/** Caixa “com marca” igual ao padrão do ListPageTemplate (borda superior + sombra) */
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
 * Exportamos um “Section” oficial para uso dentro das UtilityPages,
 * mantendo o mesmo look&feel (accent de marca, padding, borda, etc).
 */
export function UtilitySection({
  children,
  withAccent = true,
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
    <AccentSection
      withAccent={withAccent}
      padded={padded}
      brandClassName={brandClassName}
      className={className}
    >
      {children}
    </AccentSection>
  );
}

export function UtilityPageTemplate({
  header,
  optionsBar,
  secondaryBar,
  banner,
  accent,
  children,
}: UtilityPageTemplateProps) {
  const Icon = header.icon;
  const brandTop = accent?.brandClassName ?? 'border-t-brand-500';
  const optionsAccent = accent?.options !== false; // default true
  const secondaryAccent = !!accent?.secondary;
  const contentAccent = !!accent?.content;
  const contentPadded = accent?.contentPadding !== false;

  return (
    <Page>
      <Page.Header>
        {/* Cabeçalho */}
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

        {/* Banner solto logo após o header (opcional) */}
        {banner && <div className="px-4 pb-2">{banner}</div>}

        {/* Barra de opções (com acento por omissão) */}
        {optionsBar && (
          <div className="px-4 pb-3">
            <AccentSection withAccent={optionsAccent} brandClassName={brandTop}>
              {optionsBar}
            </AccentSection>
          </div>
        )}

        {/* Barra secundária (acento opcional) */}
        {secondaryBar && (
          <div className="px-4 pb-3">
            <AccentSection withAccent={secondaryAccent} brandClassName={brandTop}>
              {secondaryBar}
            </AccentSection>
          </div>
        )}
      </Page.Header>

      <Page.Body>
        <div className="px-4 pb-6 h-full min-h-0 min-w-0 overflow-x-hidden">
          {/* Conteúdo principal (opcionalmente embrulhado com acento) */}
          {contentAccent ? (
            <AccentSection
              withAccent
              padded={contentPadded}
              brandClassName={brandTop}
              className="mt-1"
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