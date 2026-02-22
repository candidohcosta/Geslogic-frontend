// src/components/Footer.tsx
import React from 'react';

interface FooterProps {
  /** Espaçamento vertical mais apertado (default: true) */
  compactSpacing?: boolean;
  /** Tom do footer (texto/fundo) */
  tone?: 'light' | 'dark';
  /** Cor da linha superior */
  borderTone?: 'light' | 'dark' | 'brand';
  /** Texto extra à direita (ex.: links “Privacidade · Termos · Contacto”) */
  rightSlot?: React.ReactNode;
}

const Footer: React.FC<FooterProps> = ({
  compactSpacing = true,
  tone = 'dark',
  borderTone = 'dark',
  rightSlot,
}) => {
  const toneClasses =
    tone === 'dark'
      ? 'bg-gray-900 text-gray-400'
      : 'bg-white text-gray-500';

  // Linha superior (apenas 1px), cor configurável
  const borderClasses =
    borderTone === 'brand'
      ? 'border-t border-brand-500/35' // linha com toque da cor de marca
      : borderTone === 'light'
      ? 'border-t border-gray-200'
      : 'border-t border-gray-800/60';

  // Espaçamento vertical do próprio footer
  const padY = compactSpacing ? 'py-2 md:py-2.5' : 'py-3 md:py-4';

  return (
    <footer
      className={[
        toneClasses,
        borderClasses,
        // o footer continua irmão do scroller – fora do overflow
        'w-full',
        padY,
      ].join(' ')}
      role="contentinfo"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8 text-xs flex items-center justify-between">
        <span className="whitespace-nowrap">
          © {new Date().getFullYear()} GesLogic · Todos os direitos reservados.
        </span>

        <span className="hidden sm:inline-flex items-center gap-4">
          {rightSlot ?? (
            <>
              <a href="/privacy" className="hover:text-white transition-colors">Privacidade</a>
              <a href="/terms" className="hover:text-white transition-colors">Termos</a>
              <a href="/contact" className="hover:text-white transition-colors">Contacto</a>
            </>
          )}
        </span>
      </div>
    </footer>
  );
};

export default Footer;