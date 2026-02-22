// src/components/templates/DetailFormTemplate.tsx
import React from 'react';
import { Page, PageToolbar } from '../../components/layout/Page';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { IconType } from './types';
import { cn } from '../../lib/utils';

interface HeaderProps {
  icon?: IconType;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode; // ações à direita (ex.: “Voltar”/“Ajuda”)
}
interface SectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Conteúdo do formulário (inputs, selects, etc.) */
  content: React.ReactNode;
  /** Renderiza o card com brand‑accent no topo (default: false) */
  accent?: boolean;
  className?: string;
}
interface DetailFormTemplateProps {
  header: HeaderProps;
  /** Secções do formulário (renderizadas em grid 2 col em md+) */
  sections: SectionProps[];
  /** Ações finais (ex.: Cancelar/Gravar) — barra sticky no bottom */
  actions: React.ReactNode;
  /** Grid colunas do formulário (default: 2 em md+) */
  columnsMd?: 1 | 2;
}

export function DetailFormTemplate({
  header, sections, actions, columnsMd = 2,
}: DetailFormTemplateProps) {
  const Icon = header.icon;

  return (
    <Page>
      <Page.Header>
        <div className="px-4 pt-4 pb-3 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-6 w-6 text-brand-500" />}
              <h1 className="text-2xl font-semibold text-gray-800">{header.title}</h1>
            </div>
            {header.subtitle && (
              <p className="text-sm text-gray-600">{header.subtitle}</p>
            )}
          </div>
          {header.actions && <div className="shrink-0">{header.actions}</div>}
        </div>
      </Page.Header>

      <Page.Body>
        <div className={cn(
          'px-4 pb-20',
          columnsMd === 2 ? 'grid md:grid-cols-2 gap-6' : 'grid gap-6',
        )}>
          {sections.map((s, i) => (
            <Card
              key={i}
              className={cn(
                'bg-white rounded-xl border border-gray-200 shadow-sm',
                s.accent && 'border-t-2 border-t-brand-500',
                s.className,
              )}
            >
              {(s.title || s.description) && (
                <div className="px-6 pt-5 pb-2">
                  {s.title && <h2 className="text-base font-semibold text-gray-800">{s.title}</h2>}
                  {s.description && <p className="text-sm text-gray-600 mt-0.5">{s.description}</p>}
                </div>
              )}
              <div className="px-6 pb-6 pt-2">{s.content}</div>
            </Card>
          ))}
        </div>

        {/* Barra sticky de ações (sempre visível no fundo) */}
        <PageToolbar position="bottom">
          <div className="flex items-center justify-end gap-2 py-3">
            {actions}
          </div>
        </PageToolbar>
      </Page.Body>
    </Page>
  );
}