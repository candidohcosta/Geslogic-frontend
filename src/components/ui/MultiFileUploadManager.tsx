// src/components/ui/MultiFileUploadManager.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFile, deleteFile, updateFileDetails } from '../../services/api';
import { FilePurpose } from '../../types/file';
import { Button } from './Button';
import { Label } from './Label';
import { Input } from './Input';
import { Loader2, UploadCloud, Trash2, File as FileIcon, CheckSquare } from 'lucide-react';

interface ExistingFile {
  id: string;
  url: string;
  displayName: string;
}

interface MultiFileUploadManagerProps {
  ownerType: string;
  ownerId: string;
  purpose: FilePurpose;
  existingFiles: ExistingFile[];
  queryKeyToInvalidate: (string | undefined)[];
  maxFiles?: number;
}

export const MultiFileUploadManager: React.FC<MultiFileUploadManagerProps> = ({
  ownerType, ownerId, purpose, existingFiles = [], queryKeyToInvalidate, maxFiles = 99,
}) => {
  const queryClient = useQueryClient();
  const canUploadMore = existingFiles.length < maxFiles;
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const { mutate: upload, isPending: isUploading } = useMutation({ mutationFn: uploadFile, onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate }); } });
  const { mutate: remove, isPending: isDeleting } = useMutation({ mutationFn: deleteFile, onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate }); } });
  const { mutate: updateName, isPending: isUpdatingName } = useMutation({ mutationFn: updateFileDetails, onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate }); } });

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (selectedFiles) setFilesToUpload(prev => [...prev, ...Array.from(selectedFiles)]);
  };

  const handleUploadAll = () => {
    Promise.all(
      filesToUpload.map(file => upload({ file, ownerType, ownerId, purpose, displayName: file.name }))
    ).then(() => setFilesToUpload([]));
  };
  
  const handleDeleteExisting = (fileId: string) => {
    if (window.confirm('Tem a certeza que deseja apagar este documento?')) remove(fileId);
  };
  
  const handleDisplayNameChange = (fileId: string, newName: string) => {
    setDisplayNames(prev => ({ ...prev, [fileId]: newName }));
  };

  const handleSaveDisplayName = (fileId: string) => {
    const newDisplayName = displayNames[fileId];
    if (newDisplayName) updateName({ fileId, data: { displayName: newDisplayName } });
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

  return (
    <div className="space-y-4">
      {/* --- Área de Upload (Drag-and-Drop) - CÓDIGO COMPLETO --- */}
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
        <input id="manager-upload-dnd" type="file" multiple onChange={(e) => handleFileSelect(e.target.files)} className="sr-only" />
      </div>

      {/* --- Ficheiros Pendentes de Upload --- */}
      {filesToUpload.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <Label>Ficheiros a carregar:</Label>
          {filesToUpload.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-white">
              <div className="flex items-center space-x-2 truncate">
                <FileIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                <span className="text-sm truncate">{file.name}</span>
              </div>
            </div>
          ))}
          <Button onClick={handleUploadAll} disabled={isUploading} className="w-full">
            {isUploading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> A Carregar...</> : `Carregar ${filesToUpload.length} Ficheiro(s)`}
          </Button>
        </div>
      )}

      {/* --- Ficheiros Existentes --- */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Documentos Carregados</Label>
          {existingFiles.map(file => (
            <div key={file.id} className="flex items-center gap-2 p-2 border rounded-md bg-white">
              <Input
                value={displayNames[file.id] ?? file.displayName}
                onChange={(e) => handleDisplayNameChange(file.id, e.target.value)}
                className="flex-grow"
              />
              <Button variant="ghost" size="icon" onClick={() => handleSaveDisplayName(file.id)} title="Guardar Nome" disabled={isUpdatingName || (displayNames[file.id] === undefined)}>
                <CheckSquare className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={() => handleDeleteExisting(file.id)} title="Apagar Ficheiro" disabled={isDeleting}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiFileUploadManager;