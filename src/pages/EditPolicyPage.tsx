// frontend/src/pages/EditPolicyPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPolicyById,
  createPolicy,
  updatePolicy,
  fetchCompanies,
} from '../services/api';
import { UserRole } from '../types/user';
import { FilePurpose } from '../types/file';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { SingleFileUpload } from '../components/ui/SingleFileUpload';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
import { FileText, Eye, X } from 'lucide-react';

interface FileData {
  id: string;
  url: string;
  displayName: string;
}
interface CompanyOption {
  id: string;
  name: string;
}

/** TODO: Ler isto das Configurações da Plataforma (ex.: /platform-settings) */
const MAX_FILE_MB = 10;

const EditPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const { policyId } = useParams<{ policyId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isEditing = !!policyId;

  const [name, setName] = useState('');
  const [consentText, setConsentText] = useState('');
  const [documentFile, setDocumentFile] = useState<FileData | null>(null);

  // Preview drawer (reutiliza padrão do File Manager)
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: existingPolicy, isLoading: isLoadingPolicy } = useQuery({
    queryKey: ['policy', policyId],
    queryFn: () => fetchPolicyById(policyId!),
    enabled: isEditing,
  });

  // ID temporário para associação do upload antes de criar o registo
  const [tempOwnerId] = useState(() => `temp_${uuidv4()}`);

  // Empresa selecionada (para Platform Admin)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Empresas (apenas para Platform Admin)
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<CompanyOption[], Error>({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  // Preload dos campos quando em edição / defaults quando em criação
  useEffect(() => {
    if (isEditing && existingPolicy) {
      setName(existingPolicy.name);
      setConsentText(existingPolicy.consentText);

      if (existingPolicy.document) {
        setDocumentFile({
          id: existingPolicy.document.id,
          url: existingPolicy.document.url,
          displayName: existingPolicy.document.displayName,
        });
      } else {
        setDocumentFile(null);
      }

      if (existingPolicy.company) {
        setSelectedCompanyId(existingPolicy.company.id);
      } else {
        setSelectedCompanyId(null); // Plataforma
      }
    } else if (!isEditing && user?.role === UserRole.PLATFORM_ADMIN) {
      setSelectedCompanyId(null); // Plataforma por omissão
    }
  }, [existingPolicy, isEditing, user?.role]);

  // Mutations
  const { mutate: createPolicyMutate, isPending: isCreating } = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      navigate('/policy-documents');
    },
  });

  const { mutate: updatePolicyMutate, isPending: isUpdating } = useMutation({
    mutationFn: updatePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy', policyId] });
      navigate('/policy-documents');
    },
  });

  // Validação do formulário
  const isFormValid = useMemo(() => {
    const allFieldsFilled = name.trim() !== '' && consentText.trim() !== '';
    const documentAttached = documentFile !== null;

    if (!isEditing) return allFieldsFilled && documentAttached;
    return allFieldsFilled;
  }, [name, consentText, documentFile, isEditing]);

  const isPending = isCreating || isUpdating;

  // Guardas de acesso — não quebram a ordem dos hooks
  const isForbidden =
    !user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN);

  // Submit (sem evento – chamamos diretamente no botão)
  const submitPolicy = () => {
    const finalOwnerIdForFile = isEditing ? policyId! : tempOwnerId;

    const basePolicyData = { name, consentText };
    const policyDataWithDocument = { ...basePolicyData, document_file_id: documentFile?.id || null };

    let finalPolicyDataToSend: any = { ...policyDataWithDocument };

    // companyId — lógica conforme o tipo de utilizador
    if (!isEditing && user?.role === UserRole.COMPANY_ADMIN && user.company?.id) {
      finalPolicyDataToSend = { ...finalPolicyDataToSend, companyId: user.company.id };
    } else if (user?.role === UserRole.PLATFORM_ADMIN) {
      // selectedCompanyId || null para "Plataforma"
      finalPolicyDataToSend = { ...finalPolicyDataToSend, companyId: selectedCompanyId || null };
    }

    // tempOwnerId apenas na criação quando já existe upload
    if (!isEditing && documentFile?.id) {
      finalPolicyDataToSend = { ...finalPolicyDataToSend, tempOwnerId: finalOwnerIdForFile };
    }

    if (isEditing) {
      updatePolicyMutate({ policyId: policyId!, data: finalPolicyDataToSend });
    } else {
      createPolicyMutate(finalPolicyDataToSend);
    }
  };

  // ======== RETURNS SEGUROS ========
  if (isForbidden) return <Navigate to="/dashboard" />;
  if (isEditing && isLoadingPolicy) {
    return (
      <DetailFormTemplate
        header={{
          icon: FileText,
          title: 'Editar Política',
          subtitle: 'A carregar os dados da política…',
          actions: (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button disabled>Guardar</Button>
            </div>
          ),
        }}
        sections={[
          {
            content: <div className="text-sm text-gray-600">A carregar…</div>,
          },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button disabled>Guardar</Button>
          </>
        }
      />
    );
  }

  // ======== HEADER ========
  const header = {
    icon: FileText,
    title: isEditing ? 'Editar Política de Privacidade' : 'Criar Nova Política de Privacidade',
    subtitle: 'Preencha os detalhes e anexe o documento.',
    // ❗ Botões do footer duplicados no header
    actions: (
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={submitPolicy} disabled={isPending || !isFormValid}>
          {isPending ? 'A Guardar…' : isEditing ? 'Guardar Alterações' : 'Criar Política'}
        </Button>
      </div>
    ),
  };

  // ======== SECTIONS (DetailFormTemplate) ========
  const generalSection = {
    title: 'Informação Geral',
    description: 'Dados base da política e empresa proprietária.',
    accent: true,
    content: (
      <div className="grid grid-cols-1 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name">
            Nome da Política <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Política de Privacidade"
          />
        </div>

        {user?.role === UserRole.PLATFORM_ADMIN && (
          <div className="grid gap-1.5">
            <Label htmlFor="ownerCompany">Empresa Proprietária (opcional)</Label>
            <Select
              value={selectedCompanyId ?? 'platform'}
              onValueChange={(value) => setSelectedCompanyId(value === 'platform' ? null : value)}
              disabled={isLoadingCompanies}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma empresa..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">Plataforma (Padrão)</SelectItem>
                {companies.map((c: CompanyOption) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Se deixar “Plataforma (Padrão)”, o documento pertencerá à Geslogic/Plataforma.
            </p>
          </div>
        )}
      </div>
    ),
  };

  const documentSection = {
    title: 'Documento',
    description: `Anexe o documento (tamanho máx. ${MAX_FILE_MB}MB; configurável na Plataforma).`,
    accent: true,
    content: (
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <Label>Documento PDF <span className="text-red-500">*</span></Label>
          {/* Botão de Pré-visualização (apenas quando existe ficheiro) */}
          {documentFile?.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              title="Pré-visualizar documento"
            >
              <Eye className="w-4 h-4 mr-2" />
              Pré-visualizar
            </Button>
          )}
        </div>

        <SingleFileUpload
          ownerType="PolicyDocument"
          ownerId={isEditing ? policyId! : tempOwnerId}
          purpose={FilePurpose.POLICY_DOCUMENT}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          currentFileUrl={documentFile?.url || null}
          currentFileName={documentFile?.displayName || null}
          onUploadSuccess={(newFile) => {
            setDocumentFile({
              id: newFile.id,
              url: newFile.url,
              displayName: newFile.displayName,
            });
          }}
          onFileClear={() => setDocumentFile(null)}
        />

        <div className="text-xs text-gray-500">
          Formatos permitidos: PDF, DOC, DOCX (e imagens para pré‑visualização). Tamanho máximo: {MAX_FILE_MB}MB. <br />
          <span className="italic">
            (No futuro, este limite será lido das Configurações da Plataforma.)
          </span>
        </div>
      </div>
    ),
  };

  const consentSection = {
    title: 'Texto de Consentimento',
    description: 'Texto apresentado ao utilizador para obter consentimento explícito.',
    accent: true,
    className: 'md:col-span-2', // ocupar 2 colunas em md+ (mais confortável para texto)
    content: (
      <div className="grid gap-1.5">
        <Label htmlFor="consentText">
          Texto de Consentimento <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="consentText"
          value={consentText}
          onChange={(e) => setConsentText(e.target.value)}
          rows={10}
          placeholder="Insira aqui o texto de consentimento…"
        />
        <p className="text-xs text-gray-500">
          Recomenda-se linguagem clara e objetiva. Pode incluir links para a política de privacidade.
        </p>
      </div>
    ),
  };

  // ======== ACTIONS (sticky bottom) ========
  const actions = (
    <>
      <div className="flex-grow text-sm text-muted-foreground mr-4 text-left">
        {isEditing ? 'Campos com * são obrigatórios.' : 'Todos os campos são obrigatórios para criar uma nova política.'}
      </div>
      <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
      <Button onClick={submitPolicy} disabled={isPending || !isFormValid}>
        {isPending ? 'A Guardar…' : isEditing ? 'Guardar Alterações' : 'Criar Política'}
      </Button>
    </>
  );

  return (
    <>
      <DetailFormTemplate
        header={header}
        sections={[generalSection, documentSection, consentSection]}
        actions={actions}
        columnsMd={2}
      />

      {/* PREVIEW DRAWER (estilo File Manager) */}
      {previewOpen && documentFile?.url && (
        <div className="fixed inset-0 z-[70] flex">
          <div className="flex-1 bg-black/40" onClick={() => setPreviewOpen(false)} />
          <div className="w-full sm:w-[520px] md:w-[640px] lg:w-[720px] h-full bg-white shadow-2xl border-l p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0">
                <div className="text-sm text-gray-500">Pré-visualização</div>
                <div className="font-semibold truncate" title={documentFile.displayName || documentFile.url}>
                  {documentFile.displayName || documentFile.url}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPreviewOpen(false)} aria-label="Fechar">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 border rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
              {/* Heurística simples: PDF usa iframe; imagens usam img; outros mostram fallback */}
              {/\.(pdf)(\?.*)?$/i.test(documentFile.url) ? (
                <iframe src={documentFile.url} title="PDF" className="w-full h-full" />
              ) : /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(documentFile.url) ? (
                <img src={documentFile.url} alt="preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="p-6 text-sm text-gray-600 text-center">
                  Pré-visualização não suportada. Pode descarregar o ficheiro a partir do link do upload.
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-end">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditPolicyPage;