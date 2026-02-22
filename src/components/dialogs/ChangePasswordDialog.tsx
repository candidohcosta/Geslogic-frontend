// src/components/dialogs/ChangePasswordDialog.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { changeUserPassword } from '../../services/api';
import PasswordStrengthIndicator from '../../components/PasswordStrengthIndicator';
import { validatePassword } from '../../lib/validation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Guardar o foco anterior para restaurar ao fechar
  const prevActiveElRef = useRef<HTMLElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    prevActiveElRef.current = document.activeElement as HTMLElement | null;

    // Foco inicial no primeiro campo
    const t = setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      // Restaurar foco
      prevActiveElRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  const { mutate: changePasswordMutate, isPending, isSuccess, error } = useMutation({
    mutationFn: changeUserPassword,
    onSuccess: () => {
      // Mantém exatamente o teu comportamento: logout após 2s
      setTimeout(() => {
        logout();
        // A tua função de logout deverá levar o utilizador ao login
      }, 2000);
    },
  });

  const passwordsMatch = useMemo(
    () => newPassword === confirmNewPassword && newPassword !== '',
    [newPassword, confirmNewPassword]
  );
  const passwordValidationResults = useMemo(() => validatePassword(newPassword), [newPassword]);
  const isPasswordValid = useMemo(() => passwordValidationResults.every((r) => r.valid), [passwordValidationResults]);
  const isFormValid = isPasswordValid && passwordsMatch && currentPassword !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isPending) return;
    changePasswordMutate({ currentPassword, newPassword });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      onMouseDown={(e) => {
        // Fechar ao clicar no overlay (mas não no card)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Conteúdo */}
      <div className="relative w-full max-w-md">
        {/* Sucesso (mantém o teu overlay visual) */}
        {isSuccess && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardContent className="p-6 text-center space-y-4">
                <div className="text-green-500 mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                       strokeWidth={2} stroke="currentColor" className="h-8 w-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <CardTitle>Sucesso!</CardTitle>
                <CardDescription>A sua password foi alterada. Por favor, faça login novamente.</CardDescription>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="relative">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle id="change-password-title">Alterar Palavra-passe</CardTitle>
                <CardDescription>Atualize a sua palavra-passe de forma segura.</CardDescription>
              </div>

              {/* Botão fechar */}
              <button
                type="button"
                onClick={onClose}
                className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Fechar"
                title="Fechar"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">
                {(error as Error).message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="currentPassword">Palavra-passe Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  ref={firstFieldRef}
                />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="newPassword">Nova Palavra-passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="confirmNewPassword">Confirmar Nova Palavra-passe</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
                {newPassword && (
                  <p className={`mt-2 text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordsMatch ? '✓' : '✗'} As palavras-passe coincidem
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full !mt-6" disabled={!isFormValid || isPending}>
                {isPending ? 'A Alterar...' : 'Alterar Palavra-passe'}
              </Button>
            </form>
          </CardContent>

          <CardFooter>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Cancelar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ChangePasswordDialog;