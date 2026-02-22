// src/components/ui/SingleFileUpload.tsx (VERSÃO FINAL E CORRIGIDA)

import React, { useState, useEffect } from 'react'; // Adicionar useEffect
import { useMutation } from '@tanstack/react-query';
import { uploadFile } from '../../services/api';
import { FilePurpose } from '../../types/file';
import { Button } from './Button';
import { Label } from './Label';
import { Loader2, UploadCloud, Trash2, XCircle, File as FileIcon, FileText } from 'lucide-react';

interface SingleFileUploadProps {
  ownerType: string;
  ownerId: string;
  purpose: FilePurpose;
  currentFileUrl?: string | null;
  currentFileName?: string | null; // Passamos o nome do ficheiro atual carregado
  onUploadSuccess?: (file: any) => void;
  onFileClear?: () => void;
  accept?: string;
  disabled?: boolean;
  onFileSelect?: (file: File | null) => void;
}

export const SingleFileUpload: React.FC<SingleFileUploadProps> = ({
  ownerType, ownerId, purpose, currentFileUrl, currentFileName,
  onUploadSuccess, onFileClear, accept, onFileSelect, disabled = false,
}) => {
  const [file, setFile] = useState<File | null>(null); // Ficheiro selecionado, mas ainda não carregado
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: upload, isPending, error: uploadError } = useMutation({
    mutationFn: uploadFile,
    onSuccess: (newFileData) => {
      if (onUploadSuccess) onUploadSuccess(newFileData.file);
      setFile(null); // Limpa o ficheiro selecionado após o upload
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error.message);
      setFile(null); // Limpa a seleção de ficheiro se o upload falhar
    },
  });

  // Este useEffect é crucial para limpar a seleção de ficheiro
  // se o currentFileUrl mudar (ex: se o utilizador apagar o ficheiro noutro sítio)
  useEffect(() => {
    if (currentFileUrl === null) {
      setFile(null);
    }
  }, [currentFileUrl]);

  const handleFileSelect = (files: FileList | null) => {
    setErrorMessage(null);
    const selectedFile = files ? files[0] : null;
    setFile(selectedFile); // Guarda o ficheiro no estado interno do componente
    if (onFileSelect) {
      onFileSelect(selectedFile);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    upload({ file, ownerType, ownerId, purpose, displayName: file.name });
  };

  const handleClearFile = () => {
    if (window.confirm('Tem a certeza que deseja apagar este ficheiro?')) {
      if (onFileClear) onFileClear();
      setFile(null); // Limpa a pré-visualização do ficheiro selecionado
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFileSelect(e.dataTransfer.files);
  };

  const isImage = (url: string) => url.match(/\.(jpeg|jpg|png|gif)$/i);

  return (
    <div className="space-y-4">
      {/* Área de Drag-and-Drop */}
      <div
        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
        className={`p-6 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-gray-50'}`}
      >
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
        <Label htmlFor="file-upload-dnd" className="mt-2 block text-sm font-medium text-gray-900 cursor-pointer">
          Arraste e largue um ficheiro aqui, ou <span className="text-indigo-600">procure no seu computador</span>
        </Label>
        <input 
          id="file-upload-dnd" 
          type="file" 
          className="sr-only" 
          onChange={(e) => handleFileSelect(e.target.files)} 
          accept={accept} 
          disabled={disabled}/>
      </div>

      {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
      {uploadError && <p className="text-red-500 text-sm text-center">Upload falhou: {(uploadError as Error).message}</p>}

      {/* --- FICHEIRO SELECIONADO (PENDENTE DE UPLOAD) --- */}
      {file && (
        <div className="flex items-center justify-between p-2 border rounded-md bg-white">
          <div className="flex items-center space-x-2 truncate">
            <FileIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <span className="text-sm truncate">{file.name}</span>
          </div>
          <Button onClick={handleUpload} disabled={!file || isPending || disabled} size="sm">
            {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Carregar"}
          </Button>
        </div>
      )}

      {/* --- FICHEIRO ATUALMENTE CARREGADO (já na BD) --- */}
      {currentFileUrl && !file && ( // Só mostra se houver URL E nenhum ficheiro novo selecionado
        <div>
          <Label>Ficheiro Atual:</Label>
          <div className="mt-2 relative group w-full max-w-xs mx-auto">
            {isImage(currentFileUrl) ? (
              <img src={currentFileUrl} alt="Ficheiro atual" className="max-w-full h-auto rounded-md border" />
            ) : (
              <a href={currentFileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-4 h-32 rounded-md border bg-gray-100 text-indigo-600 hover:bg-gray-200 transition-colors w-full" title="Abrir Documento">
                <FileText className="h-10 w-10" />
              </a>
            )}
            {currentFileName && <p className="mt-2 text-sm text-muted-foreground truncate">{currentFileName}</p>}
            {onFileClear && (
              <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={handleClearFile} title="Remover ficheiro">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default SingleFileUpload;