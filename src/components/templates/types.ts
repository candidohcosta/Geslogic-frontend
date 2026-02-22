// src/components/templates/types.ts
import type { SVGProps, ReactNode } from 'react';

export type IconType = React.ComponentType<SVGProps<SVGSVGElement>>;

export type SortOrder = 'ASC' | 'DESC';

export interface Column<T> {
  /** Chave do campo (para ordenar/extrair valor) */
  key: keyof T | string;
  /** Cabeçalho visível (texto/JSX) */
  header: ReactNode;
  /** Largura em percentagem (usa <colgroup>) */
  widthPct?: number;
  /** Alinhamento da célula */
  align?: 'left' | 'center' | 'right';
  /** Classe extra para <td> */
  className?: string;
  /** Esta coluna é ordenável? */
  sortable?: boolean;
  /**
   * Render custom para a célula. Se não for fornecido,
   * tenta renderizar `row[key]` como string.
   */
  render?: (row: T, index: number) => ReactNode;
}


/** Permite dar classe/realce por linha */
export type RowClassName<T> = (row: T, index: number) => string;
