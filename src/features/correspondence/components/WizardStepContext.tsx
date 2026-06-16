// frontend/src/features/correspondence/components/WizardStepContext.tsx

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Label } from '../../../components/ui/Label';
import { useSearchOrigins } from '../hooks/useSearchOrigins';
import { useCreateOrigin } from '../hooks/useCreateOrigin';
import { useCompanies } from '../../../hooks/companies/useCompanies';
import { useAuth } from '../../../context/AuthContext';
import ConfirmCreateOriginModal from './modals/ConfirmCreateOriginModal';

// ✅ NOVO
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export interface WizardContextData {
  companyId?: string;
  originId?: string;
  originName?: string;
  channel: string;
  department?: string;
  receivedAt?: string;
}

interface Props {
  data: WizardContextData;
  onChange: (data: WizardContextData) => void;
  onCancel: () => void;
  onContinue: () => void;
  isSubmitting?: boolean;
}

export default function WizardStepContext({
  data,
  onChange,
  onCancel,
  onContinue,
  isSubmitting,
}: Props) {
  const { user } = useAuth();
  const isPlatformAdmin = user?.role?.includes('PLATFORM_ADMIN');

  const [searchParams] = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId') ?? undefined;

  const { data: companies = [] } = useCompanies();

  /* -------------------------
   * Origem – estado explícito
   * ------------------------- */
  const [originQuery, setOriginQuery] = useState(data.originName ?? '');
  const [isOriginSelected, setIsOriginSelected] = useState(!!data.originId);

  const hasOriginInput = originQuery.trim().length > 0;
  const hasValidOrigin = isOriginSelected && !!data.originId;
  const showOriginWarning = hasOriginInput && !hasValidOrigin;
  const showOriginError = !hasOriginInput && !hasValidOrigin;

  const { data: origins = [] } = useSearchOrigins(
    isOriginSelected ? '' : originQuery
  );

  const createOrigin = useCreateOrigin();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const needsOriginCreation =
    !isOriginSelected && originQuery.trim().length > 0;

  const handleContinue = () => {
    if (needsOriginCreation) {
      setShowConfirmModal(true);
      return;
    }
    onContinue();
  };

  useEffect(() => {
    if (companyIdFromUrl && data.companyId !== companyIdFromUrl) {
      onChange({
        ...data,
        companyId: companyIdFromUrl,
      });
    }
  }, [companyIdFromUrl]);

  /**
   * ✅ CANAIS (resolver backend)
   */
  const { data: channels = [] } = useQuery({
    queryKey: ['channels', 'IN', data.companyId],
    queryFn: () =>
      apiFetch('/correspondence/settings/channels?direction=IN'),
    enabled: !!data.companyId,
  });

  /**
   * ✅ default automático
   */
useEffect(() => {
  if (channels.length > 0) {
    if (!data.channel || !channels.includes(data.channel)) {
      onChange({
        ...data,
        channel: channels[0],
      });
    }
  }
}, [channels]);

  const handleConfirmCreateOrigin = async () => {
    if (!data.companyId) return;

    const created = await createOrigin.mutateAsync({
      companyId: data.companyId,
      name: originQuery.trim(),
    });

    setIsOriginSelected(true);
    onChange({
      ...data,
      originId: created.id,
      originName: created.name,
    });

    setShowConfirmModal(false);
    onContinue();
  };

  return (
    <>
      <div className="space-y-4">

        {/* Origem */}
        <div>
          <Label>
            Origem <span className="text-red-500">*</span>
          </Label>

          <Input
            value={originQuery}
            placeholder="Ex: Autoridade Tributária"
            onChange={(e) => {
              const value = e.target.value;
              setOriginQuery(value);
              setIsOriginSelected(false);
              onChange({
                ...data,
                originId: undefined,
                originName: value,
              });
            }}
          />

          {showOriginError && (
            <p className="text-sm text-red-600 mt-1">
              É necessário uma origem para registar uma entrada.
            </p>
          )}

          {showOriginWarning && (
            <p className="text-sm text-amber-600 mt-1">
              Selecione uma origem da lista abaixo ou prima “Continuar”.
            </p>
          )}

          {!isOriginSelected && origins.length > 0 && (
            <div className="border border-gray-300 rounded-md mt-1 bg-white shadow-lg">
              <div className="px-3 py-2 text-xs text-gray-500 border-b bg-gray-50">
                Selecionar origem existente
              </div>

              {origins.map((o: any) => (
                <button
                  key={o.id}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-indigo-50"
                  onClick={() => {
                    setOriginQuery(o.name);
                    setIsOriginSelected(true);
                    onChange({
                      ...data,
                      originId: o.id,
                      originName: o.name,
                    });
                  }}
                >
                  {o.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ✅ CANAL (CORRIGIDO) */}
        <div>
          <Label>Canal</Label>
          <select
            className="w-full border rounded px-3 py-2"
            value={data.channel || ''}
            onChange={(e) =>
              onChange({ ...data, channel: e.target.value })
            }
          >
            {channels.map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Departamento */}
        <div>
          <Label>Departamento</Label>
          <Input
            value={data.department ?? ''}
            onChange={(e) =>
              onChange({ ...data, department: e.target.value })
            }
          />
        </div>

        {/* Data */}
        <div>
          <Label>Data de receção</Label>
          <Input
            type="date"
            value={data.receivedAt ?? ''}
            onChange={(e) =>
              onChange({ ...data, receivedAt: e.target.value })
            }
          />
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>

          <Button
            onClick={handleContinue}
            disabled={
              isSubmitting ||
              !data.companyId ||
              !hasOriginInput
            }
          >
            Continuar
          </Button>
        </div>
      </div>

      <ConfirmCreateOriginModal
        open={showConfirmModal}
        originName={originQuery}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmCreateOrigin}
      />
    </>
  );
}
