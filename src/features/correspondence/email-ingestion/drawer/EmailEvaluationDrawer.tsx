// frontend/src/features/correspondence/email-ingestion/drawer/EmailEvaluationDrawer.tsx

import React, { useState } from 'react';
import { Button } from '../../../../components/ui/Button';

type Props = {
  isOpen: boolean;
  email: any;
  selectedAttachments: Record<string, boolean>;
  onChangeAttachments: (attId: string, checked: boolean) => void;
  onClose: () => void;
  onConfirm: (action: 'IMPORT' | 'REJECT' | 'IGNORE') => void;
};

export const EmailEvaluationDrawer: React.FC<Props> = ({
  isOpen,
  email,
  selectedAttachments,
  onChangeAttachments,
  onClose,
  onConfirm,
}) => {
  const [action, setAction] = useState<
    'IMPORT' | 'REJECT' | 'IGNORE'
  >('IMPORT');

  if (!isOpen || !email) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex justify-end z-50">

      <div className="w-[420px] bg-white h-full shadow-lg p-4 flex flex-col">

        {/* HEADER */}
        <h2 className="text-lg font-semibold mb-4">
          Avaliar Email
        </h2>

        {/* ACTIONS */}
        <div className="space-y-2 mb-4">

          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={action === 'IMPORT'}
              onChange={() => setAction('IMPORT')}
            />
            Criar entrada
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={action === 'REJECT'}
              onChange={() => setAction('REJECT')}
            />
            Rejeitar
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={action === 'IGNORE'}
              onChange={() => setAction('IGNORE')}
            />
            Rejeitar e ignorar remetente
          </label>

        </div>

        {/* ATTACHMENTS */}
        {action === 'IMPORT' && (
          <div className="flex-1 overflow-y-auto">

            <p className="font-medium mb-2">Anexos</p>

            {(!email.attachments ||
              email.attachments.length === 0) && (
              <p className="text-sm text-gray-500">
                Sem anexos
              </p>
            )}

            <div className="space-y-2">

              {email.attachments?.map((att: any) => {
                const isSmallImage =
                  att.mimeType?.startsWith('image/') &&
                  att.size < 20000;

                return (
                  <label
                    key={att.id}
                    className="flex items-center justify-between gap-3 border rounded p-2"
                  >
                    <div className="flex items-center gap-2">

                      <input
                        type="checkbox"
                        checked={
                          selectedAttachments[att.id] ?? false
                        }
                        onChange={(e) =>
                          onChangeAttachments(
                            att.id,
                            e.target.checked,
                          )
                        }
                      />

                      <div>
                        <p className="text-sm">
                          {att.filename}
                        </p>

                        <p className="text-xs text-gray-500">
                          {(att.size / 1000).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    {isSmallImage && (
                      <span className="text-xs text-amber-600">
                        ⚠ possível assinatura
                      </span>
                    )}

                  </label>
                );
              })}

            </div>

          </div>
        )}

        {/* FOOTER */}
        <div className="flex gap-2 mt-4">

          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>

          <Button
            onClick={() => {
              onConfirm(action);
              onClose();
            }}
          >
            Confirmar
          </Button>

        </div>

      </div>
    </div>
  );
};
