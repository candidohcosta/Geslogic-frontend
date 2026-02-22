import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchEventById, updateEvent, addEventField, deleteEventField, reorderEventFields,
} from '../services/api';
import {
  EventData, EventFieldDefinitionData, EventFieldType, EventPricingTier, CertificateSendingMode,
} from '../types/event';

type UseEventEditorResult = {
  // carregamento
  eventDetails?: EventData;
  isLoading: boolean;
  error: Error | null;

  // estado formulário principal
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  maxParticipants: number | ''; setMaxParticipants: (v: number | '') => void;
  waitingListMargin: string; setWaitingListMargin: (v: string) => void;
  isActive: boolean; setIsActive: (v: boolean) => void;
  isPublic: boolean; setIsPublic: (v: boolean) => void;
  enableCheckIn: boolean; setEnableCheckIn: (v: boolean) => void;

  // custos
  baseCost: number | ''; setBaseCost: (v: number | '') => void;
  costType1: number | ''; setCostType1: (v: number | '') => void;
  costType2: number | ''; setCostType2: (v: number | '') => void;
  costType3: number | ''; setCostType3: (v: number | '') => void;

  // pricing
  pricingTiers: EventPricingTier[];
  setPricingTiers: React.Dispatch<React.SetStateAction<EventPricingTier[]>>;
  addPricingTier: (tier: Partial<EventPricingTier>) => void;
  removePricingTier: (index: number) => void;

  // campos
  fieldDefinitions: EventFieldDefinitionData[];
  setFieldDefinitions: React.Dispatch<React.SetStateAction<EventFieldDefinitionData[]>>;
  addField: (data: {
    fieldName: string;
    fieldType: EventFieldType;
    isRequired: boolean;
    placeholder?: string;
    options?: string[];
    isGroupingField?: boolean;
    dependsOnFieldDefinitionId?: string;
  }) => void;
  deleteField: (fieldId: string) => void;
  reorderFields: (updated: EventFieldDefinitionData[]) => void;

  // certificado
  certificateSendingMode: CertificateSendingMode;
  setCertificateSendingMode: (v: CertificateSendingMode) => void;

  // handlers gerais
  saveEvent: () => void;
  updatePartial: (partial: any) => void;
  isSaving: boolean;

  // UI
  success?: string | null; setSuccess: (msg: string | null) => void;
};

