// frontend/src/pages/EditTemplatePage.tsx (VERSÃO COMPLETA)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEmailTemplateById, createEmailTemplate, updateEmailTemplate, fetchCompanies } from '../services/api';
import { UserRole } from '../types/user';
import { EmailTemplateType } from '../types/email'; // Precisaremos deste enum
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import RichTextEditor from '../components/ui/RichTextEditor';
import { fetchTemplatePlaceholders } from '../services/api';
import { copyToClipboard } from '../lib/utils';
import { Checkbox } from '../components/ui/Checkbox';

interface CompanyOption {
  id: string;
  name: string;
  defaultSignatureHtml?: string | null;
}

const EditTemplatePage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estados locais para o formulário
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<EmailTemplateType | ''>('');
  const [companyId, setCompanyId] = useState<string | 'platform'>('platform');
  const [includeSignature, setIncludeSignature] = useState(true);

  const [availablePlaceholders, setAvailablePlaceholders] = useState<string[]>([]);

  const isEditing = Boolean(templateId);


  // Query para buscar os dados do template (só corre se estiver a editar)
  const { data: templateData, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['emailTemplate', templateId],
    queryFn: () => fetchEmailTemplateById(templateId!),
    enabled: isEditing,
  });

  // Query para buscar as empresas (só para o Platform Admin)
  const { data: companies = [] } = useQuery<CompanyOption[]>({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const selectedCompany = companies.find((c: CompanyOption) => c.id === companyId);
  const companyHasSignature = !!selectedCompany?.defaultSignatureHtml;

const filteredEmailTypes = useMemo(() => {
  const allTypes = Object.values(EmailTemplateType);

  // Se o template for para a plataforma (companyId === 'platform')
  if (companyId === 'platform') {
    // Mostra todos os tipos
    return allTypes;
  } else {
    // Se for para uma empresa, filtra e mostra apenas os que começam com "COMPANY_"
    return allTypes.filter(t => t.startsWith('COMPANY_'));
  }
}, [companyId, EmailTemplateType]); // A lista é recalculada sempre que o 'companyId' muda

// Esta é a nossa única "fonte da verdade" para a sincronização
useEffect(() => {
  // Se os dados da API chegaram...
  if (templateData) {
    // ...nós populamos os nossos estados de formulário.
    setName(templateData.name);
    setSubject(templateData.subject);
    setBody(templateData.body);
    setType(templateData.type);
    setCompanyId(templateData.company?.id || 'platform');
    setIncludeSignature(templateData.includeSignature);
  } else if (!isEditing) {
    // Se NÃO estamos em modo de edição (ou seja, estamos a criar um novo),
    // garantimos que o formulário está limpo.
    setName('');
    setSubject('');
    setBody('');
    setType('');
    setCompanyId(user?.role === UserRole.PLATFORM_ADMIN ? 'platform' : user?.companyId || '');
    setIncludeSignature(true);
  }
}, [templateData, isEditing, user]); // O efeito reage a mudanças nestas 3 variáveis


useEffect(() => {
  // Se o tipo selecionado atualmente NÃO estiver na nova lista de tipos válidos...
  if (type && !filteredEmailTypes.includes(type)) {
    // ...limpa a seleção.
    setType('');
  }
}, [filteredEmailTypes, type]); // Ouve as mudanças em ambas as variáveis

    useEffect(() => {
    // Se um tipo de template for selecionado...
    if (type) {
        // ...vai buscar os placeholders correspondentes.
        const getPlaceholders = async () => {
        try {
            const placeholders = await fetchTemplatePlaceholders(type);
            setAvailablePlaceholders(placeholders);
        } catch (error) {
            console.error("Failed to fetch placeholders:", error);
            setAvailablePlaceholders([]); // Limpa a lista em caso de erro
        }
        };
        getPlaceholders();
    } else {
        // Se nenhum tipo estiver selecionado, a lista fica vazia.
        setAvailablePlaceholders([]);
    }
    }, [type]); // <-- Este useEffect "ouve" as mudanças na variável 'type'

  // Mutação para criar ou atualizar
  const { mutate, isPending, error } = useMutation({
    mutationFn: (data: any) => isEditing ? updateEmailTemplate({ id: templateId!, templateData: data }) : createEmailTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      navigate('/email-templates');
    },
  });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // O objeto de dados a enviar para a ATUALIZAÇÃO
      const dataForUpdate = {
        name,
        subject,
        body,
        includeSignature,
        // Não incluímos 'type' ou 'companyId' na atualização
      };
      
      // O objeto para a CRIAÇÃO
      const dataForCreate = {
        name,
        subject,
        body,
        type,
        companyId: companyId === 'platform' ? undefined : companyId,
        includeSignature,
      };

      mutate(isEditing ? dataForUpdate : dataForCreate);
    };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;
  if (isLoadingTemplate) return <div>A carregar template...</div>;

