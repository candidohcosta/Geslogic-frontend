// frontend/src/pages/EditPolicyPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPolicyById, createPolicy, updatePolicy } from '../services/api';
import { UserRole } from '../types/user';
import { FilePurpose } from '../types/file';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { SingleFileUpload } from '../components/ui/SingleFileUpload';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'; 
import { fetchCompanies } from '../services/api'; 

interface FileData {
  id: string;
  url: string;
  displayName: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

const EditPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const { policyId } = useParams<{ policyId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const isEditing = !!policyId;

  const [name, setName] = useState('');
  const [consentText, setConsentText] = useState('');
  const [documentFile, setDocumentFile] = useState<FileData | null>(null);

  const { data: existingPolicy, isLoading } = useQuery({
    queryKey: ['policy', policyId],
    queryFn: () => fetchPolicyById(policyId!),
    enabled: isEditing, // Só busca se estiver a editar
  });

   const [tempOwnerId] = useState(() => {
    const id = `temp_${uuidv4()}`;
    console.log('DEBUG: tempOwnerId gerado:', id); // <-- LOG AQUI
    return id;
  });

// Estado para a empresa selecionada (apenas para Platform Admin)
const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

// useQuery para buscar a lista de empresas (apenas para Platform Admin)
const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<CompanyOption[], Error>({
  queryKey: ['companies'],
  queryFn: fetchCompanies,
  enabled: user?.role === UserRole.PLATFORM_ADMIN, // Só busca se for Platform Admin
});

  console.log('TESTE DA CONSOLA:', tempOwnerId);

useEffect(() => {
  if (isEditing && existingPolicy) {
    setName(existingPolicy.name);
    setConsentText(existingPolicy.consentText);
    
    // Lógica para o documento
    if (existingPolicy.document) {
      setDocumentFile({ 
        id: existingPolicy.document.id, 
        url: existingPolicy.document.url, 
        displayName: existingPolicy.document.displayName 
      });
    } else {
      setDocumentFile(null); // Limpa se não houver documento
    }
    
    // +++ LÓGICA DO selectedCompanyId PARA EDIÇÃO +++
    // Se a política já tem uma empresa, selecionamo-la no dropdown
    if (existingPolicy.company) {
      setSelectedCompanyId(existingPolicy.company.id);
    } else {
      setSelectedCompanyId(null); // Se não tem empresa, é da Plataforma
    }
  } 
  // +++ LÓGICA DO selectedCompanyId PARA CRIAÇÃO +++
  // Se estamos a criar E é um Platform Admin E temos empresas carregadas...
  // ...definimos a seleção para 'Plataforma' por defeito.
  else if (!isEditing && user?.role === UserRole.PLATFORM_ADMIN) {
    setSelectedCompanyId(null); // Define o padrão para 'Plataforma' (null)
  }

}, [existingPolicy, isEditing, user?.role]); 


    // UMA MUTAÇÃO PARA CRIAR
    const { mutate: createPolicyMutate, isPending: isCreating } = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['policies'] });
        navigate('/policy-documents');
    },
    });

    // UMA MUTAÇÃO PARA ATUALIZAR
    const { mutate: updatePolicyMutate, isPending: isUpdating } = useMutation({
    mutationFn: updatePolicy,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['policies'] });
        queryClient.invalidateQueries({ queryKey: ['policy', policyId] });
        navigate('/policy-documents');
    },
    });