export function useEventEditor(eventId: string): UseEventEditorResult {
  const qc = useQueryClient();

  // estado base
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [maxParticipants, setMaxParticipants] = React.useState<number | ''>('');
  const [waitingListMargin, setWaitingListMargin] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);
  const [isPublic, setIsPublic] = React.useState(true);
  const [enableCheckIn, setEnableCheckIn] = React.useState(false);

  // custos
  const [baseCost, setBaseCost] = React.useState<number | ''>(0);
  const [costType1, setCostType1] = React.useState<number | ''>('');
  const [costType2, setCostType2] = React.useState<number | ''>('');
  const [costType3, setCostType3] = React.useState<number | ''>('');

  // pricing
  const [pricingTiers, setPricingTiers] = React.useState<EventPricingTier[]>([]);
  // campos
  const [fieldDefinitions, setFieldDefinitions] = React.useState<EventFieldDefinitionData[]>([]);
  // certificado
  const [certificateSendingMode, setCertificateSendingMode] = React.useState<CertificateSendingMode>(CertificateSendingMode.MANUAL);

  const [success, setSuccess] = React.useState<string | null>(null);

  // fetch
  const { data: eventDetails, isLoading, error } = useQuery<EventData, Error>({
    queryKey: ['event', eventId],
    queryFn: () => fetchEventById(eventId),
    enabled: !!eventId,
  });

  // preencher estado quando carrega
  React.useEffect(() => {
    if (!eventDetails) return;
    const fmt = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

    setName(eventDetails.name);
    setDescription(eventDetails.description || '');
    setStartDate(fmt(eventDetails.startDate));
    setEndDate(fmt(eventDetails.endDate));
    setLocation(eventDetails.location || '');
    setMaxParticipants(eventDetails.maxParticipants ?? '');
    setWaitingListMargin(eventDetails.waitingListMargin || '');
    setIsActive(eventDetails.isActive);
    setIsPublic(eventDetails.isPublic);
    setEnableCheckIn((eventDetails as any).enableCheckIn ?? false);
    setCertificateSendingMode(eventDetails.certificateSendingMode || CertificateSendingMode.MANUAL);

    setBaseCost(eventDetails.baseCost ?? 0);
    setPricingTiers(eventDetails.pricingTiers ?? []);
    setFieldDefinitions((eventDetails.fieldDefinitions ?? []).slice().sort((a, b) => a.order - b.order));
  }, [eventDetails]);

  // mutations
  const { mutate: mutateUpdateEvent, isPending: isSaving } = useMutation({
    mutationFn: updateEvent,
    onSuccess: () => {
      setSuccess('Detalhes do evento atualizados com sucesso!');
      qc.invalidateQueries({ queryKey: ['event', eventId] });
      setTimeout(() => setSuccess(null), 2500);
    },
  });

  const updatePartial = (partial: any) => {
    mutateUpdateEvent({ eventId, eventData: partial });
  };

  const { mutate: mutateAddField } = useMutation({
    mutationFn: addEventField,
    onSuccess: () => {
      setSuccess('Campo adicionado com sucesso!');
      qc.invalidateQueries({ queryKey: ['event', eventId] });
      setTimeout(() => setSuccess(null), 2000);
    },
  });

  const { mutate: mutateDeleteField } = useMutation({
    mutationFn: deleteEventField,
    onSuccess: () => {
      setSuccess('Campo removido com sucesso!');
      qc.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });

  const { mutate: mutateReorderFields } = useMutation({
    mutationFn: reorderEventFields,
    onSuccess: () => setSuccess('Ordem dos campos atualizada com sucesso!'),
  });

  // helpers
  const addPricingTier = (tier: Partial<EventPricingTier>) => {
    if (!tier.name || tier.price === undefined || tier.price === null || (tier.price as any) === '') return;
    setPricingTiers(prev => [
      ...prev,
      {
        name: tier.name!,
        price: Number(tier.price),
        multiRegistrationPrice:
          tier.multiRegistrationPrice !== undefined &&
          tier.multiRegistrationPrice !== null &&
          (tier.multiRegistrationPrice as any) !== ''
            ? Number(tier.multiRegistrationPrice)
            : undefined,
        description: tier.description,
        requiredFieldDefinitionId: tier.requiredFieldDefinitionId,
      },
    ]);
  };

  const removePricingTier = (index: number) =>
    setPricingTiers(prev => prev.filter((_, i) => i !== index));

  const addField = (data: {
    fieldName: string;
    fieldType: EventFieldType;
    isRequired: boolean;
    placeholder?: string;
    options?: string[];
    isGroupingField?: boolean;
    dependsOnFieldDefinitionId?: string;
  }) => {
    mutateAddField({
      eventId,
      fieldData: {
        fieldName: data.fieldName,
        fieldType: data.fieldType,
        isRequired: data.isRequired,
        order: fieldDefinitions.length,
        placeholder: data.placeholder || undefined,
        options: data.fieldType === EventFieldType.DROPDOWN ? data.options : undefined,
        isGroupingField: !!data.isGroupingField,
        dependsOnFieldDefinitionId: data.dependsOnFieldDefinitionId || undefined,
      },
    });
  };

  const deleteField = (fieldId: string) => {
    mutateDeleteField({ eventId, fieldId });
  };

  const reorderFields = (updated: EventFieldDefinitionData[]) => {
    setFieldDefinitions(updated);
    const payload = updated.map((f, i) => ({ id: f.id, order: i }));
    mutateReorderFields({ eventId, orderPayload: payload });
  };

  const saveEvent = () => {
    if (!name || !startDate || !location || maxParticipants === '' || baseCost === '') return;

    const cleanedPricingTiers = pricingTiers.map(t => ({
      name: t.name,
      description: t.description,
      price: Number(t.price),
      multiRegistrationPrice: t.multiRegistrationPrice !== undefined ? Number(t.multiRegistrationPrice) : undefined,
      requiredFieldDefinitionId: t.requiredFieldDefinitionId,
    }));

    const payload = {
      name,
      description,
      startDate,
      endDate: endDate || null,
      location,
      maxParticipants: Number(maxParticipants),
      waitingListMargin,
      isActive,
      isPublic,
      enableCheckIn,
      baseCost: Number(baseCost),
      costType1: costType1 !== '' ? Number(costType1) : undefined,
      costType2: costType2 !== '' ? Number(costType2) : undefined,
      costType3: costType3 !== '' ? Number(costType3) : undefined,
      certificateSendingMode,
      pricingTiers: cleanedPricingTiers,
    };

    mutateUpdateEvent({ eventId, eventData: payload });
  };

  return {
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

    pricingTiers, setPricingTiers,
    addPricingTier,
    removePricingTier,

    fieldDefinitions, setFieldDefinitions,
    addField,
    deleteField,
    reorderFields,

    certificateSendingMode, setCertificateSendingMode,

    saveEvent,
    updatePartial,
    isSaving,

    success,
    setSuccess,
  };
}