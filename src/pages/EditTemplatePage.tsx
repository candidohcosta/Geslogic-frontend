
import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  fetchCompanies,
  fetchTemplatePlaceholders,
} from '../services/api';
import { UserRole } from '../types/user';
import { EmailTemplateType } from '../types/email';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import RichTextEditor, {
  RichTextEditorHandle,
} from '../components/ui/RichTextEditor';
import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
import { Mails } from 'lucide-react';

interface CompanyOption {
  id: string;
  name: string;
  defaultSignatureHtml?: string | null;
}

/** Renderizador local de placeholders (sem quebrar quando faltam variáveis).
 * Substitui {{ a.b.c }} por valores do contexto. Se não existir, mantém o placeholder.
 */
function renderTemplateLocal(tpl: string, ctx: Record<string, any>): string {
  if (!tpl) return tpl;

  const getByPath = (obj: unknown, path: string): unknown => {
    return path.split('.').reduce<unknown>((acc: unknown, key: string) => {
      if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  };

  const regex = /{{\s*([\w.-]+)\s*}}/g;
  return tpl.replace(regex, (_m: string, path: string) => {
    try {
      const value = getByPath(ctx, path);
      return value === undefined || value === null ? _m : String(value);
    } catch {
      return _m;
    }
  });
}

/** Dados de exemplo para pré‑visualização */
function buildSampleContext() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);

  return {
    user: { firstName: 'Cândido', lastName: 'Costa', email: 'candido@example.com' },
    company: { id: 'cmp_123', name: 'LogicWise' },
    event: {
      id: 'evt_123',
      name: 'Evento de Demonstração',
      startDate: now.toISOString(),
      location: 'Auditório Central',
      link: { url: 'https://geslogic.local/events/evt_123' },
    },
    registration: {
      id: 'reg_ABCDEF12',
      finalCost: '25.00€',
      url: 'https://geslogic.local/minha-inscricao/reg_ABCDEF12?token=XYZ',
    },
    link: { url: 'https://geslogic.local/events/evt_123' },
    resetUrl: 'https://geslogic.local/reset-password?token=RESET123',
    activationUrl: 'https://geslogic.local/activate?token=ACT123',
    appointment: {
      serviceName: 'Consulta Geral',
      date: now.toLocaleDateString('pt-PT'),
      time: now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      code: 'CK-2048',
      location: 'Sede',
      companyName: 'LogicWise',
      cancelUrl: 'https://geslogic.local/agendar/cancelar?id=apt_1&token=TK',
    },
    reminder: {
      date: tomorrow.toLocaleDateString('pt-PT'),
      time: tomorrow.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    },
  };
}

/** Verifica se um HTML tem conteúdo "real" (ignora estrutura vazia do Quill: <p><br></p>, <br>, tags, &nbsp;). */
function isHtmlEmpty(html: string): boolean {
  if (!html) return true;

  const clean = html
    .replace(/<p><br><\/p>/gi, '')   // parágrafo vazio do Quill
    .replace(/<br\s*\/?>/gi, '')     // quebras de linha
    .replace(/<[^>]*>/g, '')         // remove todas as tags
    .replace(/&nbsp;/gi, '')         // espaços não separáveis
    .trim();

  return clean.length === 0;
}

