import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Loader2, Search, UserCheck, X } from 'lucide-react';
import { findKioskUser } from '../../services/api';

interface FieldDef {
  id: string;
  label: string;
  type: string;
}

interface KioskIdentificationModalProps {
  serviceId: string;
  serviceName: string;
  fields: FieldDef[];
  deviceSecret: string;
  onConfirm: (customUserDataId: string) => void;
  onCancel: () => void;
  uiConfig?: any; // Para herdar as cores do quiosque
}

export const KioskIdentificationModal: React.FC<KioskIdentificationModalProps> = ({
  serviceId,
  serviceName,
  fields,
  deviceSecret,
  onConfirm,
  onCancel,
  uiConfig
}) => {
  // Estado dos inputs (ex: { "123": "2025001" })
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  // Estado da pesquisa
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado do resultado encontrado
  const [foundUser, setFoundUser] = useState<{ maskedResult: string; tempUserId: string } | null>(null);

  const handleInputChange = (fieldId: string, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
    setError(null); // Limpa erros ao digitar
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFoundUser(null);

    try {
      const result = await findKioskUser({
        serviceId,
        searchFields: formValues
      }, deviceSecret);
      
      setFoundUser(result);
    } catch (err: any) {
      setError(err.message || 'Utente não encontrado.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cores dinâmicas ou default
  const primaryColor = uiConfig?.primaryColor || '#4f46e5';
  const buttonTextColor = uiConfig?.buttonTextColor || '#ffffff';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-between">
            <span>Identificação Necessária</span>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </CardTitle>
          <CardDescription className="text-lg">
            O serviço <strong>{serviceName}</strong> requer identificação.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!foundUser ? (
            // --- FASE 1: FORMULÁRIO DE PESQUISA ---
            <form onSubmit={handleSearch} className="space-y-4">
              {fields.map(field => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-lg">{field.label}</Label>
                  <Input
                    id={field.id}
                    type={field.type === 'number' ? 'number' : 'text'}
                    className="text-xl p-6"
                    placeholder={`Introduza ${field.label}`}
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required
                  />
                </div>
              ))}
              
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-center font-medium">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 text-xl mt-4"
                disabled={isLoading}
                style={{ backgroundColor: primaryColor, color: buttonTextColor }}
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
                Pesquisar
              </Button>
            </form>
          ) : (
            // --- FASE 2: CONFIRMAÇÃO ---
            <div className="text-center space-y-6 py-4">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <UserCheck className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-lg">Utente identificado:</p>
                <p className="text-3xl font-bold text-gray-800">{foundUser.maskedResult}</p>
              </div>
              <p className="text-sm text-gray-400">Confirma que é você?</p>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 text-lg"
                  onClick={() => setFoundUser(null)} // Voltar atrás
                >
                  Não sou eu
                </Button>
                <Button 
                  className="flex-1 h-12 text-lg"
                  onClick={() => onConfirm(foundUser.tempUserId)}
                  style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        
        {!foundUser && (
            <CardFooter className="justify-center border-t pt-4">
                <Button variant="ghost" onClick={onCancel}>
                    Continuar sem identificação (Senha Normal)
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
};