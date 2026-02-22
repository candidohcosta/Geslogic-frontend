// src/components/admin/AdminDrawer.tsx
import React, { useRef, useState, useMemo } from 'react';
import { Drawer } from '../patterns/Drawer';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Label } from '../ui/Label';
import { UserRole } from '../../types/user';

type Mode = 'create' | 'edit';

export interface AdminFormValues {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole.PLATFORM_ADMIN | UserRole.COMPANY_ADMIN;
  companyId?: string;
  forceTwoFactor?: boolean;
}

interface AdminDrawerProps {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  initialValues?: Partial<AdminFormValues>;
  companies?: { id: string; name: string }[];
  onSubmit: (values: AdminFormValues) => Promise<void>;
}

export function AdminDrawer({
  open,
  mode,
  onClose,
  initialValues,
  companies = [],
  onSubmit,
}: AdminDrawerProps) {
  const [form, setForm] = useState<AdminFormValues>(() => ({
    firstName: initialValues?.firstName || '',
    lastName: initialValues?.lastName || '',
    email: initialValues?.email || '',
    role: (initialValues?.role as any) || UserRole.COMPANY_ADMIN,
    companyId: initialValues?.companyId,
    forceTwoFactor: initialValues?.forceTwoFactor ?? false,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setForm({
        firstName: initialValues?.firstName || '',
        lastName: initialValues?.lastName || '',
        email: initialValues?.email || '',
        role: (initialValues?.role as any) || UserRole.COMPANY_ADMIN,
        companyId: initialValues?.companyId,
        forceTwoFactor: initialValues?.forceTwoFactor ?? false,
      });
      setErrorMsg(null);
      setSubmitting(false);
    }
  }, [open, initialValues]);

  const companyRequired = form.role === UserRole.COMPANY_ADMIN;

  const canSubmit = useMemo(() => {
    if (!form.firstName.trim()) return false;
    if (!form.lastName.trim()) return false;
    if (!form.email.trim()) return false;
    if (companyRequired && !form.companyId) return false;
    return true;
  }, [form, companyRequired]);

  const handleChange = (name: keyof AdminFormValues, value: any) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Ocorreu um erro ao guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title={mode === 'create' ? 'Novo Administrador' : 'Editar Administrador'}
      subtitle={mode === 'create' ? 'Crie um novo administrador.' : 'Atualize os dados do administrador.'}
      size="md"
      initialFocusRef={firstInputRef}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={submit} disabled={!canSubmit || submitting}>
            {submitting ? 'A guardar…' : (mode === 'create' ? 'Criar' : 'Guardar')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-2 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
            {errorMsg}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="admin-firstName">Primeiro Nome</Label>
            <Input
              id="admin-firstName"
              ref={firstInputRef}
              data-autofocus
              value={form.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="admin-lastName">Apelido</Label>
            <Input
              id="admin-lastName"
              value={form.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Perfil</Label>
            <Select
              value={form.role}
              onValueChange={(v) => handleChange('role', v as any)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.COMPANY_ADMIN}>Administrador de Empresa</SelectItem>
                <SelectItem value={UserRole.PLATFORM_ADMIN}>Administrador de Plataforma</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {companyRequired && (
            <div className="grid gap-1.5">
              <Label>Empresa</Label>
              <Select
                value={form.companyId || ''}
                onValueChange={(v) => handleChange('companyId', v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="admin-2fa"
            checked={!!form.forceTwoFactor}
            onCheckedChange={(c) => handleChange('forceTwoFactor', Boolean(c))}
          />
          <div>
            <Label htmlFor="admin-2fa">Obrigar 2FA</Label>
            <p className="text-xs text-gray-500">Se ativo, este administrador terá de validar um código enviado por email ao iniciar sessão.</p>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
