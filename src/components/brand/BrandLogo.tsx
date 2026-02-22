// src/components/brand/BrandLogo.tsx
import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  variant?: 'mark' | 'horizontal';
  className?: string;
  /** Quando true (default), o BrandLogo renderiza um <Link>. 
   *  Quando false, renderiza só a imagem (para evitar <a> dentro de <a>).
   */
  withLink?: boolean;
};

/**
 * Usa as imagens que vamos colocar em `public/assets`.
 * - variant="horizontal" -> /assets/geslogic-horizontal.png
 * - variant="mark"       -> /assets/geslogic-mark.png
 */
export const BrandLogo: React.FC<Props> = ({
  variant = 'horizontal',
  className,
  withLink = true,
}) => {
  const src =
    variant === 'mark'
      ? '/assets/geslogic-mark.png'
      : '/assets/geslogic-horizontal.png';

  const content = (
    <img
      src={src}
      alt="GesLogic"
      className="h-8 w-auto"
      decoding="async"
      loading="eager"
    />
  );

  if (withLink) {
    // modo clicável (isolado): o Link recebe as classes
    return (
      <Link
        to="/"
        className={`inline-flex items-center ${className ?? ''}`}
        aria-label="GesLogic - Início"
      >
        {content}
      </Link>
    );
  }

  // modo não-link (quando já existe um <Link> exterior): evita <a> aninhado
  return (
    <span className={`inline-flex items-center ${className ?? ''}`} aria-label="GesLogic">
      {content}
    </span>
  );
};

export default BrandLogo;