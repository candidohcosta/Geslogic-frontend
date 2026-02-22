// frontend/src/pages/CompanySmtpConfigPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCompanyDetails,
  fetchSmtpConfig,
  updateSmtpConfig,
  testSmtpConfig,
  getGmailAuthUrl,
  getMicrosoftAuthUrl,
} from '../services/api';
import { UserRole } from '../types/user';

// UI
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';

// Template
import { UtilityPageTemplate, UtilitySection } from '../components/templates/UtilityPageTemplate';

// Ícones
import {
  Mail as MailIcon,
  Shield as ShieldIcon,
  PlugZap,
  Building2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AtSign,
  Server,
  LockKeyhole,
} from 'lucide-react';

// Enum — alinha com backend
enum EmailProvider {
  SMTP = 'SMTP',
  GMAIL = 'GMAIL',
  MICROSOFT = 'MICROSOFT',
}

interface SmtpConfigData {
  provider: EmailProvider;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;
}

interface SmtpTestResult {
  success: boolean;
  message: string;
  details?: string;
}

const CompanySmtpConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companyId } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<SmtpConfigData>({
    provider: EmailProvider.SMTP,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: '',
    smtpPass: '',
    emailFrom: '',
  });

  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<SmtpTestResult | null>(null);

  const { data: companyDetails } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => fetchCompanyDetails(companyId!),
    enabled: !!companyId,
  });

  const {
    data: smtpConfig,
    isLoading,
    error,
  } = useQuery<SmtpConfigData | null, Error>({
    queryKey: ['smtpConfig', companyId],
    queryFn: () => fetchSmtpConfig(companyId!),
    enabled: !!companyId,
  });

  useEffect(() => {
    if (smtpConfig) setFormData(smtpConfig);
  }, [smtpConfig]);

  // Detetar retorno de OAuth
  useEffect(() => {
    if (searchParams.get('oauth') === 'success') {
      queryClient.invalidateQueries({ queryKey: ['smtpConfig', companyId] });
    }
  }, [searchParams, queryClient, companyId]);

  const {
    mutate: saveSmtpMutate,
    isPending: isSaving,
    isSuccess,
    error: saveError,
  } = useMutation({
    mutationFn: updateSmtpConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtpConfig', companyId] });
    },
  });

  const { mutate: testSmtpMutate, isPending: isTesting } = useMutation<
    SmtpTestResult,
    Error,
    { companyId: string; smtpData: SmtpConfigData; recipientEmail: string }
  >({
    mutationFn: testSmtpConfig,
    onSuccess: (data) => setTestResult(data),
    onError: (err) =>
      setTestResult({ success: false, message: 'Erro na chamada à API.', details: err.message }),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { provider, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, emailFrom } = formData;
    const payload = {
      provider,
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpSecure,
      smtpUser,
      smtpPass: smtpPass || undefined,
      emailFrom,
    };
    saveSmtpMutate({ companyId: companyId!, smtpData: payload });
  };

  const handleAuthorizeGmail = async () => {
    try {
      const { url } = await getGmailAuthUrl(companyId!);
      window.location.href = url;
    } catch {
      alert('Erro ao obter URL de autorização (Gmail).');
    }
  };

  const handleAuthorizeMicrosoft = async () => {
    try {
      const { url } = await getMicrosoftAuthUrl(companyId!);
      window.location.href = url;
    } catch {
      alert('Erro ao obter URL de autorização (Microsoft).');
    }
  };

  const openTestModal = () => {
    setTestResult(null);
    setTestEmail(user?.email || '');
    setShowTestModal(true);
  };

  const handleSendTestEmail = () => {
    const {
      id, createdAt, updatedAt, company, createdBy, updatedBy, // lixo que possa vir da API
      ...cleanSmtpData
    } = formData as any;

    const smtpData: SmtpConfigData = {
      ...cleanSmtpData,
      smtpPort: Number(formData.smtpPort),
    };

    testSmtpMutate({
      companyId: companyId!,
      smtpData,
      recipientEmail: testEmail,
    });
  };

  if (!user || user.role !== UserRole.PLATFORM_ADMIN) return <Navigate to="/dashboard" />;
  if (isLoading) return <div className="p-6">A carregar…</div>;
  if (error) return <div className="p-6 text-red-600">Erro: {(error as Error).message}</div>;

  const companyName = companyDetails?.name || '—';

  return (
    <UtilityPageTemplate
      header={{
        icon: MailIcon,
        title: 'Configuração de Email da Empresa',
        subtitle: <>Defina como a empresa <b>{companyName}</b> envia notificações.</>,
        actions: (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Voltar
            </Button>
          </div>
        ),
      }}
      accent={{
        options: false,
        secondary: false,
        content: false,            // 👈 REMOVE o envelope exterior (evita “janela dentro de janela”)
        contentPadding: true,
        brandClassName: 'border-t-brand-500',
      }}
    >
      {/* Seleção do Provider */}
      <UtilitySection>
        <div className="grid gap-1.5">
          <Label htmlFor="provider" className="font-semibold flex items-center gap-2">
            <PlugZap className="w-4 h-4 text-brand-600" /> Método de Envio
          </Label>
          <select
            id="provider"
            name="provider"
            value={formData.provider}
            onChange={(e) => setFormData((p) => ({ ...p, provider: e.target.value as EmailProvider }))}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value={EmailProvider.SMTP}>SMTP Clássico (Outros)</option>
            <option value={EmailProvider.GMAIL}>Gmail (Google OAuth2)</option>
            <option value={EmailProvider.MICROSOFT}>Microsoft 365 / Outlook</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Sugestão: prefira Gmail / Microsoft (OAuth2) para <b>não</b> guardar passwords.
          </p>
        </div>
      </UtilitySection>

      {/* GMAIL */}
      {formData.provider === EmailProvider.GMAIL && (
        <div className="mt-4">
          <UtilitySection>
            <div className="space-y-5 text-center py-2">
              <div className="flex justify-center">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-600">
                  <MailIcon className="w-8 h-8" />
                </span>
              </div>
              <h3 className="text-lg font-semibold">Conectar com o Gmail</h3>
              <p className="text-sm text-gray-600 max-w-xl mx-auto">
                A GesLogic usará a API oficial da Google (OAuth2) para enviar emails com segurança. Não precisa de password.
              </p>
              <div className="flex flex-col items-center gap-2">
                <Button type="button" onClick={handleAuthorizeGmail} className="bg-red-600 hover:bg-red-700 text-white px-6">
                  Autorizar Conta Gmail
                </Button>
                {formData.smtpUser && (
                  <p className="text-xs text-green-700 font-medium">
                    <CheckCircle2 className="inline-block w-4 h-4 mr-1" />
                    Conectado como: {formData.smtpUser}
                  </p>
                )}
              </div>
            </div>
          </UtilitySection>
        </div>
      )}

      {/* MICROSOFT */}
      {formData.provider === EmailProvider.MICROSOFT && (
        <div className="mt-4">
          <UtilitySection>
            <div className="space-y-5 text-center py-2">
              <div className="flex justify-center">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-600">
                  <ShieldIcon className="w-8 h-8" />
                </span>
              </div>
              <h3 className="text-lg font-semibold">Conectar com Microsoft 365</h3>
              <p className="text-sm text-gray-600 max-w-xl mx-auto">
                Ideal para Outlook.com/Office 365. Segurança moderna com OAuth2.
              </p>
              <div className="flex flex-col items-center gap-2">
                <Button type="button" onClick={handleAuthorizeMicrosoft} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                  Autorizar Conta Microsoft
                </Button>
                {formData.smtpUser && (
                  <p className="text-xs text-green-700 font-medium">
                    <CheckCircle2 className="inline-block w-4 h-4 mr-1" />
                    Conectado como: {formData.smtpUser}
                  </p>
                )}
              </div>
            </div>
          </UtilitySection>
        </div>
      )}

      {/* SMTP */}
      {formData.provider === EmailProvider.SMTP && (
        <div className="mt-4">
          <UtilitySection>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Linha 1 */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="smtpHost" className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-gray-500" /> Host SMTP
                  </Label>
                  <Input id="smtpHost" name="smtpHost" value={formData.smtpHost} onChange={handleInputChange} required />
                  <p className="text-[11px] text-gray-500">
                    Ex.: <code className="font-mono">smtp.mailtrap.io</code>, <code className="font-mono">smtp.gmail.com</code>
                  </p>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="smtpPort" className="flex items-center gap-2">
                    <PlugZap className="w-4 h-4 text-gray-500" /> Porta SMTP
                  </Label>
                  <Input type="number" id="smtpPort" name="smtpPort" value={formData.smtpPort} onChange={handleInputChange} required />
                  <p className="text-[11px] text-gray-500">465 (SSL/TLS) • 587 (STARTTLS) • 25 (não recomendado)</p>
                </div>
              </div>

              {/* Linha 2 */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="smtpUser" className="flex items-center gap-2">
                    <AtSign className="w-4 h-4 text-gray-500" /> Utilizador SMTP
                  </Label>
                  <Input id="smtpUser" name="smtpUser" value={formData.smtpUser} onChange={handleInputChange} required />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="smtpPass" className="flex items-center gap-2">
                    <LockKeyhole className="w-4 h-4 text-gray-500" /> Password SMTP
                  </Label>
                  <Input
                    type="password"
                    id="smtpPass"
                    name="smtpPass"
                    value={formData.smtpPass}
                    onChange={handleInputChange}
                    placeholder="Mantenha vazio para não alterar"
                  />
                </div>
              </div>

              {/* Linha 3 */}
              <div className="grid gap-1.5">
                <Label htmlFor="emailFrom" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" /> Email do Remetente
                </Label>
                <Input
                  id="emailFrom"
                  name="emailFrom"
                  value={formData.emailFrom}
                  onChange={handleInputChange}
                  placeholder={`"GesLogic" <noreply@${window.location.hostname}>`}
                  required
                />
                <p className="text-[11px] text-gray-500">
                  Aceita formato <code className="font-mono">"Nome" &lt;email@dominio&gt;</code>
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="smtpSecure"
                  checked={formData.smtpSecure}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, smtpSecure: Boolean(checked) }))}
                />
                <Label htmlFor="smtpSecure">Usar SSL/TLS (recomendado com porta 465)</Label>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A Guardar...
                    </>
                  ) : (
                    'Guardar Configuração SMTP'
                  )}
                </Button>
              </div>
            </form>
          </UtilitySection>
        </div>
      )}

      {/* MODAL DE SUCESSO APÓS GUARDAR */}
      {isSuccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-green-500 text-4xl">✅</div>
              <CardTitle>Sucesso!</CardTitle>
              <CardDescription>Configuração guardada com sucesso.</CardDescription>
              <Button onClick={() => navigate(-1)}>Fechar</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL DE TESTE */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Testar Envio</CardTitle>
              <CardDescription>Enviaremos um email de teste com a configuração atual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="test-email">Email de Destino</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              {testResult && (
                <div
                  className={`p-3 text-sm rounded-md ${
                    testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  <p className="font-bold">{testResult.message}</p>
                  {testResult.details && <p className="mt-2 text-xs">{testResult.details}</p>}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="ghost" onClick={() => setShowTestModal(false)}>
                Fechar
              </Button>
              <Button onClick={handleSendTestEmail} disabled={isTesting}>
                {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isTesting ? 'A Testar...' : 'Enviar Email de Teste'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Ações (footer da página) */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Voltar
        </Button>
        <Button onClick={openTestModal} size="sm">
          Testar Configuração Atual
        </Button>
      </div>

      {saveError && (
        <div className="mt-3 p-3 text-sm rounded-md bg-red-50 border border-red-200 text-red-700 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-[2px]" />
          <div>
            <p className="font-semibold">Erro ao guardar:</p>
            <p className="text-xs">{(saveError as any)?.message || 'Erro desconhecido.'}</p>
          </div>
        </div>
      )}
    </UtilityPageTemplate>
  );
};

export default CompanySmtpConfigPage;