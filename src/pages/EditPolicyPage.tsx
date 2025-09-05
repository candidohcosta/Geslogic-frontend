// frontend/src/pages/EditPolicyPage.tsx

import React, { useState, useEffect } from 'react';
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

interface FileData {
  id: string;
  url: string;
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

  useEffect(() => {
    if (isEditing && existingPolicy) {
      setName(existingPolicy.name);
      setConsentText(existingPolicy.consentText);
      if (existingPolicy.document) {
        setDocumentFile({ id: existingPolicy.document.id, url: existingPolicy.document.url });
      }
    }
  }, [existingPolicy, isEditing]);


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

    // Combina os estados de 'pending' para o botão
    const isPending = isCreating || isUpdating;

    const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const policyData = { name, consentText, document_file_id: documentFile?.id || null };
    
    if (isEditing) {
        // Chama a mutação de update com o formato correto
        updatePolicyMutate({ policyId: policyId!, data: policyData });
    } else {
        // Chama a mutação de create com o formato correto
        createPolicyMutate(policyData);
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
        <div className="grid gap-1.5">
          <Label>Documento PDF</Label>
          <SingleFileUpload
            ownerType="PolicyDocument"
            ownerId={policyId || 'temp'} // Usa um ID temporário se estiver a criar
            purpose={FilePurpose.POLICY_DOCUMENT} // Podemos criar um 'POLICY_DOCUMENT'
            accept=".pdf,.doc,.docx"
            // A 'prop' agora lê do nosso novo estado
            currentFileUrl={documentFile?.url}
            
            onUploadSuccess={(newFile) => {
              // Quando o upload é bem-sucedido, ATUALIZAMOS O NOSSO ESTADO LOCAL
              setDocumentFile({ id: newFile.id, url: newFile.url });
            }}
            
            onFileClear={() => {
              // Ao limpar, limpamos o nosso estado local
              setDocumentFile(null);
            }}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end space-x-2">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'A Guardar...' : (isEditing ? 'Guardar Alterações' : 'Criar Política')}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EditPolicyPage;