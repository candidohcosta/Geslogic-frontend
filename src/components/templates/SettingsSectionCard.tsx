// src/components/templates/SettingsSectionCard.tsx
import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../../components/ui/Card';

interface Props {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}

export function SettingsSectionCard({
  title,
  description,
  children,
  accent = false,
  className,
}: Props) {
  return (
    <Card
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm overflow-visible',
        accent && 'border-t-2 border-t-brand-500',
        className
      )}
    >
      {(title || description) && (
        <div className="px-6 pt-5 pb-2">
          {title && (
            <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-0.5">{description}</p>
          )}
        </div>
      )}

      {/* PATCH CRÍTICO: permite overflow horizontal do conteúdo */}
      <div className="px-6 pb-6 pt-2 overflow-x-auto overflow-y-visible min-w-0">
        {children}
      </div>
    </Card>
  );
}