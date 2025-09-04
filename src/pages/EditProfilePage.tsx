// frontend/src/pages/EditProfilePage.tsx (VERSÃO FINAL E COM EDIÇÃO)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, updateUserProfile } from '../services/api';
import { UserData } from '../types/user';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';

const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { login } = useAuth(); // Usamos 'login' para atualizar o contexto

  const [formData, setFormData] = useState({ firstName: '', lastName: '' });

  const { data: userProfile, isLoading, error } = useQuery<UserData, Error>({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
  });

  const { mutate: updateProfileMutate, isPending, isSuccess, error: updateError } = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (updatedUserData) => {
      // 1. ATUALIZA O ESTADO GLOBAL no AuthContext
      login(updatedUserData);
      
      // 2. Invalida a query local desta página
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      
      // 3. ATIVA O REDIRECIONAMENTO APÓS 2 SEGUNDOS
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    },
  });

  // 3. Efeito para popular o formulário quando os dados chegam da API
  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
      });
    }
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutate(formData);
  };

  if (isLoading) {
    return <div className="text-center p-6">A carregar perfil...</div>;
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">Erro: {error.message}</div>;
  }

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
              <CardDescription>O seu perfil foi atualizado. A redirecionar...</CardDescription>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Editar Perfil</CardTitle>
            <CardDescription>Atualize os seus dados pessoais.</CardDescription>
          </CardHeader>
          <CardContent>
            {updateError && <div className="p-3 mb-4 ...">{(updateError as Error).message}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid gap-1.5">
                <Label htmlFor="firstName">Primeiro Nome</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lastName">Último Nome</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={userProfile?.email || ''} disabled />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'A Guardar...' : 'Guardar Alterações'}
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

export default EditProfilePage;
// frontend/src/services/api.ts (VERSÃO FINAL E COM EDIÇÃO)