// frontend/src/pages/CompanySmtpConfigPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate, useSearchParams } from 'react-router-dom'; // Adicionado useSearchParams
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCompanyDetails, fetchSmtpConfig, updateSmtpConfig, testSmtpConfig, getGmailAuthUrl, getMicrosoftAuthUrl } from '../services/api'; // Adicionado getGmailAuthUrl
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';

// Enum para alinhar com o Backend
enum EmailProvider {
  SMTP = 'SMTP',
  GMAIL = 'GMAIL',
  MICROSOFT = 'MICROSOFT',
}

interface SmtpConfigData {
  provider: EmailProvider; // Adicionado
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
  const [searchParams] = useSearchParams(); // Para detetar o retorno do Google
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
    emailFrom: '' 
  });

  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<SmtpTestResult | null>(null);

  const { data: companyDetails } = useQuery({ queryKey: ['company', companyId], queryFn: () => fetchCompanyDetails(companyId!), enabled: !!companyId });
  const { data: smtpConfig, isLoading, error } = useQuery<SmtpConfigData | null, Error>({ 
    queryKey: ['smtpConfig', companyId], 
    queryFn: () => fetchSmtpConfig(companyId!), 
    enabled: !!companyId 
  });
  
  useEffect(() => { 
    if (smtpConfig) setFormData(smtpConfig); 
  }, [smtpConfig]);

  // Efeito para detetar sucesso do OAuth vindo da URL
  useEffect(() => {
    if (searchParams.get('oauth') === 'success') {
      // Refresh aos dados para mostrar que o Gmail já está ativo
      queryClient.invalidateQueries({ queryKey: ['smtpConfig', companyId] });
    }
  }, [searchParams, queryClient, companyId]);

  const { mutate: saveSmtpMutate, isPending: isSaving, isSuccess, error: saveError } = useMutation({
    mutationFn: updateSmtpConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtpConfig', companyId] });
    },
  });

  const { mutate: testSmtpMutate, isPending: isTesting } = useMutation<SmtpTestResult, Error, { companyId: string; smtpData: SmtpConfigData; recipientEmail: string; }>({
    mutationFn: testSmtpConfig,
    onSuccess: (data) => setTestResult(data),
    onError: (error) => setTestResult({ success: false, message: 'Erro na chamada à API.', details: error.message }),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // LIMPEZA: Extraímos apenas o que o DTO aceita, ignorando id, datas, etc.
    const { provider, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, emailFrom } = formData;
    
    const payload = {
      provider,
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpSecure,
      smtpUser,
      smtpPass: smtpPass || undefined, // Não envia string vazia
      emailFrom,
    };

    saveSmtpMutate({ companyId: companyId!, smtpData: payload });
  };

  const handleAuthorizeGmail = async () => {
    try {
      const { url } = await getGmailAuthUrl(companyId!);
      window.location.href = url; // Redireciona para o login da Google
    } catch (err) {
      alert("Erro ao obter URL de autorização.");
    }
  };

  const handleAuthorizeMicrosoft = async () => {
    try {
      const { url } = await getMicrosoftAuthUrl(companyId!);
      window.location.href = url;
    } catch (err) {
      alert("Erro ao obter URL de autorização Microsoft.");
    }
  };


  const openTestModal = () => {
    setTestResult(null);
    setTestEmail(user?.email || '');
    setShowTestModal(true);
  };

const handleSendTestEmail = () => {
    // LIMPEZA: Destruturamos para tirar o lixo (id, createdAt, updatedAt) 
    // e garantir que o 'provider' e outros campos novos vão para o servidor.
    const { 
      id, createdAt, updatedAt, company, createdBy, updatedBy, // Lixo que o SQL devolveu
      ...cleanSmtpData // Tudo o que sobra são os campos do formulário
    } = formData as any;

    const smtpData = {
      ...cleanSmtpData,
      smtpPort: Number(formData.smtpPort),
    };

    testSmtpMutate({ 
      companyId: companyId!, 
      smtpData, 
      recipientEmail: testEmail 
    });
  };

  if (!user || user.role !== UserRole.PLATFORM_ADMIN) return <Navigate to="/dashboard" />;
  if (isLoading) return <div>A carregar...</div>;
  if (error) return <div>Erro: {(error as Error).message}</div>;

  return (
    <>
      <div className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Configuração de Email da Empresa</CardTitle>
            <CardDescription>Configure como a empresa {companyDetails?.name} envia notificações.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Seletor de Provedor */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Label htmlFor="provider" className="font-bold">Método de Envio</Label>
              <select 
                id="provider" 
                name="provider" 
                value={formData.provider} 
                onChange={(e) => setFormData(p => ({...p, provider: e.target.value as EmailProvider}))}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value={EmailProvider.SMTP}>SMTP Clássico (Outros)</option>
                <option value={EmailProvider.GMAIL}>Gmail (Google OAuth2)</option>
                <option value={EmailProvider.MICROSOFT}>Microsoft 365 / Outlook</option>
              </select>
            </div>

            {formData.provider === EmailProvider.GMAIL && (
              // UI PARA GMAIL
              <div className="space-y-6 text-center py-4">
                <div className="flex justify-center text-4xl mb-2">📧</div>
                <h3 className="text-lg font-medium">Conectar com o Gmail</h3>
                <p className="text-sm text-muted-foreground px-10">
                  Ao usar o Gmail, a GesLogic utilizará a API oficial da Google para maior segurança. Não é necessário introduzir passwords.
                </p>
                <Button 
                  type="button" 
                  onClick={handleAuthorizeGmail} 
                  className="bg-red-600 hover:bg-red-700 text-white px-8"
                >
                  Autorizar Conta Gmail
                </Button>
                {formData.smtpUser && (
                  <p className="text-xs text-green-600 font-medium">
                    Conectado atualmente como: {formData.smtpUser}
                  </p>
                )}
              </div>
            )}

            {formData.provider === EmailProvider.MICROSOFT && (
              // UI PARA MICROSOFT
              <div className="space-y-6 text-center py-4">
                <div className="flex justify-center text-4xl mb-2">🟦</div>
                <h3 className="text-lg font-medium">Conectar com Microsoft 365</h3>
                <p className="text-sm text-muted-foreground px-10">
                  Ideal para contas Outlook.com ou Office 365 Empresarial. Usa a segurança moderna da Microsoft.
                </p>
                <Button 
                  type="button" 
                  onClick={handleAuthorizeMicrosoft} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                >
                  Autorizar Conta Microsoft
                </Button>
                {formData.smtpUser && (
                  <p className="text-xs text-green-600 font-medium mt-2">
                    Conectado atualmente como: {formData.smtpUser}
                  </p>
                )}
              </div>
            )}

            {formData.provider === EmailProvider.SMTP && (
              // UI PARA SMTP CLÁSSICO
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-1.5"><Label htmlFor="smtpHost">Host SMTP</Label><Input id="smtpHost" name="smtpHost" value={formData.smtpHost} onChange={handleInputChange} required /></div>
                  <div className="grid gap-1.5"><Label htmlFor="smtpPort">Porta SMTP</Label><Input type="number" id="smtpPort" name="smtpPort" value={formData.smtpPort} onChange={handleInputChange} required /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-1.5"><Label htmlFor="smtpUser">Utilizador SMTP</Label><Input id="smtpUser" name="smtpUser" value={formData.smtpUser} onChange={handleInputChange} required /></div>
                  <div className="grid gap-1.5"><Label htmlFor="smtpPass">Password SMTP</Label><Input type="password" id="smtpPass" name="smtpPass" value={formData.smtpPass} onChange={handleInputChange} placeholder="Mantenha vazio para não alterar" /></div>
                </div>
                <div className="grid gap-1.5"><Label htmlFor="emailFrom">Email do Remetente</Label><Input id="emailFrom" name="emailFrom" value={formData.emailFrom} onChange={handleInputChange} placeholder='"GesLogic" <noreply@dominio.com>' required /></div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="smtpSecure" checked={formData.smtpSecure} onCheckedChange={(checked) => setFormData(prev => ({...prev, smtpSecure: Boolean(checked)}))} />
                  <Label htmlFor="smtpSecure">Usar SSL/TLS (Recomendado para Porta 465)</Label>
                </div>
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? 'A Guardar...' : 'Guardar Configuração SMTP'}
                </Button>
              </form>
            )}
            
            <div className="mt-4 border-t pt-4">
               <Button type="button" variant="outline" className="w-full" onClick={openTestModal}>
                  Testar Configuração Atual
                </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>Voltar</Button>
          </CardFooter>
        </Card>
      </div>

      {/* MODAL DE SUCESSO APÓS GUARDAR */}
      {isSuccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md"><CardContent className="p-6 text-center space-y-4">
            <div className="text-green-500 text-4xl">✅</div>
            <CardTitle>Sucesso!</CardTitle>
            <CardDescription>Configuração SMTP guardada com sucesso.</CardDescription>
            <Button onClick={() => navigate(-1)}>Fechar</Button>
          </CardContent></Card>
        </div>
      )}

      {/* MODAL DE TESTE */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader><CardTitle>Testar Envio</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="test-email">Email de Destino</Label>
                <Input id="test-email" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              </div>
              {testResult && (
                <div className={`p-3 text-sm rounded-md ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <p className="font-bold">{testResult.message}</p>
                  {testResult.details && <p className="mt-2 text-xs">{testResult.details}</p>}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="ghost" onClick={() => setShowTestModal(false)}>Fechar</Button>
              <Button onClick={handleSendTestEmail} disabled={isTesting}>
                {isTesting ? 'A Testar...' : 'Enviar Email de Teste'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};

export default CompanySmtpConfigPage;