const isAdmin = user?.role === UserRole.COMPANY_ADMIN;
const isOwnedByAdmin = isAdmin && templateData?.company?.id === user?.companyId;
const isPlatformAdmin = user?.role === UserRole.PLATFORM_ADMIN;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Template de Email' : 'Criar Novo Template'}</CardTitle>
        <CardDescription>Crie modelos de email para a sua comunicação automatizada.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Nome Interno do Template</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="subject">Assunto do Email</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="type">Tipo (Gatilho)</Label>
              {/* <Select value={type} onValueChange={(value) => setType(value as EmailTemplateType)} required> */}
              <Select
  // O valor é o estado 'type' OU o valor que vem dos dados da API,
  // com prioridade para o estado 'type' para permitir a edição.
  value={type || templateData?.type || ''}
  onValueChange={(value) => setType(value as EmailTemplateType)}
  required
  disabled={isEditing}
>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                <SelectContent>
                  {filteredEmailTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {user.role === UserRole.PLATFORM_ADMIN && (
              <div className="grid gap-1.5">
                <Label htmlFor="companyId">Associado a</Label>
                <Select value={companyId} onValueChange={setCompanyId} disabled={isEditing} >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Plataforma (Padrão)</SelectItem>
                    {companies.map((company: any) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>Corpo do Email</Label>
            <div className="bg-white rounded-md border">
              <RichTextEditor value={body || templateData?.body || ''} onChange={setBody} />
            </div>
{availablePlaceholders.length > 0 && (
  <div className="pt-2">
    <p className="text-xs text-muted-foreground mb-2">
      Variáveis disponíveis (clique para copiar):
    </p>
    <div className="flex flex-wrap gap-2">
      {availablePlaceholders.map(placeholder => (
        <button
          key={placeholder}
          type="button" // Garante que não submete o formulário
          /* onClick={() => navigator.clipboard.writeText(`{{${placeholder}}}`)} */
            onClick={() => {
                copyToClipboard(`{{${placeholder}}}`);
                // (Opcional) Podemos adicionar um feedback visual, como um toast
                alert(`'{{${placeholder}}}' copiado!`);
            }}
          className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 font-mono"
          title="Copiar para a área de transferência"
        >
          {`{{${placeholder}}}`}
        </button>
      ))}
    </div>
  </div>
)}            


<div className="flex items-center space-x-2 pt-4">
  <Checkbox
    id="includeSignature"
    checked={includeSignature}
    onCheckedChange={(checked) => {
      const newCheckedState = Boolean(checked);
      setIncludeSignature(newCheckedState);
      // O AVISO
      if (newCheckedState && companyId !== 'platform' && !companyHasSignature) { // 'companyHasSignature' é uma nova variável
        alert("Aviso: A empresa selecionada não tem uma assinatura padrão configurada.");
      }
    }}
  />
  <Label htmlFor="includeSignature">Incluir assinatura padrão neste email</Label>
</div>
          </div>
          {error && <p className="text-red-500">{(error as Error).message}</p>}
        </form>
      </CardContent>
      <CardFooter className="justify-end space-x-2">
        <Button variant="outline" onClick={() => navigate('/email-templates')}>Cancelar</Button>
        {(isPlatformAdmin || isOwnedByAdmin) && (
    <Button onClick={handleSubmit} disabled={isPending}>
      {isPending ? 'A Guardar...' : 'Guardar Alterações'}
        </Button>
        )}
      </CardFooter>
    </Card>
  );
};
export default EditTemplatePage;