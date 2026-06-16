// frontend/src/features/correspondence/pages/OutboundDetailPage.tsx

import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';

import { Send, ArrowLeft } from 'lucide-react';

import { useOutboundDetail } from '../hooks/useOutboundDetail';
import { CorrespondenceRegistry } from '../types/registry.types';

/* ---------------- helpers ---------------- */

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

/* ---------------- page ---------------- */

export default function OutboundDetailPage() {
  const navigate = useNavigate();

  const { outboundId } =
    useParams<{ outboundId: string }>();

  const { data: entry, isLoading } =
    useOutboundDetail(outboundId ?? null);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  /**
   * Inicializar campos quando o registo chega
   */
  if (entry && subject === '' && description === '') {
    setSubject(entry.subject ?? '');
    setDescription(entry.description ?? '');
  }

  if (isLoading) {
    return <div className="p-6">A carregar...</div>;
  }

  if (!entry) {
    return <div className="p-6">Registo não encontrado.</div>;
  }

  const isDraft = entry.status === 'DRAFT';

  return (
    <ListPageTemplate<CorrespondenceRegistry>
      header={{
        icon: Send,
        title: 'Registo de Saída',
        subtitle: entry.registryNumber ?? '—',
        actions: (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>

            {isDraft && (
              <Button size="sm">
                Enviar
              </Button>
            )}
          </div>
        ),
      }}

      table={{
        columns: [],
        data: [],
        rowKey: () => '',
        emptyState: (
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Campos principais */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Canal
                </label>
                <Input
                  value={entry.channel}
                  disabled
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Estado
                </label>
                <Input
                  value={entry.status}
                  disabled
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                </label>
                <Input
                  value={formatDate(entry.createdAt)}
                  disabled
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Departamento
                </label>
                <Input
                  value={entry.department ?? ''}
                  disabled={!isDraft}
                />
              </div>
            </div>

            {/* Conteúdo */}
            <div>
              <label className="text-sm font-medium">
                Assunto
              </label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={!isDraft}
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Descrição / Corpo
              </label>
              <Textarea
                rows={6}
                value={description}
                onChange={e =>
                  setDescription(e.target.value)
                }
                disabled={!isDraft}
              />
            </div>

          </div>
        ),
      }}
    />
  );
}