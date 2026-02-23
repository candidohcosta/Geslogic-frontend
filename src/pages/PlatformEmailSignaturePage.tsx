import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import RichTextEditor, {
  RichTextEditorHandle,
} from '../components/ui/RichTextEditor';
import { DetailFormTemplate } from '../components/templates/DetailFormTemplate';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Ajusta este import para o caminho correto
import { FilePurpose } from '../types/file';

function isHtmlEmpty(html: string): boolean {
  if (!html) return true;

  const clean = html
    .replace(/<p><br><\/p>/gi, '')      // quill empty paragraph
    .replace(/<br\s*\/?>/gi, '')        // <br>
    .replace(/<[^>]*>/g, '')            // all html tags
    .replace(/&nbsp;/gi, '')            // non-breaking spaces
    .trim();

  return clean.length === 0;
}

// GET/PUT simples
async function apiGetPlatformSettings() {
  const res = await fetch('/platform-settings', { credentials: 'include' });
  if (!res.ok) throw new Error('Falha ao obter definições da plataforma.');
  return res.json();
}

async function apiUpdatePlatformSettings(payload: { defaultEmailSignatureHtml: string | null }) {
  const res = await fetch('/platform-settings', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao guardar a assinatura da plataforma.');
  return res.json();
}

const PlatformEmailSignaturePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Estado
  const [signatureHtml, setSignatureHtml] = useState<string>('');

  // Ref para inserir no cursor (se no futuro quisermos placeholders)
  const editorRef = useRef<RichTextEditorHandle | null>(null);

  // Query inicial
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: apiGetPlatformSettings,
  });

  // Hidratar assinatura quando carregada
  useEffect(() => {
    if (data?.defaultEmailSignatureHtml !== undefined) {
      setSignatureHtml(data.defaultEmailSignatureHtml || '');
    }
  }, [data]);

  // Mutation — v5: isPending
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      apiUpdatePlatformSettings({
        defaultEmailSignatureHtml: signatureHtml || null,
      }),
    onSuccess: () => refetch(),
  });

  // UX defensivo
  if (!isAuthenticated || user?.role !== 'PLATFORM_ADMIN') {
    return <div className="p-6">Sem permissões para visualizar esta página.</div>;
  }

  // --- Validação ---
  const isSignatureValid = !isHtmlEmpty(signatureHtml);
  const canSave = isSignatureValid && !saving;

  // HEADER — simples e sem hooks condicionais
  const header = {
    icon: HelpCircle,
    title: 'Assinatura de Email — Plataforma',
    subtitle:
      'Defina a assinatura padrão usada nos templates da plataforma (quando includeSignature está ativo).',
    actions: (
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => refetch()} disabled={saving}>
          Repor
        </Button>
        <Button onClick={() => save()} disabled={!canSave}>
          {saving ? 'A guardar…' : 'Guardar'}
        </Button>
      </div>
    ),
  };

  // SECTIONS — apenas 2 cards lado a lado.
  const sections = [
    {
      title: 'Assinatura (HTML)',
      description:
        'Edite aqui a assinatura da plataforma. Não pode ser vazia.',
      accent: true,
      className: 'md:col-span-1',
      content: (
        <div className="space-y-4">

          {/* Editor */}
          <div className="bg-white rounded-md border">
            <RichTextEditor
              ref={editorRef}
              value={signatureHtml}
              onChange={setSignatureHtml}
              uploadOwner={{
                ownerType: 'PLATFORM',
                ownerId: 'singleton',
                purpose: FilePurpose.PLATFORM_SIGNATURE_IMAGE,
              }}
            />
          </div>

          {!isSignatureValid && (
            <p className="text-red-600 text-sm">
              A assinatura não pode ser vazia.
            </p>
          )}

          {saving && (
            <p className="text-xs text-muted-foreground">A guardar…</p>
          )}
        </div>
      ),
    },

    {
      title: 'Pré‑visualização',
      description: 'Pré‑visualização em tempo real da assinatura renderizada.',
      className: 'md:col-span-1',
      content: (
        <div className="space-y-4">
          <div>
            <div
              className="border rounded p-4 bg-white min-h-[160px] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: signatureHtml }}
            />
          </div>
        </div>
      ),
    },
  ];

  // Rodapé (padrão)
  const actions = (
    <>
      <Button variant="ghost" onClick={() => refetch()} disabled={saving}>
        Repor
      </Button>
      <Button onClick={() => save()} disabled={!canSave}>
        {saving ? 'A guardar…' : 'Guardar'}
      </Button>
    </>
  );

  return (
    <DetailFormTemplate
      header={header}
      sections={sections}
      actions={actions}
      columnsMd={2}   // ← duas colunas lado a lado
    />
  );
};

export default PlatformEmailSignaturePage;