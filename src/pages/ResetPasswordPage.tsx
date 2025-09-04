// src/pages/ResetPasswordPage.tsx (VERSÃO COMPLETA)

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { resetPassword } from '../services/api'; // Precisaremos desta nova função
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { validatePassword } from '../lib/validation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // Lê o token do parâmetro de URL (?token=...)

  // Estados locais para o formulário
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // useMutation para chamar o endpoint de reset de password
  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      // Após o sucesso, redireciona para o login após um pequeno atraso
      setTimeout(() => navigate('/login'), 3000);
    }
  });

  // Lógica de validação (reutilizada do ChangePasswordPage)
  const passwordsMatch = useMemo(() => newPassword === confirmPassword && newPassword !== '', [newPassword, confirmPassword]);
  const passwordValidationResults = useMemo(() => validatePassword(newPassword), [newPassword]);
  const isPasswordValid = useMemo(() => passwordValidationResults.every(result => result.valid), [passwordValidationResults]);
  const isFormValid = isPasswordValid && passwordsMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !token) return;
    mutate({ token, newPassword });
  };
  
  // Se não houver token no URL, mostra uma mensagem de erro
  if (!token) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>Token de recuperação inválido ou em falta. Por favor, peça um novo link de recuperação.</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <Card className="w-full max-w-sm"> {/* O nosso novo contentor principal */}
        <CardHeader>
          <CardTitle>Redefinir Password</CardTitle>
          {/* Podemos adicionar uma CardDescription aqui, se quisermos */}
        </CardHeader>
        <CardContent>
          {isSuccess ? (
          <div className="text-center p-4 bg-green-100 rounded">
            <p className="text-green-800">
              A sua password foi alterada com sucesso! Será redirecionado para a página de login.
            </p>
          </div>
          ) : (
          <>
            <p className="text-center text-gray-600 mt-2">
              Crie uma nova password segura.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-1.5">
                <Label>Nova Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required/>
                <PasswordStrengthIndicator password={newPassword} />
              </div>
              <div className="grid gap-1.5">
                <Label>Confirmar Nova Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required/>
                {newPassword && (
                  <p className={`mt-2 text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordsMatch ? '✓' : '✗'} As passwords coincidem
                  </p>
                )}
              </div>
              <Button type="submit" disabled={!isFormValid || isPending}>
                {isPending ? 'A Redefinir...' : 'Redefinir Password'}
              </Button>
              {error && <p className="text-red-500 text-sm text-center mt-2">{(error as Error).message}</p>}
            </form>
          </>
          )}
        </CardContent>
        <CardFooter className="flex-col"> {/* Usar flex-col para empilhar os links */}
          <div className="text-center ...">
            {/* ... (os teus links de "recuperar password" e "registar") ... */}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;