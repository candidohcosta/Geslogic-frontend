// src/components/ui/MultiFileUpload.tsx (VERSÃO FINAL E CORRETA)

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFile, deleteFile } from '../../services/api';
import { FilePurpose } from '../../types/file';
import { Button } from './Button';
import { Label } from './Label';
import { Loader2, UploadCloud, Trash2, File as FileIcon } from 'lucide-react';

interface ExistingFile {
  id: string;
  url: string;
  displayName: string;
}

interface MultiFileUploadProps {
  ownerType: string;
  ownerId: string;
  purpose: FilePurpose;
  existingFiles: ExistingFile[];
  maxFiles?: number;
  queryKeyToInvalidate: (string | undefined)[];
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  ownerType,
  ownerId,
  purpose,
  existingFiles = [],
  maxFiles = 5,
  queryKeyToInvalidate,
}) => {
  const queryClient = useQueryClient();
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { mutate: upload, isPending: isUploading } = useMutation({
    mutationFn: uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
    },
  });

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
    },
  });

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles);
      setFilesToUpload(prev => [...prev, ...newFiles].slice(0, maxFiles - existingFiles.length));
    }
  };

  const handleUploadAll = () => {
    if (filesToUpload.length === 0) return;
    Promise.all(
      filesToUpload.map(file => upload({ file, ownerType, ownerId, purpose }))
    ).then(() => {
      setFilesToUpload([]);
    });
  };

  const handleDeleteExisting = (fileId: string) => {
    if (window.confirm('Tem a certeza que deseja apagar esta imagem?')) {
      remove(fileId);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const canUploadMore = existingFiles.length + filesToUpload.length < maxFiles;

  return (
    <div className="space-y-4">
      {/* --- Área de Upload --- */}
      {canUploadMore && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`p-6 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-gray-50'}`}
        >
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <Label htmlFor="multi-upload-dnd" className="mt-2 block text-sm font-medium text-gray-900 cursor-pointer">
            Arraste e largue ficheiros aqui, ou
            <span className="text-indigo-600"> procure no seu computador</span>
          </Label>
          <input id="multi-upload-dnd" type="file" multiple onChange={(e) => handleFileSelect(e.target.files)} className="sr-only" />
        </div>
      )}

      {/* --- Ficheiros Pendentes de Upload --- */}
      {filesToUpload.length > 0 && (
        <div className="space-y-2">
          <Label>Ficheiros a carregar:</Label>
          {filesToUpload.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-white">
              <div className="flex items-center space-x-2"><FileIcon className="h-5 w-5" /><span className="text-sm">{file.name}</span></div>
            </div>
          ))}
          <Button onClick={handleUploadAll} disabled={isUploading || isDeleting} className="w-full">
            {isUploading ? <><Loader2 className="animate-spin mr-2" /> A Carregar...</> : `Carregar ${filesToUpload.length} Ficheiro(s)`}
          </Button>
        </div>
      )}

      {/* --- Ficheiros Existentes --- */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Imagens do Slideshow ({existingFiles.length}/{maxFiles})</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {existingFiles.map(file => (
              <div key={file.id} className="relative group aspect-square">
                <img src={file.url} alt={file.displayName} className="rounded-md w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="destructive" size="icon" onClick={() => handleDeleteExisting(file.id)} disabled={isDeleting}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};