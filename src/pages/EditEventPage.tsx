import * as React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';

import { Page } from '../components/layout/Page';
import { StandardCard } from '../components/ui/StandardCard';
import { Button } from '../components/ui/Button';

import { useEventEditor } from '../hooks/useEventEditor';
import { PageHeaderActions } from '../components/events/editor/PageHeaderActions';
import { EventDetailsForm } from '../components/events/editor/EventDetailsForm';
import { PricingTiersCard } from '../components/events/editor/PricingTiersCard';
import { FormFieldsListCard } from '../components/events/editor/FormFieldsListCard';
import { AddFieldCard } from '../components/events/editor/AddFieldCard';
import { EventAssetsCard } from '../components/events/editor/EventAssetsCard';
import { CertificateCard } from '../components/events/editor/CertificateCard';
import { EventFieldType } from '../types/event';


export default function EditEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1) eventId cru (pode ser undefined)
  const params = useParams<{ eventId: string }>();
  const rawEventId = params.eventId;

  // 2) versão segura para hooks/props que exigem string
  const safeEventId = rawEventId ?? '';

  // 3) CHAMAR HOOKS SEMPRE (nunca condicionalmente)
  const {
    eventDetails, isLoading, error,
    name, setName,
    description, setDescription,
    startDate, setStartDate,
    endDate, setEndDate,
    location, setLocation,
    maxParticipants, setMaxParticipants,
    waitingListMargin, setWaitingListMargin,
    isActive, setIsActive,
    isPublic, setIsPublic,
    enableCheckIn, setEnableCheckIn,
    baseCost, setBaseCost,
    costType1, setCostType1,
    costType2, setCostType2,
    costType3, setCostType3,

    pricingTiers, addPricingTier, removePricingTier,

    fieldDefinitions, setFieldDefinitions,
    addField, deleteField, reorderFields,

    certificateSendingMode, setCertificateSendingMode,

    saveEvent, updatePartial, isSaving,
    success, setSuccess,
  } = useEventEditor(safeEventId);

  // 4) Só agora, retornos condicionais para UX
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  if (!rawEventId) return <div className="p-6">Evento inválido.</div>;

  if (isLoading) return <div className="p-6">A carregar…</div>;
  if (error) return <div className="p-6 text-red-600">Erro: {error.message}</div>;
  if (!eventDetails) return <div className="p-6">Evento não encontrado.</div>;

  const checkboxFields = fieldDefinitions.filter(f => f.fieldType === EventFieldType.CHECKBOX);

  return (
    <Page>
      {success && (
        <div className="fixed top-20 right-4 z-50 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-md shadow-lg">
          {success}
        </div>
      )}

      <Page.Header>
        <PageHeaderActions
          title={`Editar Evento`}
          subtitle={`A editar os detalhes para "${eventDetails.name}"`}
          onSave={saveEvent}
          isSaving={isSaving}
        />
      </Page.Header>

      <Page.Body>
        <div className="space-y-6">
          <StandardCard title="Informações Gerais">
            <EventDetailsForm
              name={name} setName={setName}
              description={description} setDescription={setDescription}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
              location={location} setLocation={setLocation}
              maxParticipants={maxParticipants} setMaxParticipants={setMaxParticipants}
              waitingListMargin={waitingListMargin} setWaitingListMargin={setWaitingListMargin}
              baseCost={baseCost} setBaseCost={setBaseCost}
              isActive={isActive} setIsActive={setIsActive}
              isPublic={isPublic} setIsPublic={setIsPublic}
              enableCheckIn={enableCheckIn} setEnableCheckIn={setEnableCheckIn}
            />
          </StandardCard>

          <PricingTiersCard
            pricingTiers={pricingTiers}
            addPricingTier={addPricingTier}
            removePricingTier={removePricingTier}
            checkboxFields={checkboxFields}
          />

          <FormFieldsListCard
            fieldDefinitions={fieldDefinitions}
            setFieldDefinitions={setFieldDefinitions}
            deleteField={deleteField}
            reorderFields={reorderFields}
          />

          <AddFieldCard
            checkboxFields={checkboxFields}
            onAddField={addField}
          />
  {/* <- usa sempre a string safe */}
          <EventAssetsCard
            eventId={safeEventId}              
            currentBannerUrl={eventDetails?.banner?.url}
            onUpdateBanner={(bannerFileId) => updatePartial({ bannerFileId })}
            existingDocs={eventDetails?.documents || []}
          />
  {/* <- idem */}
          <CertificateCard
            eventId={safeEventId}              
            initialConfig={eventDetails?.certificateConfig}
            certificateSendingMode={certificateSendingMode}
            setCertificateSendingMode={(mode) => {
              setCertificateSendingMode(mode);
              updatePartial({ certificateSendingMode: mode });
            }}
            updatePartial={(partial) => updatePartial(partial)}
          />

          <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </Page.Body>
    </Page>
  );
}
