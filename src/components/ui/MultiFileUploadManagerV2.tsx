// src/components/ui/MultiFileUploadManagerV2.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFile, deleteFile, updateFileDetails } from '../../services/api';
import { FilePurpose } from '../../types/file';
import { Button } from './Button';
import { Label } from './Label';
import { Input } from './Input';
import { Loader2, UploadCloud, Trash2, File as FileIcon, CheckSquare, Image as ImageIcon } from 'lucide-react';

interface ExistingFile {
  id: string;
  url: string;
  displayName: string;
}

interface MultiFileUploadManagerV2Props {
  ownerType: string;
  ownerId: string;
  purpose: FilePurpose;
  existingFiles: ExistingFile[];
  queryKeyToInvalidate: (string | undefined)[];
  maxFiles?: number;
  /** Mostrar miniaturas (default: true) */
  showThumbnails?: boolean;
  /** Tamanho do thumbnail px (default: 96 => 6rem) */
  thumbnailSize?: number;
}

const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp)$/i.test(url);

const MultiFileUploadManagerV2: React.FC<MultiFileUploadManagerV2Props> = ({
  ownerType,
  ownerId,
  purpose,
  existingFiles = [],
  queryKeyToInvalidate,
  maxFiles = 99,
  showThumbnails = true,
  thumbnailSize = 96,
}) => {
  const queryClient = useQueryClient();
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  // --- Mutations (usam API corrigida /api/uploads/...) ---
  const { mutate: upload, isPending: isUploading } = useMutation({
    mutationFn: uploadFile,
    onSuccess: () => {
      setFilesToUpload([]);
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
    },
  });

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
    },
  });

  const { mutate: updateName, isPending: isUpdatingName } = useMutation({
    mutationFn: updateFileDetails,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
    },
  });

  // --- Handlers ---
  const handleFileSelect = (selected: FileList | null) => {
    if (!selected) return;
    const next = [...filesToUpload, ...Array.from(selected)];
    const slotsLeft = Math.max(0, maxFiles - existingFiles.length);
    setFilesToUpload(next.slice(0, slotsLeft));
  };

  const handleUploadAll = () => {
    if (!filesToUpload.length) return;
    Promise.all(
      filesToUpload.map(file =>
        new Promise<void>((resolve) => {
          upload(
            { file, ownerType, ownerId, purpose, displayName: file.name },
            { onSettled: () => resolve() }
          );
        })
      )
    ).then(() => setFilesToUpload([]));
  };

  const handleDeleteExisting = (fileId: string) => {
    if (window.confirm('Tem a certeza que deseja apagar este documento?')) {
      remove(fileId);
    }
  };

  const handleDisplayNameChange = (fileId: string, newName: string) => {
    setDisplayNames(prev => ({ ...prev, [fileId]: newName }));
  };

  const handleSaveDisplayName = (fileId: string) => {
    const newDisplayName = displayNames[fileId];
    if (newDisplayName) {
      updateName({ fileId, data: { displayName: newDisplayName } });
    }
  };

  // --- Drag & Drop ---
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // --- Previews locais (pendentes de upload) ---
  const localPreviews = useMemo(() => {
    return filesToUpload.map((f) => ({
      name: f.name,
      isImage: /^image\//i.test(f.type),
      url: URL.createObjectURL(f),
    }));
  }, [filesToUpload]);

  useEffect(() => {
    return () => {
      // cleanup para evitar leaks
      localPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {/* Área de Upload (Drag-and-Drop) */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`p-6 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-gray-50'}`}
      >
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
        <Label htmlFor="manager-upload-dnd" className="mt-2 block text-sm font-medium text-gray-900 cursor-pointer">
          Arraste e largue ficheiros aqui, ou <span className="text-indigo-600">procure no seu computador</span>
        </Label>
        <input
          id="manager-upload-dnd"
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="sr-only"
        />
        <div className="mt-2 text-xs text-gray-500">
          {existingFiles.length < maxFiles
            ? `Pode carregar até ${Math.max(0, maxFiles - existingFiles.length)} ficheiro(s).`
            : 'Atingiu o limite máximo de ficheiros.'}
        </div>
      </div>

      {/* Ficheiros pendentes (com preview local) */}
      {filesToUpload.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <Label>Ficheiros a carregar:</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {localPreviews.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 border rounded-md bg-white">
                <div
                  className="flex items-center justify-center bg-gray-100 rounded overflow-hidden"
                  style={{ width: thumbnailSize, height: thumbnailSize }}
                >
                  {showThumbnails && p.isImage ? (
                    <img src={p.url} alt={p.name} className="object-cover w-full h-full" />
                  ) : (
                    <FileIcon className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{p.name}</div>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleUploadAll} disabled={isUploading || existingFiles.length >= maxFiles} className="w-full">
            {isUploading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> A Carregar...</> : `Carregar ${filesToUpload.length} Ficheiro(s)`}
          </Button>
        </div>
      )}

      {/* Ficheiros Existentes (com thumbs) */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Documentos Carregados</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {existingFiles.map(file => {
              const img = isImageUrl(file.url);
              return (
                <div key={file.id} className="flex items-center gap-3 p-2 border rounded-md bg-white">
                  <div
                    className="flex items-center justify-center bg-gray-100 rounded overflow-hidden flex-shrink-0"
                    style={{ width: thumbnailSize, height: thumbnailSize }}
                  >
                    {showThumbnails && img ? (
                      <img
                        src={file.url}
                        alt={file.displayName || 'Imagem'}
                        className="object-cover w-full h-full"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-gray-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Input
                      value={displayNames[file.id] ?? file.displayName}
                      onChange={(e) => handleDisplayNameChange(file.id, e.target.value)}
                      className="w-full"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSaveDisplayName(file.id)}
                        title="Guardar Nome"
                        disabled={isUpdatingName || (displayNames[file.id] === undefined)}
                      >
                        <CheckSquare className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteExisting(file.id)}
                        title="Apagar Ficheiro"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
};

export default MultiFileUploadManagerV2;