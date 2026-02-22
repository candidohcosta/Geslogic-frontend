// src/components/templates/ListPageTemplate.tsx
import React from 'react';
import { Page } from '../../components/layout/Page';
import { Button } from '../../components/ui/Button';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '../../components/ui/Table';
import { cn } from '../../lib/utils';
import type { Column, IconType, RowClassName, SortOrder } from './types';

type ContextMenuHandler<T> = (e: React.MouseEvent, row: T) => void;

interface FiltersAreaProps {
  /** GridTemplateColumns a usar no wrapper dos filtros (igual ao teu `COLS`) */
  colsTemplate?: string;
  /** Conteúdo JSX dos filtros (Select/Input/etc.) */
  children?: React.ReactNode;
  /** Mostrar “brand accent” no topo do card de filtros (default: true) */
  accent?: boolean;
}
interface TableAreaProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  /** Ordenação externa (controlada) */
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (key: string) => void;
  /** Eventos de linha */
  onRowClick?: (row: T) => void;
  onRowContextMenu?: ContextMenuHandler<T>;
  /** Linha vazia (state) */
  emptyState?: React.ReactNode;
  /** Header colado? */
  stickyHeader?: boolean;
  /** Classe extra para a tabela */
  tableClassName?: string;
  /** Classe condicional por linha */
  rowClassName?: RowClassName<T>;

}

/** Cabeçalho da página */
interface HeaderProps {
  icon?: IconType;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode; // botoeira à direita
}

/** Props principais do template */
interface ListPageTemplateProps<T> {
  header: HeaderProps;
  filters?: FiltersAreaProps;
  /** Aparece entre filtros e a tabela */
  toolbar?: React.ReactNode;
  table: TableAreaProps<T>;
}

/** Indicador simples de ordenação */
function SortIndicator({ active, order }: { active: boolean; order?: SortOrder }) {
  if (!active || !order) return null;
  return <span className="ml-1">{order === 'ASC' ? '▲' : '▼'}</span>;
}

/** Área de filtros com brand-accent e grid de colunas consistente */
function FiltersArea({ colsTemplate, children, accent = true }: FiltersAreaProps) {
  if (!children) return null;
  return (
    <div className="px-4">
      <div
        className={cn(
          'bg-white rounded-xl border border-gray-200 shadow-sm mt-3',
          accent && 'border-t-2 border-t-brand-500',
        )}
      >
        <div
          className="p-4 md:p-5 grid gap-3 min-w-0"
          style={colsTemplate ? { gridTemplateColumns: colsTemplate } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Render genérico de tabela com colgroup + sticky header opcional */
function TableArea<T>({
  columns, data, rowKey, sortBy, sortOrder, onSort,
  onRowClick, onRowContextMenu, emptyState, stickyHeader, tableClassName, rowClassName
}: TableAreaProps<T>) {
  const hasWidths = columns.some(c => typeof c.widthPct === 'number');

  return (
    <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm border-t-2 border-t-brand-500">
      <div className="p-0 md:p-0">
        {/* Desktop */}
        <div className="hidden md:block rounded-md border overflow-x-auto">
          <Table className={cn('table-fixed w-full', tableClassName)}>
            {hasWidths && (
              <colgroup>
                {columns.map((c, idx) => (
                  <col key={idx} style={c.widthPct ? { width: `${c.widthPct}%` } : undefined} />
                ))}
              </colgroup>
            )}

            <TableHeader>
              <TableRow className={cn('bg-gray-50/60', stickyHeader && 'sticky top-0 z-10')}>
                {columns.map((c, idx) => (
                  <TableHead key={idx} className={cn(
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                  )}>
                    {c.sortable && onSort ? (
                      <Button variant="ghost" onClick={() => onSort(String(c.key))}>
                        {c.header}
                        <SortIndicator active={sortBy === c.key} order={sortBy === c.key ? sortOrder : undefined} />
                      </Button>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">{c.header}</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    {emptyState ?? (
                      <div className="py-10 text-center text-sm text-gray-600">
                        Sem resultados para os filtros atuais.
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, i) => (
                  <TableRow
                    key={rowKey(row, i)}
                    className={cn(
                      'cursor-default hover:bg-gray-50/60 transition-colors',
                      rowClassName?.(row, i)
                    )}
                    onClick={() => onRowClick?.(row)}
                    onContextMenu={(e) => onRowContextMenu?.(e, row)}
                  >
                    {columns.map((c, ci) => (
                      <TableCell
                        key={ci}
                        className={cn(
                          'overflow-hidden',
                          c.align === 'right' && 'text-right',
                          c.align === 'center' && 'text-center',
                          c.className,
                        )}
                      >
                        <span className="block w-full truncate">
                          {c.render ? c.render(row, i) : (String((row as any)[c.key] ?? '') || '—')}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile (cards simples) */}
        <div className="grid grid-cols-1 gap-4 md:hidden p-4">
          {data.length === 0 ? (
            emptyState ?? (
              <div className="py-6 text-center text-sm text-gray-600">
                Sem resultados para os filtros atuais.
              </div>
            )
          ) : (
            data.map((row, i) => (
              <div
                key={rowKey(row, i)}
                className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2"
              >
                {/* Cabeçalho mobile: 1ª coluna como título */}
                <div className="font-bold text-base">
                  {columns[0].render ? columns[0].render(row, i) : String((row as any)[columns[0].key] ?? '')}
                </div>

                {/* Demais campos */}
                <div className="text-sm text-muted-foreground space-y-1">
                  {columns.slice(1, -1).map((c, ci) => (
                    <div key={ci}>
                      <span className="font-medium text-gray-700">{c.header}: </span>
                      <span>
                        {c.render ? c.render(row, i) : String((row as any)[c.key] ?? '')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Última coluna frequentemente é “Ações” */}
                {columns[columns.length - 1] && (
                  <div className="pt-1">
                    {columns[columns.length - 1].render?.(row, i)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function ListPageTemplate<T>({
  header, filters, toolbar, table,
}: ListPageTemplateProps<T>) {
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

          {header.actions && (
            <div className="shrink-0">{header.actions}</div>
          )}
        </div>

        {filters && (
          <FiltersArea colsTemplate={filters.colsTemplate} accent={filters.accent}>
            {filters.children}
          </FiltersArea>
        )}


        {/* NOVO: Toolbar entre filtros e tabela (se existir) */}
        {toolbar && (
          <div className="px-4 mt-3">
            <div className="bg-white/60 rounded-md border border-gray-200/70 px-3 py-2 flex items-center justify-between text-sm">
              {toolbar}
            </div>
          </div>
        )}


      </Page.Header>

      <Page.Body>
        <div className="px-4 pb-6 overflow-x-hidden">
          <TableArea {...table} />
        </div>
      </Page.Body>
    </Page>
  );
}