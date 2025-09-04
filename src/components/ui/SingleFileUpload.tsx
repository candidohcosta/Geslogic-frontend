// src/components/ui/SingleFileUpload.tsx (VERSÃO COM DRAG-AND-DROP)

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadFile } from '../../services/api';
import { FilePurpose } from '../../types/file';
import { Button } from './Button';
import { Label } from './Label';
import { Loader2, UploadCloud, Trash2, XCircle, File as FileIcon } from 'lucide-react';

interface SingleFileUploadProps {
  ownerType: string;
  ownerId: string;
  purpose: FilePurpose;
  currentFileUrl?: string | null;
  onUploadSuccess?: (file: any) => void;
  onFileClear?: () => void;
  uploadMode?: 'auto' | 'manual';
  // 'onFileSelect' será chamada no modo 'manual'
  onFileSelect?: (file: File | null) => void;
}

export const SingleFileUpload: React.FC<SingleFileUploadProps> = ({
  ownerType,
  ownerId,
  purpose,
  currentFileUrl,
  onUploadSuccess,
  onFileClear,
  uploadMode = 'auto', // Padrão 'auto' para não quebrar o código existente
  onFileSelect,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false); // Estado para o feedback visual
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: upload, isPending } = useMutation({
    mutationFn: uploadFile,
    onSuccess: (newFileData) => {
    if (onUploadSuccess) {
      onUploadSuccess(newFileData.file);
    }
      setFile(null);
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error.message);
      setFile(null); // Limpa a seleção de ficheiro se o upload falhar
    },
    
  });

  const handleFileSelect = (files: FileList | null) => {
    // 1. LIMPA SEMPRE O ERRO ANTIGO, LOGO NO INÍCIO
    setErrorMessage(null);

    const selectedFile = files ? files[0] : null;

    if (uploadMode === 'manual') {
      if (onFileSelect) {
        onFileSelect(selectedFile);
      }
    } else {
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    upload({ file, ownerType, ownerId, purpose });
  };

  const handleClearFile = () => {
    // 1. Pedir confirmação ao utilizador
    if (window.confirm('Tem a certeza que deseja apagar este ficheiro?')) {
      // 2. Se onFileClear existir, chama-o
      if (onFileClear) {
        onFileClear();
      }
    }
  };

  // Handlers para o drag-and-drop
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          p-6 border-2 border-dashed rounded-lg text-center
          transition-colors duration-200
          ${isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-gray-50'}
        `}
      >
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
        <Label htmlFor="file-upload-dnd" className="mt-2 block text-sm font-medium text-gray-900">
          Arraste e largue um ficheiro aqui, ou
          <span className="text-indigo-600"> procure no seu computador</span>
        </Label>
        <input
          id="file-upload-dnd"
          type="file"
          className="sr-only" // Esconde o input, mas mantém-no acessível
          onChange={(e) => handleFileSelect(e.target.files)}
          accept="image/*"
        />
      </div>
      
      {/* A lógica de mostrar o ficheiro pendente SÓ aparece no modo 'auto' */}
      {uploadMode === 'auto' && file && (
        <div className="flex items-center justify-between p-2 border rounded-md bg-white">
          <div className="flex items-center space-x-2">
            <FileIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
          <Button onClick={handleUpload} disabled={isPending} size="sm">
            {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Carregar"}
          </Button>
        </div>
      )}

      {currentFileUrl && !file && (
        <div>
          <Label>Ficheiro Atual:</Label>
          <div className="mt-2 relative group w-fit">
            <img src={currentFileUrl} alt="Ficheiro atual" className="max-w-xs h-auto rounded-md border" />
            {onFileClear && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                <Button variant="destructive" size="icon" onClick={handleClearFile}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};