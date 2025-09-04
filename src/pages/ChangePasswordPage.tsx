// frontend/src/pages/ChangePasswordPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { changeUserPassword } from '../services/api';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { validatePassword } from '../lib/validation';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const { mutate: changePasswordMutate, isPending, isSuccess, error } = useMutation({
    mutationFn: changeUserPassword,
    onSuccess: () => {
      // Após o sucesso, esperamos 2 segundos e depois deslogamos o utilizador,
      // forçando-o a fazer login com a nova password.
      setTimeout(() => {
        logout();
        // Idealmente, a função de logout do AuthContext seria chamada aqui.
        // Por simplicidade, navegamos para o login.
        //navigate('/login'); 
      }, 2000);
    },
  });

  const passwordsMatch = useMemo(() => newPassword === confirmNewPassword && newPassword !== '', [newPassword, confirmNewPassword]);
  const passwordValidationResults = useMemo(() => validatePassword(newPassword), [newPassword]);
  const isPasswordValid = useMemo(() => passwordValidationResults.every(result => result.valid), [passwordValidationResults]);
  const isFormValid = isPasswordValid && passwordsMatch && currentPassword !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    changePasswordMutate({ currentPassword, newPassword });
  };

  return (
    <>
      {isSuccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-green-500 mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-8 w-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle>Sucesso!</CardTitle>
              <CardDescription>A sua password foi alterada. Por favor, faça login novamente.</CardDescription>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Alterar Palavra-passe</CardTitle>
            <CardDescription>Atualize a sua palavra-passe de forma segura.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">{(error as Error).message}</div>}
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="currentPassword">Palavra-passe Atual</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="newPassword">Nova Palavra-passe</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <PasswordStrengthIndicator password={newPassword} />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="confirmNewPassword">Confirmar Nova Palavra-passe</Label>
                <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
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
            <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>Voltar</Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default ChangePasswordPage;