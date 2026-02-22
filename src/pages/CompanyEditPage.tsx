// frontend/src/pages/CompanyEditPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCompanyDetails,
  updateCompany,
  fetchLocationByPostalCode,
  checkCompanyMonitoring,
  toggleCompanyMonitoring
} from '../services/api';
import { UserRole } from '../types/user';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import RichTextEditor from '../components/ui/RichTextEditor';
import { FilePurpose } from '../types/file';
import { Checkbox } from '../components/ui/Checkbox';
import { SubscribedService } from '../types/company';
import { translateServiceName } from '../lib/translations';
import { BellRing, Smartphone, ShieldCheck, BriefcaseBusiness } from 'lucide-react';
import { KioskQRCode } from '../components/kiosk/KioskQRCode';
import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  email: string;
  nif: string;
  address?: string;
  postalCode?: string;
  locality?: string;
  phone?: string;
  defaultSignatureHtml?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subscribedServices: SubscribedService[];
  forceTwoFactorForOperators: boolean;
}

const CompanyEditPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { companyId: companyIdFromParams } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isMonitored, setIsMonitored] = useState(false);
  const [formData, setFormData] = useState<Partial<CompanyData> | null>(null);
  const [subscribedServices, setSubscribedServices] = useState<Set<string>>(new Set());

  // Fonte da verdade para o ID
  const companyId = companyIdFromParams || user?.company?.id;

  const {
    data: companyDetails,
    isLoading,
    error,
  } = useQuery<CompanyData, Error>({
    queryKey: ['company', companyId],
    queryFn: () => fetchCompanyDetails(companyId!),
    enabled: !!companyId,
  });

  const {
    mutate: updateCompanyMutate,
    isPending,
    error: updateError,
    isSuccess,
  } = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsEditing(false);
    },
  });

  // Preencher form quando chegam dados
  useEffect(() => {
    if (companyDetails) {
      setFormData(companyDetails);
      setSubscribedServices(new Set(companyDetails.subscribedServices || []));
    }
  }, [companyDetails]);

  // Verificar se está a ser monitorizada (só Platform Admin)
  useEffect(() => {
    if (companyDetails && user?.role === UserRole.PLATFORM_ADMIN && companyDetails.id) {
      checkCompanyMonitoring(companyDetails.id)
        .then((data) => setIsMonitored(data.isMonitoring))
        .catch((err) => console.error('Erro ao verificar monitorização:', err));
    }
  }, [companyDetails, user]);

  // Limpa o state do banner pós-criação depois de renderizar uma vez
  useEffect(() => {
    if (location?.state?.justCreated) {
      // deixa renderizar 1x e limpa o state
      navigate('.', { replace: true, state: {} });
    }
  }, [location?.state?.justCreated, navigate]);

  const handleToggleMonitoring = async (checked: boolean) => {
    setIsMonitored(checked);
    try {
      await toggleCompanyMonitoring(companyId!);
    } catch (e) {
      setIsMonitored(!checked);
      alert('Erro ao alterar monitorização.');
    }
  };

  const handleServiceToggle = (service: SubscribedService) => {
    setSubscribedServices((prev) => {
      const next = new Set(prev);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });
  };

  const handleInputChange = (e: { target: { name: string; value: any } }) => {
    setFormData((prev) => (prev ? { ...prev, [e.target.name]: e.target.value } : null));
  };

  const handlePostalCodeChange = async (newPostalCode: string) => {
    setFormData((prev) => (prev ? { ...prev, postalCode: newPostalCode } : null));
    const cleanedPostalCode = newPostalCode.replace(/[\s-]/g, '');
    if (cleanedPostalCode.length === 7) {
      try {
        const locationData = await fetchLocationByPostalCode(cleanedPostalCode);
        if (locationData) {
          setFormData((currentData) =>
            currentData ? { ...currentData, locality: locationData.locality } : null
          );
        }
      } catch (error) {
        console.error('Código postal não encontrado:', error);
        setFormData((currentData) => (currentData ? { ...currentData, locality: '' } : null));
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyId || !formData) return;
    const dataToSend = {
      email: formData.email,
      address: formData.address,
      postalCode: formData.postalCode,
      locality: formData.locality,
      phone: formData.phone,
      defaultSignatureHtml: formData.defaultSignatureHtml,
      subscribedServices: Array.from(subscribedServices),
      forceTwoFactorForOperators: formData.forceTwoFactorForOperators,
    };
    updateCompanyMutate({ companyId, companyData: dataToSend });
  };

  const handleEditToggle = () => {
    if (isEditing && companyDetails) {
      setFormData(companyDetails); // restaura ao cancelar
      setSubscribedServices(new Set(companyDetails.subscribedServices || []));
    }
    setIsEditing((s) => !s);
  };

  // Usa o Set atual para refletir imediatamente os toggles no UI
  const isQueuesSubscribed = subscribedServices.has(SubscribedService.QUEUES);

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (isLoading || !formData) {
    return <div className="p-6 text-center">A carregar...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-500">Erro: {error.message}</div>;
  }

  // ---------- Secções ----------
  const bannerSection =
    location?.state?.justCreated ? (
      <div className="mx-0 rounded-md border border-green-200 bg-green-50 p-3 text-green-800">
        <div className="font-semibold">Empresa criada com sucesso</div>
        <div className="text-sm">
          {location?.state?.companyName ? `“${location.state.companyName}”` : 'A nova empresa'} foi
          criada. Pode agora completar os restantes detalhes e configurações.
        </div>
      </div>
    ) : null;

  const feedbackSection =
    isSuccess || updateError ? (
      <div
        className={
          'rounded-md p-3 ' +
          (isSuccess
            ? 'border border-green-200 bg-green-50 text-green-800'
            : 'border border-red-200 bg-red-50 text-red-700')
        }
      >
        {isSuccess ? 'Empresa atualizada com sucesso!' : (updateError as Error)?.message}
      </div>
    ) : null;

  return (
    <DetailFormTemplate
      header={{
        icon: BriefcaseBusiness,
        title: 'Detalhes da Empresa',
        subtitle: isEditing
          ? `A editar o perfil da empresa ${companyDetails?.name}.`
          : `A visualizar o perfil da empresa ${companyDetails?.name}.`,
        // Poderíamos colocar aqui um "Ajuda" ou "Histórico" no futuro
        actions: (
          // HEADER ACTIONS — alinhadas à direita com espaçamento consistente
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(-1)}
                >
                  Voltar
                </Button>
                <Button size="sm" onClick={handleEditToggle}>
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={isPending}
                >
                  {isPending ? 'A Guardar...' : 'Guardar Alterações'}
                </Button>
              </>
            )}
          </div>
        ),
      }}
      columnsMd={2}
      sections={[
        // Banner pós-criação (se existir)
        ...(bannerSection
          ? [
              {
                content: bannerSection,
                accent: false,
                className: 'md:col-span-2',
              } as const,
            ]
          : []),

        // Feedback pós-update (sucesso/erro)
        ...(feedbackSection
          ? [
              {
                content: feedbackSection,
                accent: false,
                className: 'md:col-span-2',
              } as const,
            ]
          : []),

        // Identificação (read-only)
        {
          title: 'Identificação',
          description: 'Dados base de identificação da empresa.',
          accent: true,
          content: (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Nome da Empresa</Label>
                <Input id="name" value={formData.name || ''} disabled />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={formData.slug || ''} disabled />
              </div>
              <div className="grid gap-1.5 md:col-span-2">
                <Label htmlFor="nif">NIF</Label>
                <Input id="nif" value={formData.nif || ''} disabled />
              </div>
            </div>
          ),
        },

        // Contactos e Morada
        {
          title: 'Contactos e Morada',
          description: 'Atualize o email de contacto e a morada principal.',
          accent: true,
          content: (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={
                      isEditing && formData.email !== companyDetails?.email
                        ? 'border-blue-500 bg-blue-50'
                        : ''
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={
                      isEditing && formData.phone !== companyDetails?.phone
                        ? 'border-blue-500 bg-blue-50'
                        : ''
                    }
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="address">Morada</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={
                    isEditing && formData.address !== companyDetails?.address
                      ? 'border-blue-500 bg-blue-50'
                      : ''
                  }
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="postalCode">Código Postal</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode || ''}
                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                    disabled={!isEditing}
                    className={
                      isEditing && formData.postalCode !== companyDetails?.postalCode
                        ? 'border-blue-500 bg-blue-50'
                        : ''
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="locality">Localidade</Label>
                  <Input
                    id="locality"
                    name="locality"
                    value={formData.locality || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={
                      isEditing && formData.locality !== companyDetails?.locality
                        ? 'border-blue-500 bg-blue-50'
                        : ''
                    }
                  />
                </div>
              </div>
            </form>
          ),
        },

        // Assinatura Padrão
        {
          title: 'Assinatura de Email Padrão',
          description: 'Esta assinatura será adicionada automaticamente ao final dos emails.',
          accent: true,
          className: 'md:col-span-2',
          content: (
            <div className={`rounded-md border ${!isEditing ? 'bg-gray-100' : 'bg-white'}`}>
              <RichTextEditor
                value={formData.defaultSignatureHtml || ''}
                onChange={(value) => handleInputChange({ target: { name: 'defaultSignatureHtml', value } })}
                readOnly={!isEditing}
                uploadOwner={{
                  ownerType: 'Company',
                  ownerId: companyId!,
                  purpose: FilePurpose.COMPANY_SIGNATURE_IMAGE,
                }}
              />
            </div>
          ),
        },

        // Segurança Operacional
        {
          title: 'Segurança Operacional',
          description: 'Políticas de autenticação aplicadas aos operadores.',
          accent: true,
          content: (
            <div className="flex items-start space-x-2">
              <Checkbox
                id="force2fa"
                checked={formData.forceTwoFactorForOperators || false}
                onCheckedChange={(checked) =>
                  handleInputChange({ target: { name: 'forceTwoFactorForOperators', value: Boolean(checked) } })
                }
                disabled={!isEditing}
                className="mt-1"
              />
              <div>
                <Label htmlFor="force2fa" className="font-medium cursor-pointer text-gray-800">
                  Obrigar Operadores a usar Dupla Autenticação
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Se ativo, qualquer operador desta empresa receberá um código de verificação no email sempre que
                  tentar iniciar sessão.
                </p>
              </div>
            </div>
          ),
        },

        // Supervisão Técnica (só em edição e Platform Admin)
        ...(user?.role === UserRole.PLATFORM_ADMIN && isEditing
          ? [
              {
                title: (
                  <span className="flex items-center gap-2 text-blue-900">
                    <BellRing className="w-5 h-5" />
                    Supervisão Técnica
                  </span>
                ),
                description: 'Receber notificações de falhas desta empresa (Quiosques/Displays Offline).',
                accent: true,
                content: (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="monitoring"
                      checked={isMonitored}
                      onCheckedChange={(c) => handleToggleMonitoring(Boolean(c))}
                    />
                    <Label htmlFor="monitoring" className="font-medium cursor-pointer text-blue-800">
                      Ativar supervisão
                    </Label>
                  </div>
                ),
              } as const,
            ]
          : []),

        // Módulos Subscritos (apenas Platform Admin)
        ...(user?.role === UserRole.PLATFORM_ADMIN
          ? [
              {
                title: 'Módulos Subscritos',
                description: 'Ative ou desative os módulos subscritos para esta empresa.',
                accent: true,
                content: (
                  <div className="space-y-2 p-1">
                    {Object.values(SubscribedService).map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service}`}
                          checked={subscribedServices.has(service)}
                          onCheckedChange={() => handleServiceToggle(service)}
                          disabled={!isEditing}
                        />
                        <Label
                          htmlFor={`service-${service}`}
                          className={`font-normal ${!isEditing ? 'text-muted-foreground' : ''}`}
                        >
                          {translateServiceName(service)}
                        </Label>
                      </div>
                    ))}
                  </div>
                ),
              } as const,
            ]
          : []),

        // Acesso Móvel Global (QR Code) — só se Queues subscrito
        ...(isQueuesSubscribed
          ? [
              {
                title: (
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Acesso Móvel Global
                  </span>
                ),
                description: 'Este QR Code dá acesso a todos os serviços de fila abertos desta empresa.',
                accent: true,
                className: 'md:col-span-2',
                content: (
                  <div className="flex justify-center pt-2">
                    <KioskQRCode
                      companySlug={companyDetails!.slug}
                      kioskName={`Todos os Serviços (${companyDetails!.name})`}
                      // sem kioskId => QR global
                    />
                  </div>
                ),
              } as const,
            ]
          : []),
      ]}
      actions={
        <>
          {/* Esquerda: podemos deixar espaço futuro; por agora só botões à direita */}
          {/* Direita: ações contextuais */}
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={() => navigate(-1)}
              >
                Voltar
              </Button>
              <Button className="w-full md:w-auto" onClick={handleEditToggle}>
                Editar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={handleEditToggle}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                className="w-full md:w-auto"
                onClick={() => handleSubmit()}
                disabled={isPending}
              >
                {isPending ? 'A Guardar...' : 'Guardar Alterações'}
              </Button>
            </>
          )}
        </>
      }
    />
  );
};

export default CompanyEditPage;