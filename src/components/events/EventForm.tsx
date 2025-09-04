// src/components/events/EventForm.tsx (ESQUELETO INICIAL)

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { registerForEvent, uploadFile } from '../../services/api';
import { FilePurpose } from '../../types/file';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { SingleFileUpload } from '../ui/SingleFileUpload';
import { EventData, EventFieldDefinitionData, EventFieldType } from '../../types/event';

// TODO: Importar os nossos componentes de UI (Input, Label, Button, etc.)
// TODO: Importar os hooks e funções de API necessários (useMutation, registerForEvent)
// TODO: Importar os tipos/interfaces necessários (EventFieldDefinitionData)

interface EventFormProps {
  fieldDefinitions: any[]; // Vamos refinar este 'any'
  eventId: string;
  isPreview?: boolean; // Uma prop para o modo "preview"
}

export const EventForm: React.FC<EventFormProps> = ({ fieldDefinitions, eventId, isPreview = false }) => {

  // TODO: Mover toda a lógica de estado do formulário (formValues, participantDetails) para aqui.
  // TODO: Mover a lógica de 'handleSubmit' para aqui.

  // Estados locais para o formulário
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [participantDetails, setParticipantDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  // Mutação para submeter a inscrição
  const { mutate: registerMutate, isPending, isSuccess, error: registrationError } = useMutation({
    mutationFn: registerForEvent,
  });

  const handleBaseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParticipantDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (fieldDefinitionId: string, value: any) => {
    setFormValues(currentValues => ({ ...currentValues, [fieldDefinitionId]: value }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    // 1. SEPARAR OS VALORES DE TEXTO E DE FICHEIRO
    const textValues: { fieldDefinitionId: string, value: string }[] = [];
    const fileUploads: { fieldDefinitionId: string, file: File }[] = [];

    Object.entries(formValues).forEach(([fieldId, value]) => {
      if (value instanceof File) {
        fileUploads.push({ fieldDefinitionId: fieldId, file: value });
      } else if (value) { // Garante que não enviamos valores vazios
          textValues.push({ fieldDefinitionId: fieldId, value: String(value) });
        }
    });

    // 2. FAZER O UPLOAD DOS FICHEIROS PRIMEIRO
    const uploadedFileResults = await Promise.all(
      fileUploads.map(uploadData => 
        uploadFile({
          file: uploadData.file,
          ownerType: 'ParticipantEventRegistration',
          ownerId: 'pending', // O backend ignora isto por agora
          purpose: FilePurpose.EVENT_DOCUMENT
        })
      )
    );

    // 3. OBTER OS IDs DOS FICHEIROS CARREGADOS
    const fileValuesForApi = uploadedFileResults.map((result, index) => ({
      fieldDefinitionId: fileUploads[index].fieldDefinitionId,
      storedFileId: result.file.id, // O ID que o backend devolveu
    }));

    // 4. CONSTRUIR O DTO FINAL
    const registrationData = {
      email: participantDetails.email,
      participantDetails,
      // Junta os valores de texto com os IDs dos ficheiros
      fieldValues: textValues, 
      documentValues: fileValuesForApi, // Um novo campo para o DTO
    };
    
    // 5. SUBMETER A INSCRIÇÃO
    registerMutate({ eventId: eventId!, registrationData });

  } catch (error) {
    // A mutação já tem um 'onError', mas podemos tratar erros de upload aqui
    console.error("Erro no processo de submissão:", error);
  }
};



  return (
    <>
            <hr className="my-6" />
            <h3 className="text-2xl font-bold text-center mb-4">Formulário de Inscrição</h3>
            
            {isSuccess ? (
              <div className="p-4 text-center bg-green-100 rounded text-green-800">
                <h4 className="font-bold">Inscrição enviada com sucesso!</h4>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="firstName">Primeiro Nome <span className="text-red-500">*</span></Label>
                  <Input type="text" id="firstName" name="firstName" value={participantDetails.firstName} onChange={handleBaseInputChange} required />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="lastName">Último Nome <span className="text-red-500">*</span></Label>
                  <Input type="text" id="lastName" name="lastName" value={participantDetails.lastName} onChange={handleBaseInputChange} required />
                </div>
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input type="email" id="email" name="email" value={participantDetails.email} onChange={handleBaseInputChange} required />
              </div>
              
                {fieldDefinitions && fieldDefinitions.length > 0 && <hr />}
                
                {fieldDefinitions.sort((a, b) => a.order - b.order).map(field => {
                  const isFile = formValues[field.id] instanceof File;
                  return (
                    <div key={field.id} className="grid w-full items-center gap-1.5">
                      <Label htmlFor={field.id}>
                        {field.fieldName} {field.isRequired && <span className="text-red-500">*</span>}
                      </Label>
                      
                      {field.fieldType === 'FILE' ? (
                        <>
                          <SingleFileUpload
                            ownerType="ParticipantEventRegistration"
                            ownerId="pending"
                            purpose={FilePurpose.EVENT_DOCUMENT}
                            uploadMode="manual"
                            onFileSelect={(file) => handleCustomFieldChange(field.id, file)}
                          />
                          {isFile && (
                            <div className="text-sm text-muted-foreground p-2 bg-gray-50 rounded-md">
                              Ficheiro selecionado: {formValues[field.id].name}
                            </div>
                          )}
                        </>
                      ) : (
                        <Input
                          id={field.id}
                          type={field.fieldType.toLowerCase()}
                          value={formValues[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || ''}
                          required={field.isRequired}
                        />
                      )}
                    </div>
                  );
                })}

                <Button type="submit" className="w-full !mt-6" disabled={isPending}>
                  {isPending ? 'A enviar...' : 'Inscrever-me'}
                </Button>
                {registrationError && <p className="text-red-500 text-center">{(registrationError as Error).message}</p>}
              </form>
            )}
            </>

  );
};