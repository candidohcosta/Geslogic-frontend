// frontend/src/pages/ForgotPasswordPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { forgotPassword } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate(); 

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: forgotPassword,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(email);
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar Password</CardTitle>
          <CardDescription>
            Insira o seu email e enviaremos um link para redefinir a sua password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="text-center p-4 bg-green-100 rounded text-green-800">
              <p>Se existir uma conta com o seu endereço de email, as instruções foram enviadas. Por favor, verifique a sua caixa de entrada.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="o.seu@email.com"
                />
              </div>
              
              {error && <p className="text-red-500 text-sm text-center">{(error as Error).message}</p>}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'A Enviar...' : 'Enviar Link de Recuperação'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button variant="secondary" className="w-full" asChild>
            <Link to="/login">Voltar ao Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;