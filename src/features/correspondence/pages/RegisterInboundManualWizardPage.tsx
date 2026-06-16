// frontend/src/features/correspondence/pages/RegisterInboundManualWizardPage.tsx

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

import {
  UtilityPageTemplate,
  UtilitySection,
} from '../../../components/templates/UtilityPageTemplate';

import { useCreateInboundEntry } from '../hooks/useCreateInboundEntry';
import WizardStepContext from '../components/WizardStepContext';
import WizardStepContent from '../components/WizardStepContent';
//import WizardStepConfirm from '../components/WizardStepConfirm';
import { Inbox } from 'lucide-react';

export default function RegisterInboundManualWizardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createEntry = useCreateInboundEntry();
  const [searchParams] = useSearchParams();

  const companyIdFromUrl = searchParams.get('companyId') ?? undefined;

//  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step, setStep] = useState<1 | 2>(1);
//  const [registryId, setRegistryId] = useState<string | null>(null);

//  const today = new Date().toISOString().slice(0, 10);
const today = new Date().toLocaleDateString('en-CA');

  const handleFinish = (companyId?: string) => {
    if (companyId) {
      navigate(`/correspondence/inbox/company/${companyId}`);
    } else {
      navigate('/correspondence/inbox');
    }
  };


const handleCancel = () => {
  const isPlatformAdmin =
    user?.role?.includes('PLATFORM_ADMIN');

  if (isPlatformAdmin && contextData.companyId) {
    navigate(
      `/correspondence/inbox/company/${contextData.companyId}`
    );
    return;
  }

  navigate('/correspondence/inbox');
};


  // ✅ STEP 1 — CONTEXTO
  const [contextData, setContextData] = useState<any>({
    companyId: companyIdFromUrl,
    channel: 'MANUAL',
    receivedAt: today,
  });

  // ✅ STEP 2 — CONTEÚDO
  const [contentData, setContentData] = useState<{
    subject?: string;
    description?: string;
  }>({});

  const handleCreateEntry = () => {
    const payload = {
      companyId: contextData.companyId,
      channel: contextData.channel,
      department: contextData.department || undefined,
      originId: contextData.originId || undefined,
      receivedAt: contextData.receivedAt || undefined,

      // ✅ AGORA VEM DO STEP 2
      subject: contentData.subject || undefined,
      description: contentData.description || undefined,
    };

/*     createEntry.mutate(payload, {
      onSuccess: (registry) => {
        setRegistryId(registry.id);
        setStep(3);
      },
    }); */
createEntry.mutate(payload, {
  onSuccess: () => {
    // ✅ Feedback ao utilizador (InfoModal)
    window.dispatchEvent(
      new CustomEvent('app:showInfoDialog', {
        detail: {
          title: 'Entrada criada',
          message:
            'A entrada foi registada com sucesso e encontra-se agora na Inbox à espera de decisão.',
        },
      }),
    );

    // ✅ Navegar para a Inbox
    handleFinish(contextData.companyId);
  },
});    
  };

  return (
    <UtilityPageTemplate
      header={{
        icon: Inbox,
        title: 'Registar Entrada Manual',
        subtitle:
          'Criação de registo de entrada manual no sistema.',
      }}
      accent={{ content: true }}
    >

<div className="border-b pb-4 mb-4">
  <div className="flex items-center justify-between">

    {/* Step title */}
    <div>
      <h3 className="text-lg font-semibold text-gray-900">
        {step === 1 && 'Contexto'}
        {step === 2 && 'Conteúdo'}
      </h3>
      <p className="text-sm text-gray-500">
        Passo {step} de 2
      </p>
    </div>

    {/* Progress indicator */}
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-12 rounded ${
          step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      />
      <div
        className={`h-2 w-12 rounded ${
          step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      />
    </div>

  </div>
</div>

      <UtilitySection className="w-full max-w-none space-y-6">
        {step === 1 && (
          <WizardStepContext
            data={contextData}
            onChange={setContextData}
            onCancel={handleCancel}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <WizardStepContent
            registryId="__TEMP__" 
            data={contentData}
            onChange={setContentData}
            onBack={() => setStep(1)}
            onContinue={handleCreateEntry}
            onCancel={handleCancel}
          />
        )}

{/*         {step === 3 && (
          
          <WizardStepConfirm
            companyId={contextData.companyId}
            onFinish={handleFinish}
          />

        )} */}
      </UtilitySection>
    </UtilityPageTemplate>
  );
}