// frontend/src/pages/CreateCompanyPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCompany, fetchLocationByPostalCode } from '../services/api';
import { UserRole } from '../types/user';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardHeader, CardDescription, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { InfoModal } from '../components/ui/InfoModal';

const CreateCompanyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estados locais para o formulário
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [nif, setNif] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [locality, setLocality] = useState('');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // useMutation para criar a empresa
  const { mutate: createCompanyMutate, isPending, error: mutationError } = useMutation({
    mutationFn: createCompany,
    onSuccess: (responseData) => {
      const newCompany = responseData.company; 
      setSuccess(`Empresa "${newCompany.name}" criada com sucesso!`);
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      // Limpa o formulário
      setName('');
      setSlug('');
      setEmail('');
      setNif('');
      setAddress('');
      setPostalCode('');
      setLocality('');
      setPhone('');
      
      setTimeout(() => {
      navigate('/companies/list');
    }, 2000);
    },
  });

  // Validação do NIF
  const validateNIF = (nifToValidate: string): boolean => {
    if (!nifToValidate || nifToValidate.length !== 9 || !/^\d+$/.test(nifToValidate) || nifToValidate.charAt(0) === '0') {
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setFormError(null);

    // Lógica de validação
    if (!name || !slug || !email || !nif) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (!validateNIF(nif)) {
      setFormError('Por favor, insira um NIF válido.');
      return;
    }
    
    // 1. COMEÇAMOS COM OS DADOS OBRIGATÓRIOS
    const companyData: any = { 
      name, 
      slug, 
      email, 
      nif, 
    };
    
    // 2. ADICIONAMOS OS CAMPOS OPCIONAIS APENAS SE ELES TIVEREM VALOR
    if (address) companyData.address = address;
    if (postalCode) companyData.postalCode = postalCode;
    if (locality) companyData.locality = locality;
    if (phone) companyData.phone = phone;    
    
    createCompanyMutate(companyData);
  };



  const handlePostalCodeChange = async (newPostalCode: string) => {
    setPostalCode(newPostalCode);
    const cleanedPostalCode = newPostalCode.replace(/[\s-]/g, '');
    
    if (cleanedPostalCode.length === 7) {
      try {
        const locationData = await fetchLocationByPostalCode(cleanedPostalCode);
        if (locationData) {
          setLocality(locationData.locality);
        }
      } catch (error) {
        console.error("Código postal não encontrado:", error);
        setLocality('');
      }
    }
  };

  if (!user || user.role !== UserRole.PLATFORM_ADMIN) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Criar Nova Empresa</CardTitle>
          <CardDescription>
            Preencha os detalhes abaixo para registar uma nova empresa no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mensagens de feedback */}
          {formError && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md">{formError}</div>}
          {success && <div className="p-3 mb-4 text-sm text-green-800 bg-green-100 rounded-md">{success}</div>}
          {mutationError && (
            <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md" role="alert">
              <p className="font-bold mb-1">Ocorreram os seguintes erros:</p>
              
              {(() => {
                // Navegamos até à mensagem de erro
                const errorMessage = (mutationError as any).cause?.response?.data?.message || mutationError.message;

                // AQUI ESTÁ A LÓGICA CORRIGIDA:
                // Verificamos se a mensagem é uma string e se contém vírgulas
                if (typeof errorMessage === 'string' && errorMessage.includes(' | ')) {
                  // Se sim, dividimo-la numa lista
                  return (
                    <ul className="list-disc list-inside">
                      {errorMessage.split(' | ').map((msg, index) => (
                        <li key={index}>{msg.trim()}</li> // .trim() para remover espaços extra
                      ))}
                    </ul>
                  );
                }
                
                // Se for uma string simples (ou outro tipo), mostramo-la diretamente
                return <p>{errorMessage}</p>;
              })()}
            </div>
          )}       

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="name">Nome da Empresa <span className="text-red-500">*</span></Label>
                <Input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="slug">Slug (URL amigável) <span className="text-red-500">*</span></Label>
                <Input type="text" id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="nif">NIF <span className="text-red-500">*</span></Label>
                <Input type="text" id="nif" value={nif} onChange={(e) => setNif(e.target.value)} maxLength={9} required />
              </div>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="address">Morada (Rua e Número)</Label>
              <Input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="postalCode">Código Postal</Label>
                <Input type="text" id="postalCode" value={postalCode} onChange={(e) => handlePostalCodeChange(e.target.value)} placeholder="0000-000" maxLength={8} />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="locality">Localidade</Label>
                <Input type="text" id="locality" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Preenchido automaticamente" />
              </div>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input type="text" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'A criar...' : 'Criar Empresa'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </CardFooter>
      </Card>
      {showSuccessModal && (
        <InfoModal
          title="Sucesso"
          message={success!}
          onConfirm={() => {
            setShowSuccessModal(false);
            // O teu redirecionamento aqui, se quiseres
            navigate('/companies/list');
          }}
        />
      )}
    </div>
    
  );
};

export default CreateCompanyPage;
