// frontend/src/features/correspondence/pages/RegisterInboundManualPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';

import { Inbox } from 'lucide-react';

import { useRegisterInboundManual } from '../hooks/useRegisterInboundManual';

// ✅ NOVO
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api';

export default function RegisterInboundManualPage() {
  const navigate = useNavigate();
  const mutation = useRegisterInboundManual();

  const [channel, setChannel] = useState('');
  const [department, setDepartment] = useState('');

  /**
   * ✅ buscar canais válidos para IN
   */
  const { data: channels = [] } = useQuery({
    queryKey: ['channels', 'IN'],
    queryFn: () =>
      apiFetch(
        `/correspondence/settings/channels?direction=IN`
      ),
  });

  /**
   * ✅ default automático
   */
  useEffect(() => {
    if (!channel && channels.length > 0) {
      setChannel(channels[0]);
    }
  }, [channels, channel]);

  /**
   * ✅ validação
   */
  const isValid = channel.trim().length > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    mutation.mutate(
      { channel, department: department || undefined },
      {
        onSuccess: () => navigate('/correspondence/inbox'),
      },
    );
  };

  return (
    <ListPageTemplate
      header={{
        icon: Inbox,
        title: 'Registar Entrada Manual',
        subtitle:
          'Criação de registo de entrada manual no sistema.',
      }}

      table={{
        columns: [],
        data: [],
        rowKey: () => '',
        emptyState: (
          <div className="w-full space-y-4">

            <div className="space-y-3">

              {/* ✅ CANAL */}
              <div>
                <Label>Canal *</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value)
                  }
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
                <Label>Departamento (opcional)</Label>
                <Input
                  value={department}
                  onChange={(e) =>
                    setDepartment(e.target.value)
                  }
                />
              </div>

            </div>

            {/* ✅ ACTIONS */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!isValid || mutation.isPending}
              >
                {mutation.isPending
                  ? 'A registar…'
                  : 'Registar Entrada'}
              </Button>
            </div>

          </div>
        ),
      }}
    />
  );
}