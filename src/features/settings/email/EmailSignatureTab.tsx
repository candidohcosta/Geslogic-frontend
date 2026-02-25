// src/features/settings/email/EmailSignatureTab.tsx
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import RichTextEditor from '../../../components/ui/RichTextEditor';
import { FilePurpose } from '../../../types/file';
import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Button } from '../../../components/ui/Button';
import { Loader2 } from 'lucide-react';
import { getPlatformSettings, updatePlatformSettings } from '../../../services/api';

type Props = {
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
};

export default function EmailSignatureTab({ onHeaderActionsChange }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getPlatformSettings,
  });

  const original = data?.defaultEmailSignatureHtml ?? '';
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!isLoading) setHtml(original || '');
  }, [isLoading, original]);

  const dirty = html !== original;
  const valid = html.trim() !== '';

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => updatePlatformSettings({ defaultEmailSignatureHtml: html || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings'] }),
  });

  const reset = () => setHtml(original || '');

  // Actions para aparecer no header e footer
  useEffect(() => {
    onHeaderActionsChange?.(
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={reset} disabled={!dirty || isPending}>
          Repor
        </Button>
        <Button onClick={() => save()} disabled={!valid || isPending}>
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> A guardar…
            </>
          ) : (
            'Guardar'
          )}
        </Button>
      </div>
    );
  }, [dirty, valid, isPending, html, original]);

  return (
    <>
      <SettingsSectionCard
        accent
        title="Assinatura (HTML)"
        description="Edite a assinatura usada nos templates da plataforma."
      >
        <div className="border rounded-md overflow-hidden min-h-[220px]">
          <RichTextEditor
            value={html}
            onChange={setHtml}
            uploadOwner={{
              ownerType: 'PLATFORM',
              ownerId: 'singleton',
              purpose: FilePurpose.PLATFORM_SIGNATURE_IMAGE,
            }}
          />
        </div>

        {!valid && (
          <p className="text-red-600 text-sm mt-2">A assinatura não pode ser vazia.</p>
        )}
      </SettingsSectionCard>

      <SettingsSectionCard
        accent
        title="Pré‑visualização"
        description="Pré-visualização em tempo real."
      >
        <div
          className="border rounded-md p-4 bg-white min-h-[180px] prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{
            __html: html || '<p class="text-gray-400 text-sm">Sem conteúdo…</p>',
          }}
        />
      </SettingsSectionCard>
    </>
  );
}