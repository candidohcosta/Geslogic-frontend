// src/components/events/EventForm.tsx (VERSÃO FINAL E CORRIGIDA)

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { registerForEvent, uploadFile } from '../../services/api';
import { FilePurpose } from '../../types/file';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { SingleFileUpload } from '../ui/SingleFileUpload';
import { EventFieldDefinitionData, EventFieldType } from '../../types/event';

interface EventFormProps {
  fieldDefinitions: EventFieldDefinitionData[];
  eventId: string;
}

export const EventForm: React.FC<EventFormProps> = ({ fieldDefinitions, eventId }) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [participantDetails, setParticipantDetails] = useState({ firstName: '', lastName: '', email: '' });

  const { mutate: registerMutate, isPending, isSuccess, error: registrationError } = useMutation({
    mutationFn: registerForEvent,
  });

  const handleBaseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParticipantDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCustomFieldChange = (fieldDefinitionId: string, value: any) => {
    setFormValues(currentValues => ({ ...currentValues, [fieldDefinitionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const textValues: { fieldDefinitionId: string, value: string }[] = [];
      const fileUploads: { fieldDefinitionId: string, file: File }[] = [];
      Object.entries(formValues).forEach(([fieldId, value]) => {
        if (value instanceof File) {
          fileUploads.push({ fieldDefinitionId: fieldId, file: value });
        } else if (value) {
          textValues.push({ fieldDefinitionId: fieldId, value: String(value) });
        }
      });
      const uploadedFileResults = await Promise.all(
        fileUploads.map(uploadData => uploadFile({ file: uploadData.file, ownerType: 'ParticipantEventRegistration', ownerId: 'pending', purpose: FilePurpose.EVENT_DOCUMENT }))
      );
      const fileValuesForApi = uploadedFileResults.map((result, index) => ({ fieldDefinitionId: fileUploads[index].fieldDefinitionId, storedFileId: result.file.id }));
      const registrationData = { email: participantDetails.email, participantDetails, fieldValues: textValues, documentValues: fileValuesForApi };
      registerMutate({ eventId: eventId!, registrationData });
    } catch (error) {
      console.error("Erro no processo de submissão:", error);
    }
  };

  return (
    <div>
      <hr className="my-6" />
      <h3 className="text-2xl font-bold text-center mb-4">Formulário de Inscrição</h3>
      
      {isSuccess ? (
        <div className="p-4 text-center bg-green-100 rounded text-green-800">
          <h4 className="font-bold">Inscrição enviada com sucesso!</h4>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5"><Label htmlFor="firstName">Primeiro Nome <span className="text-red-500">*</span></Label><Input type="text" id="firstName" name="firstName" value={participantDetails.firstName} onChange={handleBaseInputChange} required /></div>
            <div className="grid w-full items-center gap-1.5"><Label htmlFor="lastName">Último Nome <span className="text-red-500">*</span></Label><Input type="text" id="lastName" name="lastName" value={participantDetails.lastName} onChange={handleBaseInputChange} required /></div>
          </div>
          <div className="grid w-full items-center gap-1.5"><Label htmlFor="email">Email <span className="text-red-500">*</span></Label><Input type="email" id="email" name="email" value={participantDetails.email} onChange={handleBaseInputChange} required /></div>
          
          {fieldDefinitions && fieldDefinitions.length > 0 && <hr />}
          
          {fieldDefinitions.sort((a, b) => a.order - b.order).map(field => (
            <div key={field.id} className="grid w-full items-center gap-1.5">
              <Label htmlFor={field.id}>{field.fieldName} {field.isRequired && <span className="text-red-500">*</span>}</Label>
              
              {/* --- A LÓGICA DE RENDERIZAÇÃO CORRIGIDA --- */}
              {(() => {
                switch (field.fieldType) {
                  case EventFieldType.CHECKBOX:
                    return (
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id={field.id} checked={formValues[field.id] || false} onCheckedChange={(checked) => handleCustomFieldChange(field.id, Boolean(checked))} />
                        <label htmlFor={field.id} className="text-sm font-medium">Concordo</label>
                      </div>
                    );
                  case EventFieldType.TEXTAREA:
                    return <Textarea id={field.id} value={formValues[field.id] || ''} onChange={(e) => handleCustomFieldChange(field.id, e.target.value)} placeholder={field.placeholder || ''} required={field.isRequired} />;
                  case EventFieldType.FILE:
                    return <SingleFileUpload ownerType="ParticipantEventRegistration" ownerId="pending" purpose={FilePurpose.EVENT_DOCUMENT} onFileSelect={(file) => handleCustomFieldChange(field.id, file)} />;
                  default:
                    return <Input id={field.id} type={field.fieldType.toLowerCase()} value={formValues[field.id] || ''} onChange={(e) => handleCustomFieldChange(field.id, e.target.value)} placeholder={field.placeholder || ''} required={field.isRequired} />;
                }
              })()}
            </div>
          ))}
          <Button type="submit" className="w-full !mt-6" disabled={isPending}>{isPending ? 'A enviar...' : 'Inscrever-me'}</Button>
          {registrationError && <p className="text-red-500 text-center">{(registrationError as Error).message}</p>}
        </form>
      )}
    </div>
  );
};