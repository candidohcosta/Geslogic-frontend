// frontend/src/features/correspondence/components/attachments/InboxAttachmentsViewer.tsx

import { FileIcon, Image as ImageIcon, Trash2, Download, ExternalLink } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

export interface InboxAttachment {
  id: string;
  url: string;
  displayName: string;
}

interface Props {
  files: InboxAttachment[];
  allowDelete?: boolean;
  onDelete?: (fileId: string) => void;
}

const isImage = (url: string) =>
  /\.(png|jpe?g|gif|webp)$/i.test(url);

export default function InboxAttachmentsViewer({
  files,
  allowDelete = false,
  onDelete,
}: Props) {
  if (!files.length) {
    return (
      <p className="text-sm text-gray-500 italic">
        Não existem anexos.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {files.map(file => {
        const image = isImage(file.url);

        return (
          <div
            key={file.id}
            className="flex items-center justify-between gap-3 p-2 border rounded-md bg-white group relative"
          >
            {/* Esquerda: ícone + nome */}
            <div className="flex items-center gap-2 min-w-0">
              {image ? (
                <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
              ) : (
                <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              )}

              <span
                className="text-sm truncate"
                title={file.displayName}
              >
                {file.displayName}
              </span>

              {/* Preview de imagem (hover) */}
              {image && (
                <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-20">
                  <img
                    src={file.url}
                    alt={file.displayName}
                    className="max-w-xs max-h-48 rounded shadow-lg border bg-white"
                  />
                </div>
              )}
            </div>

            {/* Direita: ações */}
            <div className="flex items-center gap-1">
              {/* Abrir em nova aba */}
              <Button
                variant="ghost"
                size="icon"
                title="Abrir"
                onClick={() => window.open(file.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>

              {/* Download explícito */}

{/*               <a
                href={file.url}
                download={file.displayName}
                title="Download"
                onClick={(e) => e.stopPropagation()}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </a> */}

              {/* Apagar (opcional) */}
              {allowDelete && onDelete && (
                <Button
                  variant="destructive"
                  size="icon"
                  title="Apagar"
                  onClick={() => {
                    if (window.confirm('Tem a certeza que deseja apagar este anexo?')) {
                      onDelete(file.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}