// src/components/patterns/ConfirmDialog.tsx
import React from 'react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { Label } from '../ui/Label';

interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Se definido, obriga a marcar a checkbox para confirmar */
  requireCheckboxLabel?: string;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  requireCheckboxLabel,
}: ConfirmDialogProps) {
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (!open) setChecked(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <Card className="w-full max-w-md" role="dialog" aria-modal="true">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>

        {requireCheckboxLabel && (
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirmDialogCheckbox"
                checked={checked}
                onCheckedChange={(c) => setChecked(Boolean(c))}
              />
              <Label htmlFor="confirmDialogCheckbox">{requireCheckboxLabel}</Label>
            </div>
          </CardContent>
        )}

        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading || (!!requireCheckboxLabel && !checked)}
          >
            {loading ? 'A processar…' : confirmText}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}