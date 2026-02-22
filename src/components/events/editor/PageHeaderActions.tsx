import * as React from 'react';
import { Button } from '../../ui/Button';
import { useNavigate } from 'react-router-dom';

export function PageHeaderActions({
  title,
  subtitle,
  onSave,
  isSaving,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onSave: () => void;
  isSaving?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => navigate('/events/list')}>Voltar</Button>
        <Button onClick={onSave} disabled={!!isSaving}>
          {isSaving ? 'A Guardar...' : 'Guardar Alterações'}
        </Button>
      </div>
    </div>
  );
}