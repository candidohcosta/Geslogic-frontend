// frontend/src/pages/CompanyPaymentSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPaymentConfig, updatePaymentConfig } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';

const CompanyPaymentSettingsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Se for Company Admin, usa o ID do user se não vier na rota
  const targetId = companyId || user?.company?.id;

  const [method, setMethod] = useState('MANUAL_UPLOAD');
  const [instructions, setInstructions] = useState('');
  const [entityCode, setEntityCode] = useState('');
  const [apiKey, setApiKey] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['paymentConfig', targetId],
    queryFn: () => fetchPaymentConfig(targetId!),
    enabled: !!targetId
  });

  useEffect(() => {
    if (config) {
        setMethod(config.method);
        setInstructions(config.paymentInstructions || '');
        setEntityCode(config.entityCode || '');
        setApiKey(config.apiKey || '');
    }
  }, [config]);

  const mutation = useMutation({
    mutationFn: (data: any) => updatePaymentConfig({ companyId: targetId!, data }),
    onSuccess: () => alert('Configurações guardadas!'),
    onError: (err: any) => alert('Erro: ' + err.message)
  });

  const handleSave = () => {
    mutation.mutate({
        method,
        paymentInstructions: instructions,
        entityCode,
        apiKey
    });
  };

  if (!targetId) return <div>Erro: Empresa não identificada.</div>;
  if (isLoading) return <div>A carregar...</div>;

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card>
        <CardHeader>
            <CardTitle>Configuração Financeira</CardTitle>
            <CardDescription>Defina como deseja receber os pagamentos das inscrições.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            
            <div className="space-y-2">
                <Label>Método de Pagamento Principal</Label>
                <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="MANUAL_UPLOAD">Transferência Bancária (Manual)</SelectItem>
                        <SelectItem value="ATM_REFERENCE">Referência Multibanco (Automático)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {method === 'MANUAL_UPLOAD' && (
                <div className="p-4 bg-gray-50 border rounded-md space-y-3 animate-in fade-in">
                    <Label>Instruções para o Cliente (Texto Rico / HTML)</Label>
                    <Textarea 
                        value={instructions} 
                        onChange={(e) => setInstructions(e.target.value)} 
                        placeholder="Ex: Por favor faça transferência para o IBAN PT50... e envie o comprovativo."
                        className="min-h-[150px]"
                    />
                    <p className="text-xs text-gray-500">Este texto aparecerá no email de pedido de pagamento.</p>
                </div>
            )}

            {method === 'ATM_REFERENCE' && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-md space-y-3 animate-in fade-in">
                    <h4 className="font-semibold text-blue-900">Configuração Gateway (IfthenPay / EuPago)</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Entidade</Label>
                            <Input value={entityCode} onChange={(e) => setEntityCode(e.target.value)} placeholder="Ex: 12345" />
                        </div>
                        <div className="space-y-1">
                            <Label>Chave de Backoffice / API Key</Label>
                            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                        </div>
                    </div>
                    <p className="text-xs text-blue-600">O sistema irá gerar referências automaticamente usando estes dados.</p>
                </div>
            )}

        </CardContent>
        <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
            <Button onClick={handleSave} disabled={mutation.isPending}>Guardar Configuração</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CompanyPaymentSettingsPage;