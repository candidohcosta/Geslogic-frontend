// frontend/src/pages/CompanySmtpConfigPage.tsx (VERSÃO FINAL E CORRIGIDA)

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCompanyDetails, fetchSmtpConfig, updateSmtpConfig, testSmtpConfig } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';

interface SmtpConfigData {
  smtpHost: string; smtpPort: number; smtpSecure: boolean;
  smtpUser: string; smtpPass: string; emailFrom: string;
}

// Interface para a resposta do teste
interface SmtpTestResult {
  success: boolean;
  message: string;
  details?: string;
}

const CompanySmtpConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<SmtpConfigData>({ smtpHost: '', smtpPort: 587, smtpSecure: true, smtpUser: '', smtpPass: '', emailFrom: '' });
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<SmtpTestResult | null>(null);

  const { data: companyDetails } = useQuery({ queryKey: ['company', companyId], queryFn: () => fetchCompanyDetails(companyId!), enabled: !!companyId });
  const { data: smtpConfig, isLoading, error } = useQuery<SmtpConfigData | null, Error>({ queryKey: ['smtpConfig', companyId], queryFn: () => fetchSmtpConfig(companyId!), enabled: !!companyId });
  
  useEffect(() => { if (smtpConfig) setFormData(smtpConfig); }, [smtpConfig]);

  const { mutate: saveSmtpMutate, isPending: isSaving, isSuccess, error: saveError } = useMutation({
    mutationFn: updateSmtpConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtpConfig', companyId] });
      setTimeout(() => { navigate(-1); }, 2000);
    },
  });

  const { mutate: testSmtpMutate, isPending: isTesting } = useMutation<SmtpTestResult, Error, { companyId: string; smtpData: SmtpConfigData; recipientEmail: string; }>({
    mutationFn: testSmtpConfig,
    onSuccess: (data) => setTestResult(data),
    onError: (error) => setTestResult({ success: false, message: 'Erro na chamada à API.', details: error.message }),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSmtpMutate({ companyId: companyId!, smtpData: { ...formData, smtpPort: Number(formData.smtpPort) } });
  };
  const openTestModal = () => {
    setTestResult(null);
    setTestEmail(user?.email || '');
    setShowTestModal(true);
  };
  const handleSendTestEmail = () => {
    //testSmtpMutate({ companyId: companyId!, smtpData: { ...formData, smtpPort: Number(formData.smtpPort) }, recipientEmail: testEmail });
    const smtpData = {
    smtpHost: formData.smtpHost,
    smtpPort: Number(formData.smtpPort),
    smtpSecure: formData.smtpSecure,
    smtpUser: formData.smtpUser,
    smtpPass: formData.smtpPass,
    emailFrom: formData.emailFrom,
    };

    testSmtpMutate({ companyId: companyId!, smtpData, recipientEmail: testEmail });
  };

  if (!user || user.role !== UserRole.PLATFORM_ADMIN) return <Navigate to="/dashboard" />;
  if (isLoading) return <div>A carregar...</div>;
  if (error) return <div>Erro: {(error as Error).message}</div>;

  return (
    <>
      <div className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Configuração de Email (SMTP)</CardTitle>
            <CardDescription>A configurar o servidor de email para a empresa {companyDetails?.name || '...'}.</CardDescription>
          </CardHeader>
          <CardContent>
            {saveError && <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-md"><strong>Erro:</strong> {(saveError as Error).message}</div>}
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-1.5"><Label htmlFor="smtpHost">Host SMTP</Label><Input id="smtpHost" name="smtpHost" value={formData.smtpHost} onChange={handleInputChange} required /></div>
                <div className="grid gap-1.5"><Label htmlFor="smtpPort">Porta SMTP</Label><Input type="number" id="smtpPort" name="smtpPort" value={formData.smtpPort} onChange={handleInputChange} required /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-1.5"><Label htmlFor="smtpUser">Utilizador SMTP</Label><Input id="smtpUser" name="smtpUser" value={formData.smtpUser} onChange={handleInputChange} required /></div>
                <div className="grid gap-1.5"><Label htmlFor="smtpPass">Password SMTP</Label><Input type="password" id="smtpPass" name="smtpPass" value={formData.smtpPass} onChange={handleInputChange} required /></div>
              </div>
              <div className="grid gap-1.5"><Label htmlFor="emailFrom">Email do Remetente</Label><Input id="emailFrom" name="emailFrom" value={formData.emailFrom} onChange={handleInputChange} placeholder='"Nome Empresa" <email@empresa.com>' required /></div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="smtpSecure" name="smtpSecure" checked={formData.smtpSecure} onCheckedChange={(checked) => setFormData(prev => ({...prev, smtpSecure: Boolean(checked)}))} />
                <Label htmlFor="smtpSecure">Usar SSL/TLS</Label>
              </div>
              <div className="flex flex-col md:flex-row gap-2 pt-4">
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? 'A Guardar...' : 'Guardar Configuração'}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={openTestModal}>
                  Testar Ligação
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>Voltar</Button>
          </CardFooter>
        </Card>
      </div>

      {isSuccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md"><CardContent className="p-6 text-center space-y-4"><div className="text-green-500 ..."><svg>...</svg></div><CardTitle>Sucesso!</CardTitle><CardDescription>Configuração guardada. A redirecionar...</CardDescription></CardContent></Card>
        </div>
      )}

      {showTestModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle>Testar Configuração SMTP</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Isto irá guardar a configuração atual e enviar um email de teste.</p>
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
                {isTesting ? 'A Testar...' : 'Enviar Teste'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};

export default CompanySmtpConfigPage;