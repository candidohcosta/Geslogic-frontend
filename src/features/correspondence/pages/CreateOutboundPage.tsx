// frontend/src/features/correspondence/pages/CreateOutboundPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';

import { Send } from 'lucide-react';

import { useCreateOutboundRegistry } from '../hooks/useCreateOutboundRegistry';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

import ConfirmCreateOriginModal from '../components/modals/ConfirmCreateOriginModal';

const CreateOutboundPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const companyId = searchParams.get('companyId');

  const createMutation = useCreateOutboundRegistry();

  const [channel, setChannel] = useState('');
  const [department, setDepartment] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // ✅ DESTINO
  const [destinationName, setDestinationName] = useState('');
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  /**
   * ✅ Buscar canais
   */
  const { data: channels = [] } = useQuery({
    queryKey: ['channels', 'OUT', companyId],
    queryFn: async () =>
      apiFetch(`/correspondence/settings/channels?direction=OUT`),
    enabled: !!companyId,
  });

  /**
   * ✅ buscar entidades (origins)
   */
  const { data: origins = [] } = useQuery({
    queryKey: ['origins', destinationName],
    queryFn: () =>
      apiFetch(`/correspondence/origins?q=${destinationName}`),
    enabled: destinationName.length >= 2,
  });

  useEffect(() => {
    if (channels.length > 0) {
      if (!channel || !channels.includes(channel)) {
        setChannel(channels[0]);
      }
    }
  }, [channels, channel]);

  const isValid =
    channel.trim().length > 0 &&
    subject.trim().length > 0 &&
    description.trim().length > 0 &&
    !!destinationId; // ✅ destino obrigatório

  async function handleSubmit() {
    if (!isValid) return;

    try {
      await createMutation.mutateAsync({
        companyId: companyId || undefined,
        channel,
        department: department || undefined,
        subject,
        description,
        destinationId: destinationId ?? undefined, // ✅ AQUI
      });

      navigate(
        companyId
          ? `/correspondence/outbox/company/${companyId}`
          : '/correspondence/outbox',
      );
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <ListPageTemplate
        header={{
          icon: Send,
          title: 'Criar Registo de Saída',
          subtitle: 'Criação de correspondência de saída em rascunho.',
        }}

        table={{
          columns: [],
          data: [],
          rowKey: () => '',
          emptyState: (
            <div className="w-full space-y-4">

              {/* ✅ DESTINO */}
              <div>
                <label className="text-sm font-medium">
                  Destino <span className="text-red-500">*</span>
                </label>

                <Input
                  value={destinationName}
                  onChange={(e) => {
                    setDestinationName(e.target.value);
                    setDestinationId(null);
                  }}
                  placeholder="Escrever entidade..."
                />

                {/* lista resultados */}
                {origins.length > 0 && !destinationId && (
                  <div className="border rounded mt-1 bg-white shadow-sm max-h-40 overflow-auto">
                    {origins.map((o: any) => (
                      <div
                        key={o.id}
                        className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setDestinationId(o.id);
                          setDestinationName(o.name);
                        }}
                      >
                        {o.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* criar novo */}
                {destinationName &&
                  origins.length === 0 &&
                  destinationName.length >= 2 && (
                    <div className="mt-1 text-sm text-gray-600">
                      Nenhuma entidade encontrada.
                      <button
                        className="ml-1 text-blue-600 underline"
                        onClick={() => setShowCreateModal(true)}
                      >
                        Criar nova
                      </button>
                    </div>
                  )}
              </div>

              {/* ✅ CANAL */}
              <div>
                <label className="text-sm font-medium">
                  Canal
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  {channels.map((c: string) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✅ DEPARTAMENTO */}
              <div>
                <label className="text-sm font-medium">
                  Departamento
                </label>
                <Input
                  value={department}
                  onChange={(e) =>
                    setDepartment(e.target.value)
                  }
                />
              </div>

              {/* ✅ ASSUNTO */}
              <div>
                <label className="text-sm font-medium">
                  Assunto <span className="text-red-500">*</span>
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* ✅ DESCRIÇÃO */}
              <div>
                <label className="text-sm font-medium">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancelar
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={!isValid || createMutation.isPending}
                >
                  {createMutation.isPending
                    ? 'A criar…'
                    : 'Criar Registo'}
                </Button>
              </div>
            </div>
          ),
        }}
      />

      {/* ✅ MODAL CRIAR ORIGEM */}
      <ConfirmCreateOriginModal
        open={showCreateModal}
        originName={destinationName}
        onCancel={() => setShowCreateModal(false)}
        onConfirm={async () => {
          try {
            const newOrigin = await apiFetch(
              '/correspondence/origins',
              {
                method: 'POST',
                body: JSON.stringify({
                  name: destinationName,
                }),
              },
            );

            setDestinationId(newOrigin.id);
            setShowCreateModal(false);
          } catch (err) {
            console.error(err);
          }
        }}
      />
    </>
  );
};

export default CreateOutboundPage;