const EditTemplatePage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const isEditing = Boolean(templateId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Estado do formulário
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<EmailTemplateType | ''>('');
  const [companyId, setCompanyId] = useState<string | 'platform'>('platform');
  const [includeSignature, setIncludeSignature] = useState(true);

  // Placeholders disponíveis para o tipo selecionado
  const [availablePlaceholders, setAvailablePlaceholders] = useState<string[]>([]);

  // Refs para inserção direta
  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const subjectInputRef = useRef<HTMLInputElement | null>(null);

  // Query: template (apenas em edição)
  const { data: templateData, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['emailTemplate', templateId],
    queryFn: () => fetchEmailTemplateById(templateId!),
    enabled: isEditing,
  });

  // Query: companies (apenas para Platform Admin)
  const { data: companies = [] } = useQuery<CompanyOption[]>({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const selectedCompany = companies.find((c) => c.id === companyId);
  const companyHasSignature = !!selectedCompany?.defaultSignatureHtml;

  // Tipos filtrados (sem hooks condicionais)
  const allTypes = Object.values(EmailTemplateType);
  const filteredEmailTypes =
    companyId === 'platform'
      ? allTypes
      : allTypes.filter((t) => t.startsWith('COMPANY_'));

  // Hidratar estado a partir do template em edição
  useEffect(() => {
    if (templateData) {
      setName(templateData.name);
      setSubject(templateData.subject);
      setBody(templateData.body);
      setType(templateData.type);
      setCompanyId(templateData.company?.id || 'platform');
      setIncludeSignature(templateData.includeSignature);
    } else if (!isEditing) {
      setName('');
      setSubject('');
      setBody('');
      setType('');
      setCompanyId(
        user?.role === UserRole.PLATFORM_ADMIN
          ? 'platform'
          : user?.company?.id || ''
      );
      setIncludeSignature(true);
    }
  }, [templateData, isEditing, user]);

  // Se o tipo deixar de ser válido após mudar a empresa/plataforma, limpa-o
  useEffect(() => {
    if (type && !filteredEmailTypes.includes(type)) {
      setType('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]); // apenas quando muda a empresa/escopo

  // Placeholders por tipo
  useEffect(() => {
    const load = async () => {
      if (!type) {
        setAvailablePlaceholders([]);
        return;
      }
      try {
        const ph = await fetchTemplatePlaceholders(type);
        setAvailablePlaceholders(Array.isArray(ph) ? ph : []);
      } catch (e) {
        console.error('Failed to fetch placeholders:', e);
        setAvailablePlaceholders([]);
      }
    };
    load();
  }, [type]);

  // Mutação (create/update) — v5: isPending
  const { mutate, isPending, error } = useMutation({
    mutationFn: (payload: any) =>
      isEditing
        ? updateEmailTemplate({ id: templateId!, templateData: payload })
        : createEmailTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      navigate('/email-templates');
    },
  });

  // Inserir texto no cursor do input Subject
  const insertIntoSubjectAtCursor = (text: string) => {
    const input = subjectInputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? subject.length;
    const end = input.selectionEnd ?? subject.length;
    const newValue = subject.slice(0, start) + text + subject.slice(end);
    setSubject(newValue);
    requestAnimationFrame(() => {
      input.focus();
      const caret = start + text.length;
      input.setSelectionRange(caret, caret);
    });
  };

  // Permissões (UX defensivo; segurança real está no backend)
  const isPlatformAdmin = user?.role === UserRole.PLATFORM_ADMIN;
  const isCompanyAdmin = user?.role === UserRole.COMPANY_ADMIN;
  const isOwnedByAdmin =
    isCompanyAdmin && templateData?.company?.id === user?.company?.id;
  const canEdit = Boolean(isPlatformAdmin || isOwnedByAdmin);

  // Validação para bloquear “Guardar”
  const isCreating = !isEditing;
  const isNameValid = name.trim().length > 0;
  const isSubjectValid = subject.trim().length > 0;
  const isBodyValid = !isHtmlEmpty(body);
  const isTypeValid = isEditing ? true : type !== '';
  const isFormValid =
    isNameValid && isSubjectValid && isBodyValid && isTypeValid && canEdit;

  // Guardas de navegação (antes de construir props)
  if (!user || (!isPlatformAdmin && !isCompanyAdmin)) {
    return <Navigate to="/dashboard" />;
  }
  if (isLoadingTemplate) {
    return <div className="p-6">A carregar template…</div>;
  }

  // Pré‑visualização (render local)
  const sampleCtx = buildSampleContext();
  const previewSubject = renderTemplateLocal(subject || '', sampleCtx);
  const previewBody = renderTemplateLocal(body || '', sampleCtx);

  // HEADER
  const header = {
    icon: Mails,
    title: isEditing ? 'Editar Template de Email' : 'Criar Novo Template de Email',
    subtitle:
      'Compose o seu email de forma natural: metadados + assunto + corpo — e visualize o resultado à direita.',
    actions: (
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => navigate('/email-templates')}>
          Cancelar
        </Button>
        {canEdit && (
          <Button
            onClick={() => handleSave()}
            disabled={!isFormValid || isPending}
          >
            {isPending ? 'A guardar…' : 'Guardar'}
          </Button>
        )}
      </div>
    ),
  };

  // SECTIONS: 2 cartões lado a lado (metadados+conteúdo | preview)
  const sections = [
    // ESQUERDA: metadados + assunto + corpo + options
    {
      title: 'Composição',
      description:
        'Defina nome, tipo e destino; depois escreva o assunto e o corpo. Pode inserir variáveis (placeholders) diretamente no cursor.',
      accent: true,
      className: 'md:col-span-1',
      content: (
        <div className="space-y-6">
          {/* Metadados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome Interno</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {!isNameValid && (
                <p className="text-xs text-red-600">Indique um nome.</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="type">Tipo (Gatilho)</Label>
              <Select
                value={type || templateData?.type || ''}
                onValueChange={(v) => setType(v as EmailTemplateType)}
                required
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {filteredEmailTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isTypeValid && (
                <p className="text-xs text-red-600">Selecione um tipo.</p>
              )}
            </div>

            {isPlatformAdmin && (
              <div className="grid gap-1.5">
                <Label htmlFor="companyId">Associado a</Label>
                <Select
                  value={companyId}
                  onValueChange={setCompanyId}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Plataforma (Padrão)</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Assunto */}
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto do Email</Label>
            <Input
              ref={subjectInputRef}
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            {!isSubjectValid && (
              <p className="text-xs text-red-600">Indique um assunto.</p>
            )}

            {availablePlaceholders.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-2">
                  Variáveis (clique para inserir no cursor do assunto):
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePlaceholders.map((ph) => (
                    <button
                      key={`subj-${ph}`}
                      type="button"
                      onClick={() => insertIntoSubjectAtCursor(`{{ ${ph} }}`)}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 font-mono"
                      title="Inserir no cursor do Assunto"
                    >
                      {`{{ ${ph} }}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Corpo */}
          <div className="space-y-2">
            <Label>Corpo do Email</Label>
            <div className="bg-white rounded-md border">
              <RichTextEditor
                ref={editorRef}
                value={body || templateData?.body || ''}
                onChange={setBody}
              />
            </div>
            {!isBodyValid && (
              <p className="text-xs text-red-600">Indique o corpo do email.</p>
            )}

            {availablePlaceholders.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-2">
                  Variáveis (clique para inserir no cursor do corpo):
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePlaceholders.map((ph) => (
                    <button
                      key={`body-${ph}`}
                      type="button"
                      onClick={() =>
                        editorRef.current?.insertAtCursor(`{{ ${ph} }}`)
                      }
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 font-mono"
                      title="Inserir no cursor do Corpo"
                    >
                      {`{{ ${ph} }}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Opções */}
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="includeSignature"
              checked={includeSignature}
              onCheckedChange={(checked) => {
                const val = Boolean(checked);
                setIncludeSignature(val);
                if (val && companyId !== 'platform' && !companyHasSignature) {
                  alert(
                    'Aviso: A empresa selecionada não tem uma assinatura padrão configurada.'
                  );
                }
              }}
            />
            <Label htmlFor="includeSignature">
              Incluir assinatura padrão neste email
            </Label>
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {(error as Error).message}
            </p>
          )}
        </div>
      ),
    },

    // DIREITA: Pré‑visualização
    {
      title: 'Pré‑visualização (dados de exemplo)',
      description:
        'Pré‑renderização local para validação visual rápida. Placeholders sem valor mantêm‑se visíveis.',
      className: 'md:col-span-1',
      accent: true,
      content: (
        <div className="space-y-4">
          <div>
            <Label>Assunto pré‑renderizado</Label>
            <div className="mt-1 text-sm px-3 py-2 rounded border bg-white">
              {previewSubject || <span className="text-gray-400">—</span>}
            </div>
          </div>
          <div>
            <Label>Corpo pré‑renderizado</Label>
            <div
              className="mt-1 rounded border bg-white p-4 min-h-[200px] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewBody }}
            />
          </div>
        </div>
      ),
    },
  ];

  const actions = (
    <>
      <Button variant="ghost" onClick={() => navigate('/email-templates')}>
        Cancelar
      </Button>
      {canEdit && (
        <Button
          onClick={() => handleSave()}
          disabled={!isFormValid || isPending}
        >
          {isPending ? 'A guardar…' : 'Guardar'}
        </Button>
      )}
    </>
  );

  function handleSave() {
    const dataForUpdate = {
      name,
      subject,
      body,
      includeSignature,
    };
    const dataForCreate = {
      name,
      subject,
      body,
      type,
      companyId: companyId === 'platform' ? undefined : companyId,
      includeSignature,
    };
    mutate(isEditing ? dataForUpdate : dataForCreate);
  }

  return (
    <DetailFormTemplate
      header={header}
      sections={sections}
      actions={actions}
      columnsMd={2} // ← coloca as 2 secções lado a lado em md+
    />
  );
};

export default EditTemplatePage;
