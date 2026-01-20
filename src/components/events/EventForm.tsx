// src/components/events/EventForm.tsx

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { registerForEvent, uploadFile } from '../../services/api';
import { FilePurpose } from '../../types/file';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { SingleFileUpload } from '../ui/SingleFileUpload';
import { EventFieldDefinitionData, EventFieldType, EventPricingTier } from '../../types/event';
import { Info, Paperclip } from 'lucide-react';

interface EventFormProps {
  fieldDefinitions: EventFieldDefinitionData[];
  pricingTiers?: EventPricingTier[];
  eventId: string;
}

export const EventForm: React.FC<EventFormProps> = ({ fieldDefinitions, pricingTiers, eventId }) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  // Mantemos o email no estado local para o input, mas vamos retirá-lo do envio
  const [participantDetails, setParticipantDetails] = useState({ firstName: '', lastName: '', email: '' });
  
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  const { mutate: registerMutate, isPending, isSuccess, error: registrationError } = useMutation({
    mutationFn: registerForEvent,
  });

  const handleBaseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParticipantDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCustomFieldChange = (fieldDefinitionId: string, value: any) => {
    setFormValues(currentValues => ({ ...currentValues, [fieldDefinitionId]: value }));
  };

  // CÁLCULO DE PREÇO
  useEffect(() => {
    if (!pricingTiers || pricingTiers.length === 0) return;

    const validTiers = pricingTiers.filter(tier => {
        // CORREÇÃO: Obter o ID da condição de forma robusta
        // Pode vir direto (string) ou dentro de um objeto (se vier populado do backend)
        const conditionId = tier.requiredFieldDefinitionId || (tier as any).requiredFieldDefinition?.id;

        // Se não tem condição (é null ou undefined), a tarifa é válida para toda a gente
        if (!conditionId) return true;

        // Se tem condição, verifica se a checkbox dependente está marcada no formulário
        return formValues[conditionId] === true;
    });

    if (validTiers.length > 0) {
        // Escolhe a mais barata das válidas
        const bestTier = validTiers.sort((a, b) => Number(a.price) - Number(b.price))[0];
        setSelectedTierId(bestTier.id!);
        setCurrentPrice(Number(bestTier.price));
    } else {
        // Nenhuma tarifa válida encontrada (ex: só há tarifas de sócio e a box não está marcada)
        setSelectedTierId('');
        setCurrentPrice(0);
    }
  }, [formValues, pricingTiers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const textValues: { fieldDefinitionId: string, value: string }[] = [];
      const fileUploads: { fieldDefinitionId: string, file: File }[] = [];
      
      Object.entries(formValues).forEach(([fieldId, value]) => {
        if (value instanceof File) {
          fileUploads.push({ fieldDefinitionId: fieldId, file: value });
        } else if (value !== null && value !== undefined) {
          textValues.push({ fieldDefinitionId: fieldId, value: String(value) });
        }
      });

      // Upload de Ficheiros
      const uploadedFileResults = await Promise.all(
        fileUploads.map(uploadData => uploadFile({ 
            file: uploadData.file, 
            ownerType: 'ParticipantEventRegistration', 
            ownerId: 'pending', 
            purpose: FilePurpose.EVENT_DOCUMENT 
        }))
      );
      
      const fileValuesForApi = uploadedFileResults.map((result, index) => ({ 
          fieldDefinitionId: fileUploads[index].fieldDefinitionId, 
          storedFileId: result.file.id 
      }));
      
      // --- CORREÇÃO DO ERRO DE EMAIL ---
      // Separamos o email dos detalhes, porque o DTO ParticipantDetailsDto não aceita email
      const { email, ...cleanDetails } = participantDetails;

      const registrationData = { 
          email: email, // Email vai na raiz
          participantDetails: cleanDetails, // Detalhes sem email
          fieldValues: textValues, 
          documentValues: fileValuesForApi,
          selectedPricingTierId: selectedTierId || undefined
      };

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
        <div className="p-4 text-center bg-green-100 rounded text-green-800 border border-green-200">
          <h4 className="font-bold text-lg">Inscrição enviada com sucesso!</h4>
          <p className="mt-2">Verifique o seu email para mais informações.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5"><Label htmlFor="firstName">Primeiro Nome <span className="text-red-500">*</span></Label><Input type="text" id="firstName" name="firstName" value={participantDetails.firstName} onChange={handleBaseInputChange} required /></div>
            <div className="grid w-full items-center gap-1.5"><Label htmlFor="lastName">Último Nome <span className="text-red-500">*</span></Label><Input type="text" id="lastName" name="lastName" value={participantDetails.lastName} onChange={handleBaseInputChange} required /></div>
          </div>
          <div className="grid w-full items-center gap-1.5"><Label htmlFor="email">Email <span className="text-red-500">*</span></Label><Input type="email" id="email" name="email" value={participantDetails.email} onChange={handleBaseInputChange} required /></div>
          
          {fieldDefinitions && fieldDefinitions.length > 0 && <hr />}
          
          {fieldDefinitions.sort((a, b) => a.order - b.order).map(field => {
            if (field.dependsOnFieldDefinitionId && formValues[field.dependsOnFieldDefinitionId] !== true) {
                return null;
            }

            return (
                <div key={field.id} className="grid w-full items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor={field.id}>{field.fieldName} {field.isRequired && <span className="text-red-500">*</span>}</Label>
                  
                  {(() => {
                    switch (field.fieldType) {
                      case EventFieldType.CHECKBOX:
                        return (
                          <div className="flex items-center space-x-2 pt-2">
                            <Checkbox id={field.id} checked={formValues[field.id] || false} onCheckedChange={(checked) => handleCustomFieldChange(field.id, Boolean(checked))} />
                            <label htmlFor={field.id} className="text-sm font-medium cursor-pointer">Sim / Concordo</label>
                          </div>
                        );
                      case EventFieldType.TEXTAREA:
                        return <Textarea id={field.id} value={formValues[field.id] || ''} onChange={(e) => handleCustomFieldChange(field.id, e.target.value)} placeholder={field.placeholder || ''} required={field.isRequired} />;
                      case EventFieldType.FILE:
                        // Mostra o nome do ficheiro se já tiver sido selecionado
                        return (
                            <div>
                                <SingleFileUpload 
                                    ownerType="ParticipantEventRegistration" 
                                    ownerId="pending" 
                                    purpose={FilePurpose.EVENT_DOCUMENT} 
                                    onFileSelect={(file: File | null) => handleCustomFieldChange(field.id, file)} 
                                />
                                {formValues[field.id] instanceof File && (
                                    <div className="text-xs text-green-600 flex items-center mt-1">
                                        <Paperclip className="w-3 h-3 mr-1" />
                                        Ficheiro selecionado: {formValues[field.id].name}
                                    </div>
                                )}
                            </div>
                        );
                      default:
                        return <Input id={field.id} type={field.fieldType.toLowerCase()} value={formValues[field.id] || ''} onChange={(e) => handleCustomFieldChange(field.id, e.target.value)} placeholder={field.placeholder || ''} required={field.isRequired} />;
                    }
                  })()}
                </div>
            );
          })}

          {pricingTiers && pricingTiers.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                    <Info className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">Valor estimado:</span>
                </div>
                <div className="text-xl font-bold text-blue-700">
                    {currentPrice.toFixed(2)}€
                </div>
            </div>
          )}

          <Button type="submit" className="w-full !mt-6" disabled={isPending}>{isPending ? 'A enviar...' : 'Inscrever-me'}</Button>
          {registrationError && <p className="text-red-500 text-center">{(registrationError as Error).message}</p>}
        </form>
      )}
    </div>
  );
};