// +++ LÓGICA DE VALIDAÇÃO DO FORMULÁRIO +++
// Usa useMemo para que só seja re-calculado quando os estados mudam
const isFormValid = useMemo(() => {
  const allFieldsFilled = name.trim() !== '' && consentText.trim() !== '';
  const documentAttached = documentFile !== null;
  
  // Se estiver a criar, todos os campos e o documento são necessários
  if (!isEditing) {
    return allFieldsFilled && documentAttached;
  }
  // Se estiver a editar, os campos são necessários, e o documento
  // pode ser opcional ou existente
  return allFieldsFilled; 

}, [name, consentText, documentFile, isEditing]);
// --- FIM DA LÓGICA DE VALIDAÇÃO ---

    // Combina os estados de 'pending' para o botão
    const isPending = isCreating || isUpdating;

  // Adicionar um log para o estado do botão
  console.log('--- EditPolicyPage ---');
  console.log('isCreating:', isCreating);
  console.log('isUpdating:', isUpdating);
  console.log('isPending (disabled prop):', isPending);
  console.log('----------------------');


    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      const finalOwnerIdForFile = isEditing ? policyId! : tempOwnerId;
      const basePolicyData = { name, consentText };
      const policyDataWithDocument = { ...basePolicyData, document_file_id: documentFile?.id || null };
      let finalPolicyDataToSend: any = { ...policyDataWithDocument };

      // --- AQUI ESTÁ A CORREÇÃO PARA O 'companyId' (integrada na tua lógica) ---
      // Se estamos a CRIAR uma política E o utilizador é um Company Admin,
      // adicionamos o companyId para que o backend possa validar.
      if (!isEditing && user?.role === UserRole.COMPANY_ADMIN && user.companyId) {
        finalPolicyDataToSend = { ...finalPolicyDataToSend, companyId: user.companyId };
      }
      // Se for Platform Admin e tiver especificado um companyId no formulário,
      // o que faríamos com um Select de empresas (funcionalidade ainda por adicionar)
      else if (user?.role === UserRole.PLATFORM_ADMIN) {
         finalPolicyDataToSend = { ...finalPolicyDataToSend, companyId: selectedCompanyId || null };
       }
      // --- FIM DA CORREÇÃO ---

      // A tua lógica de 'tempOwnerId' e 'finalOwnerIdForFile' é importante para o updateFileOwner.
      // Vamos garantir que este campo é passado para a mutação de criação.
      // NOVO: Adiciona tempOwnerId ao payload apenas para a criação se houver um ficheiro
      if (!isEditing && documentFile?.id) {
        finalPolicyDataToSend = { ...finalPolicyDataToSend, tempOwnerId: finalOwnerIdForFile };
      }

      if (isEditing) {
        updatePolicyMutate({ policyId: policyId!, data: finalPolicyDataToSend });
      } else {
        createPolicyMutate(finalPolicyDataToSend);
      }
    };
  
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;
  if (isLoading) return <div>A carregar...</div>;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Política' : 'Criar Nova Política'}</CardTitle>
        <CardDescription>Preencha os detalhes e anexe o documento PDF.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Nome da Política</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="consentText">Texto de Consentimento</Label>
          <Textarea id="consentText" value={consentText} onChange={(e) => setConsentText(e.target.value)} />
        </div>
{/* +++ AQUI ESTÁ O NOVO SELECT PARA A EMPRESA +++ */}
{user?.role === UserRole.PLATFORM_ADMIN && (
  <div className="grid w-full items-center gap-1.5">
    <Label htmlFor="ownerCompany">Empresa Proprietária (Opcional)</Label>
    <Select
      value={selectedCompanyId || 'platform'} // 'platform' é um valor que representa null
      onValueChange={(value) => setSelectedCompanyId(value === 'platform' ? null : value)}
      disabled={isLoadingCompanies}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione uma empresa..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="platform">Plataforma (Padrão)</SelectItem>
        {companies.map((comp: CompanyOption) => (
          <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
{/* --- FIM DO NOVO SELECT --- */}        
        <div className="grid gap-1.5">
          <Label>Documento PDF</Label>
          <SingleFileUpload
            ownerType="PolicyDocument"
            ownerId={isEditing ? (policyId!) : tempOwnerId} // Usa um ID temporário se estiver a criar
            purpose={FilePurpose.POLICY_DOCUMENT} // Podemos criar um 'POLICY_DOCUMENT'
            accept=".pdf,.doc,.docx"
            // A 'prop' agora lê do nosso novo estado
            currentFileUrl={documentFile?.url}
            currentFileName={documentFile?.displayName || null}  // Passa o nome do ficheiro
            onUploadSuccess={(newFile) => {
                console.log('DEBUG: SingleFileUpload onUploadSuccess. newFile.id:', newFile.id);
              // Quando o upload é bem-sucedido, ATUALIZAMOS O NOSSO ESTADO LOCAL
              setDocumentFile({ id: newFile.id, url: newFile.url, displayName: newFile.displayName });
            }}
            
            onFileClear={() => setDocumentFile(null)}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end space-x-2">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending || !isFormValid}>
          {isPending ? 'A Guardar...' : (isEditing ? 'Guardar Alterações' : 'Criar Política')}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EditPolicyPage;