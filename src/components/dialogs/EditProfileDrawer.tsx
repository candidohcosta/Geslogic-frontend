// src/components/dialogs/EditProfileDrawer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, updateUserProfile } from '../../services/api';
import { UserData } from '../../types/user';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { TwoFactorSetup } from '../../components/auth/TwoFactorSetup';

interface EditProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileDrawer: React.FC<EditProfileDrawerProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ firstName: '', lastName: '' });

  // Foco e ESC
  const prevActiveElRef = useRef<HTMLElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    prevActiveElRef.current = document.activeElement as HTMLElement | null;

    const t = setTimeout(() => firstFieldRef.current?.focus(), 0);

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
      prevActiveElRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  const { data: userProfile, isLoading, error } = useQuery<UserData, Error>({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    enabled: isOpen, // só quando aberto
  });

  const { mutate: updateProfileMutate, isPending, isSuccess, error: updateError } = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (updatedUserData) => {
      // Mantém exatamente a tua lógica: atualizar sessão + invalidar cache
      login(updatedUserData);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      // Em vez de navegar, fechamos o drawer após 2s (mostrando o banner de sucesso)
      setTimeout(() => {
        onClose();
      }, 1000);
    },
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
      });
    }
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      onMouseDown={(e) => {
        // fechar ao clicar fora do painel
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Drawer */}
      <aside
        className={`
          relative ml-auto h-full w-full max-w-xl bg-white shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header simples com título e botão fechar */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 id="edit-profile-title" className="text-lg font-semibold">Editar Perfil</h2>
            <p className="text-sm text-gray-500">Atualize os seus dados e segurança.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Fechar"
            title="Fechar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Conteúdo com scroll interno */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Estado do carregamento/erro geral do perfil */}
          {isLoading && <div className="text-center p-4">A carregar perfil...</div>}
          {error && <div className="text-center p-4 text-red-500">Erro: {error.message}</div>}

          {/* Sucesso (banner central, igual ao teu padrão de página) */}
          {isSuccess && (
            <Card className="w-full max-w-md mx-auto">
              <CardContent className="p-6 text-center space-y-4">
                <div className="text-green-500 mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                       strokeWidth={2} stroke="currentColor" className="h-8 w-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <CardTitle>Sucesso!</CardTitle>
                <CardDescription>O seu perfil foi atualizado.</CardDescription>
              </CardContent>
            </Card>
          )}

          {/* CARTÃO 1: DADOS PESSOAIS (igual à tua página) */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
              <CardDescription>Atualize o seu nome e informações de conta.</CardDescription>
            </CardHeader>
            <CardContent>
              {updateError && (
                <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded">
                  {(updateError as Error).message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="firstName">Primeiro Nome</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    ref={firstFieldRef}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lastName">Último Nome</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={userProfile?.email || ''} disabled className="bg-gray-100" />
                </div>

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'A Guardar...' : 'Guardar Alterações'}
                </Button>
              </form>
            </CardContent>

            <CardFooter>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Cancelar
              </Button>
            </CardFooter>
          </Card>

          {/* CARTÃO 2: SEGURANÇA (2FA) — mantém exatamente o teu componente */}
          <div className="w-full">
            <TwoFactorSetup />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default EditProfileDrawer;