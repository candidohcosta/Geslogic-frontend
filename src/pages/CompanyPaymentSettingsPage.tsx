import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';

import { fetchPaymentConfig, updatePaymentConfig } from '../services/api';

import { UtilityPageTemplate, UtilitySection } from '../components/templates/UtilityPageTemplate';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import RichTextEditor from '../components/ui/RichTextEditor';

type PaymentMethod = 'MANUAL_UPLOAD' | 'ATM_REFERENCE';

interface PaymentConfig {
  method: PaymentMethod;
  paymentInstructions?: string | null;
  entityCode?: string | null;
  apiKey?: string | null;
}

const DEFAULT_CONFIG: PaymentConfig = {
  method: 'MANUAL_UPLOAD',
  paymentInstructions: '',
  entityCode: '',
  apiKey: '',
};

const CompanyPaymentSettingsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Quem é o alvo?
  const targetId = companyId || user?.company?.id;

  // Gate de permissões (UI): Platform Admin pode tudo; Company Admin só a sua empresa
  const canEdit = useMemo(() => {
    if (!user || !targetId) return false;
    if (user.role === UserRole.PLATFORM_ADMIN) return true;
    if (user.role === UserRole.COMPANY_ADMIN) {
      return user.company?.id === targetId;
    }
    return false;
  }, [user, targetId]);

  // Estado de formulário
  const [method, setMethod] = useState<PaymentMethod>('MANUAL_UPLOAD');
  const [instructions, setInstructions] = useState('');
  const [entityCode, setEntityCode] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Carregar config
  const { data: config, isLoading, error } = useQuery<PaymentConfig>({
    queryKey: ['paymentConfig', targetId],
    queryFn: () => fetchPaymentConfig(targetId!),
    enabled: !!targetId,
    select: (d: any) => {
      // Segurança contra APIs que devolvem { config } vs objeto direto
      const c: PaymentConfig = (d?.config ?? d) || DEFAULT_CONFIG;
      return {
        method: (c.method as PaymentMethod) || 'MANUAL_UPLOAD',
        paymentInstructions: c.paymentInstructions ?? '',
        entityCode: c.entityCode ?? '',
        apiKey: c.apiKey ?? '',
      };
    },
  });

  // Preenche o formulário quando chegam dados
  useEffect(() => {
    if (!config) return;
    setMethod(config.method || 'MANUAL_UPLOAD');
    setInstructions(config.paymentInstructions || '');
    setEntityCode(config.entityCode || '');
    setApiKey(config.apiKey || '');
  }, [config]);

  // Dirty state
  const isDirty = useMemo(() => {
    if (!config) return false;
    return (
      method !== (config.method || 'MANUAL_UPLOAD') ||
      (instructions || '') !== (config.paymentInstructions || '') ||
      (entityCode || '') !== (config.entityCode || '') ||
      (apiKey || '') !== (config.apiKey || '')
    );
  }, [config, method, instructions, entityCode, apiKey]);

  // Mutations
  const mutation = useMutation({
    mutationFn: (data: PaymentConfig) => updatePaymentConfig({ companyId: targetId!, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentConfig', targetId] });
      toast.success('Configurações guardadas com sucesso.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Ocorreu um erro ao guardar a configuração.');
    },
  });

  const handleSave = () => {
    if (!targetId || !canEdit || mutation.isPending) return;
    mutation.mutate({
      method,
      paymentInstructions: instructions,
      entityCode: entityCode || undefined,
      apiKey: apiKey || undefined,
    });
  };

  // Guardas simples
  if (!targetId) {
    return <div className="p-6 text-center text-red-600">Erro: Empresa não identificada.</div>;
  }
  if (!user) {
    return <div className="p-6 text-center text-red-600">Sessão expirada. Faça login novamente.</div>;
  }
  if (!canEdit) {
    return (
      <div className="p-6 text-center text-red-600">
        Acesso negado: não tem permissões para configurar pagamentos para esta empresa.
      </div>
    );
  }
  if (isLoading) {
    return <div className="p-6 text-center">A carregar...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-600">Erro ao carregar: {(error as Error).message}</div>;
  }

  // Options bar: seletor de método (fica sempre no topo, rápido de alternar)
  const OptionsBar = (
    <div className="flex flex-col gap-3">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>Método de Pagamento Principal</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL_UPLOAD">Transferência Bancária (Manual)</SelectItem>
              <SelectItem value="ATM_REFERENCE">Referência Multibanco (Automático)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Placeholder para alinhamento / espaço futuro (ex.: moeda, sandbox) */}
        <div />
      </div>
    </div>
  );

  return (
    <UtilityPageTemplate
      header={{
        icon: CreditCard,
        title: 'Configuração Financeira',
        subtitle: 'Defina como deseja receber os pagamentos das inscrições.',
        actions: (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                  Voltar
                </Button>
                <Button onClick={handleSave} size="sm" disabled={!isDirty || mutation.isPending}>
                  {mutation.isPending ? 'A guardar…' : 'Guardar Configuração'}
                </Button>
              </>
            </div>
        ),
      }}
      optionsBar={OptionsBar}
      accent={{ options: true, content: false }} // options com accent, content deixamos sections controlarem
    >
      {/* MANUAL */}
      {method === 'MANUAL_UPLOAD' && (
        <UtilitySection withAccent padded className="mt-1">
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Instruções para o Cliente (Texto livre)</Label>
                <RichTextEditor
                value={instructions}
                onChange={(value) => setInstructions(value)}   // devolve HTML string
                readOnly={false}
                uploadOwner={{
                    ownerType: 'Company',
                    ownerId: targetId!,                         // garante que passas o ID
                    purpose: 'COMPANY_PAYMENT_INSTRUCTIONS',    // sugiro nova chave específica
                }}
                />
                <p className="text-xs text-gray-500">
                Este conteúdo (HTML) será incluído na comunicação de pagamento. Evite informação sensível.
                </p>

            </div>
          </div>
        </UtilitySection>
      )}

      {/* AUTOMÁTICO: REFERÊNCIA MB */}
      {method === 'ATM_REFERENCE' && (
        <UtilitySection
          withAccent
          padded
          brandClassName="border-t-blue-500"
          className="mt-1"
        >
          <div className="space-y-3">
            <h4 className="font-semibold text-blue-900">Gateway (IfthenPay / EuPago)</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Entidade</Label>
                <Input
                  value={entityCode}
                  onChange={(e) => setEntityCode(e.target.value)}
                  placeholder="Ex.: 12345"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Chave de Backoffice / API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="••••••••••"
                />
              </div>
            </div>
            <p className="text-xs text-blue-700">
              O sistema irá gerar referências automaticamente usando estes dados.
            </p>
          </div>
        </UtilitySection>
      )}

      {/* Ações (footer da página) */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Voltar
        </Button>
        <Button onClick={handleSave} size="sm" disabled={!isDirty || mutation.isPending}>
          {mutation.isPending ? 'A guardar…' : 'Guardar Configuração'}
        </Button>
      </div>
    </UtilityPageTemplate>
  );
};

export default CompanyPaymentSettingsPage;