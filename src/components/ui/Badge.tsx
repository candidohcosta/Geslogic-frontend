// frontend/src/components/ui/Badge.tsx
import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  // Classes base obrigatórias (redondo, texto pequeno, alinhado)
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  // Cores por variante
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80", // Azul/Preto
    secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200", // Cinza claro
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-600", // Vermelho
    success: "border-transparent bg-green-500 text-white hover:bg-green-600", // Verde
    warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600", // Amarelo
    outline: "text-foreground border-gray-200", // Apenas borda
  };

  const variantStyles = variants[variant] || variants.default;

  return (
    <div className={`${baseStyles} ${variantStyles} ${className || ""}`} {...props} />
  );
}