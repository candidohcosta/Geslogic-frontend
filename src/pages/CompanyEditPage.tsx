// frontend/src/pages/CompanyEditPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCompanyDetails, updateCompany, fetchLocationByPostalCode } from '../services/api';
import { UserData, UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import RichTextEditor from '../components/ui/RichTextEditor';
import { FilePurpose } from '../types/file';

interface CompanyData {
  id: string; name: string; slug: string; email: string; nif: string; address?: string;
  postalCode?: string; locality?: string; phone?: string; defaultSignatureHtml?: string | null;
  isActive: boolean; createdAt: string; updatedAt: string;
}

const CompanyEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyId: companyIdFromParams } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  
  // O formData agora é inicializado com 'null'
  const [formData, setFormData] = useState<Partial<CompanyData> | null>(null);

  // +++ A NOSSA LÓGICA DE DEPURAÇÃO +++
  console.log("--- Depuração CompanyEditPage ---");
  console.log("ID dos parâmetros do URL (companyIdFromParams):", companyIdFromParams);
  console.log("ID do utilizador logado (user.companyId):", user?.companyId);
  console.log("ID do utilizador logado (useParams<{ companyId?: string }>()):", useParams<{ companyId?: string }>());

  // A FONTE DA VERDADE PARA O ID
  // Se o URL tiver um ID, ele tem prioridade (ex: PlatformAdmin a editar uma empresa específica).
  // Se não, usamos o ID do CompanyAdmin logado.
  const companyId = companyIdFromParams || user?.companyId;

  console.log("ID final a ser usado na query:", companyId);
  console.log("---------------------------------");
  // --- FIM DA DEPURAÇÃO ---


  const { data: companyDetails, isLoading, error } = useQuery<CompanyData, Error>({
    queryKey: ['company', companyId],
    queryFn: () => fetchCompanyDetails(companyId!),
    enabled: !!companyId,
  });

  const { mutate: updateCompanyMutate, isPending, error: updateError, isSuccess } = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsEditing(false);
    },
  });

  // Este useEffect tem a única responsabilidade de preencher o formulário
  // com os dados da API quando eles chegam.
  useEffect(() => {
    if (companyDetails) {
      setFormData(companyDetails);
    }
  }, [companyDetails]);

  const handleInputChange = (e: { target: { name: string, value: any } }) => {
    setFormData(prev => prev ? { ...prev, [e.target.name]: e.target.value } : null);
  };

  const handlePostalCodeChange = async (newPostalCode: string) => {
    setFormData(prev => prev ? { ...prev, postalCode: newPostalCode } : null);
    const cleanedPostalCode = newPostalCode.replace(/[\s-]/g, '');
    if (cleanedPostalCode.length === 7) {
      try {
        const locationData = await fetchLocationByPostalCode(cleanedPostalCode);
        if (locationData) {
          setFormData(currentData => currentData ? { ...currentData, locality: locationData.locality } : null);
        }
      } catch (error) {
        console.error("Código postal não encontrado:", error);
        setFormData(currentData => currentData ? { ...currentData, locality: '' } : null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !formData) return;
    const dataToSend = { email: formData.email, address: formData.address, postalCode: formData.postalCode, locality: formData.locality, phone: formData.phone, defaultSignatureHtml: formData.defaultSignatureHtml };
    updateCompanyMutate({ companyId, companyData: dataToSend });
  };

  const handleEditToggle = () =>  {
    if (isEditing && companyDetails) {
      setFormData(companyDetails); // Restaura os dados ao cancelar
    }
    setIsEditing(prevState => !prevState);
  };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN  && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;
  
  // GUARDA DE LOADING: Só renderiza o resto se os dados base E os dados do formulário estiverem prontos
  if (isLoading || !formData) {
    return <div className="p-6 text-center">A carregar...</div>;
  }

  if (error) return <div className="p-6 text-center text-red-500">Erro: {error.message}</div>;

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Detalhes da Empresa</CardTitle>
          <CardDescription>
            {isEditing ? `A editar o perfil da empresa ${companyDetails?.name}.` : `A visualizar o perfil da empresa ${companyDetails?.name}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess && <div className="p-3 mb-4 ...">Empresa atualizada com sucesso!</div>}
          {updateError && <div className="p-3 mb-4 ...">{(updateError as Error).message}</div>}

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label htmlFor="name">Nome da Empresa</Label><Input id="name" value={formData.name || ''} disabled /></div>
              <div className="grid gap-1.5"><Label htmlFor="slug">Slug</Label><Input id="slug" value={formData.slug || ''} disabled /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" value={formData.email || ''} onChange={handleInputChange} disabled={!isEditing} className={isEditing && formData.email !== companyDetails?.email ? "border-blue-500 bg-blue-50" : ""} /></div>
              <div className="grid gap-1.5"><Label htmlFor="nif">NIF</Label><Input id="nif" value={formData.nif || ''} disabled /></div>
            </div>
            <div className="grid gap-1.5"><Label htmlFor="address">Morada</Label><Input id="address" name="address" value={formData.address || ''} onChange={handleInputChange} disabled={!isEditing} className={isEditing && formData.address !== companyDetails?.address ? "border-blue-500 bg-blue-50" : ""} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label htmlFor="postalCode">Código Postal</Label><Input id="postalCode" name="postalCode" value={formData.postalCode || ''} onChange={(e) => handlePostalCodeChange(e.target.value)} disabled={!isEditing} className={isEditing && formData.postalCode !== companyDetails?.postalCode ? "border-blue-500 bg-blue-50" : ""} /></div>
              <div className="grid gap-1.5"><Label htmlFor="locality">Localidade</Label><Input id="locality" name="locality" value={formData.locality || ''} onChange={handleInputChange} disabled={!isEditing} className={isEditing && formData.locality !== companyDetails?.locality ? "border-blue-500 bg-blue-50" : ""} /></div>
            </div>
            <div className="grid gap-1.5"><Label htmlFor="phone">Telefone</Label><Input id="phone" name="phone" value={formData.phone || ''} onChange={handleInputChange} disabled={!isEditing} className={isEditing && formData.phone !== companyDetails?.phone ? "border-blue-500 bg-blue-50" : ""} /></div>
            <div className="border-t pt-4 mt-4">
              <div className="grid w-full items-center gap-1.5">
                <Label>Assinatura de Email Padrão</Label>
                <CardDescription className="text-left pb-2">Esta assinatura será adicionada automaticamente ao final dos emails.</CardDescription>
                <div className={`rounded-md border ${!isEditing ? 'bg-gray-100' : 'bg-white'}`}>
                  <RichTextEditor
                    value={formData.defaultSignatureHtml || ''}
                    onChange={(value) => handleInputChange({ target: { name: 'defaultSignatureHtml', value } })}
                    readOnly={!isEditing} // <-- A CORREÇÃO PRINCIPAL
                    uploadOwner={{
                      ownerType: 'Company',
                      ownerId: companyId!,
                      purpose: FilePurpose.COMPANY_SIGNATURE_IMAGE, // Podemos refinar isto para 'COMPANY_ASSET'
                    }}
                  />
                </div>
              </div>
            </div>            
            {isEditing && (
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'A Guardar...' : 'Guardar Alterações'}
              </Button>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex flex-col md:flex-row md:justify-end gap-2">
          <Button variant="outline" className="w-full md:w-auto" onClick={() => isEditing ? handleEditToggle() : navigate(-1)}>
            {isEditing ? 'Cancelar' : 'Voltar'}
          </Button>
          {!isEditing && (
            <Button className="w-full md:w-auto" onClick={handleEditToggle}>Editar</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default CompanyEditPage;