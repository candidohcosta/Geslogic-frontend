// frontend/src/pages/EventCheckInPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { performEventCheckIn } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { QrCode, CheckCircle2, XCircle, AlertTriangle, RefreshCw, LogOut, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner'; // <--- BIBLIOTECA NOVA

const EventCheckInPage: React.FC = () => {
  const [inputCode, setInputCode] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(true); // Controla se a câmara está ativa
  const inputRef = useRef<HTMLInputElement>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: performEventCheckIn,
    onSuccess: (data) => {
      setLastResult({ type: 'SUCCESS', ...data });
      setIsScanning(false); // Pára a câmara para mostrar o resultado
      setInputCode('');
    },
    onError: (err: any) => {
      setLastResult({ 
          type: 'ERROR', 
          message: err.message || 'Erro ao validar bilhete.' 
      });
      setIsScanning(false); // Pára a câmara para mostrar o erro
      setInputCode('');
    }
  });

  // Handler para QR Code detetado
  const handleScan = (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
        const rawValue = detectedCodes[0].rawValue;
        if (rawValue) {
            // Se já estivermos a processar, ignora (evita leitura dupla rápida)
            if (mutation.isPending || !isScanning) return;
            
            // O QR Code pode trazer um URL completo ou só o ID. 
            // Vamos assumir que traz o ID da inscrição.
            // Se trouxer URL (ex: geslogic.com/bilhete/UUID), terias de extrair o ID.
            const codeToValidate = rawValue; 
            
            mutation.mutate(codeToValidate);
        }
    }
  };

  // Handler para Input Manual
  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode) return;
    setLastResult(null);
    mutation.mutate(inputCode);
  };

  const handleReset = () => {
      setLastResult(null);
      setIsScanning(true); // Reativa a câmara
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-start p-4">
      
      <div className="w-full max-w-md space-y-4">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center text-white py-2">
            <h1 className="text-lg font-bold flex items-center gap-2">
                <QrCode className="w-5 h-5" /> Controlo de Acessos
            </h1>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white">
                <LogOut className="w-4 h-4" />
            </Button>
        </div>

        {/* ÁREA DA CÂMARA (Só aparece se estiver a ler e não houver resultado) */}
        {isScanning && !lastResult && (
            <div className="rounded-xl overflow-hidden border-2 border-blue-500 shadow-2xl bg-black relative aspect-square">
                <Scanner 
                    onScan={handleScan}
                    allowMultiple={true}
                    scanDelay={2000} // Espera 2s entre leituras para não "disparar"
                    components={{
                        //audio: false, // Desliga som por defeito (opcional)
                        finder: true, // Mostra o quadrado de mira
                    }}
                    styles={{
                        container: { width: '100%', height: '100%' }
                    }}
                />
                <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-1">
                    Aponte para o QR Code
                </div>
            </div>
        )}

        {/* RESULTADO VISUAL (Sobrepõe a câmara ou substitui) */}
        {lastResult && (
            <Card className={`border-4 animate-in zoom-in duration-300 ${
                lastResult.type === 'SUCCESS' && lastResult.status !== 'ALREADY_CHECKED_IN' ? 'border-green-500 bg-green-50' : 
                lastResult.status === 'ALREADY_CHECKED_IN' ? 'border-amber-500 bg-amber-50' :
                'border-red-500 bg-red-50'
            }`}>
                <CardContent className="p-8 text-center flex flex-col items-center gap-4">
                    
                    {lastResult.type === 'SUCCESS' && lastResult.status !== 'ALREADY_CHECKED_IN' && (
                        <CheckCircle2 className="w-24 h-24 text-green-600 animate-bounce" />
                    )}
                    {lastResult.status === 'ALREADY_CHECKED_IN' && (
                        <AlertTriangle className="w-24 h-24 text-amber-600" />
                    )}
                    {lastResult.type === 'ERROR' && (
                        <XCircle className="w-24 h-24 text-red-600" />
                    )}

                    <div>
                        <h2 className="text-2xl font-bold mb-2">
                            {lastResult.type === 'SUCCESS' && lastResult.status !== 'ALREADY_CHECKED_IN' ? 'ENTRADA VÁLIDA' :
                             lastResult.status === 'ALREADY_CHECKED_IN' ? 'JÁ ENTROU!' :
                             'BILHETE INVÁLIDO'}
                        </h2>
                        
                        {lastResult.participant && (
                            <p className="text-xl font-medium text-gray-800">{lastResult.participant}</p>
                        )}
                        
                        <p className="text-gray-600 mt-2">{lastResult.message}</p>
                    </div>

                    <Button 
                        size="lg" 
                        className="w-full h-14 text-lg mt-4" 
                        onClick={handleReset}
                    >
                        <RefreshCw className="w-5 h-5 mr-2" /> Ler Próximo
                    </Button>
                </CardContent>
            </Card>
        )}

        {/* INPUT MANUAL (Fallback) - Sempre visível em baixo se a câmara falhar ou para input manual */}
        {!lastResult && (
            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                    <form onSubmit={handleSubmitManual} className="flex gap-2">
                        <Input 
                            ref={inputRef}
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            placeholder="Digitar código manual..."
                            className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
                        />
                        <Button type="submit" disabled={mutation.isPending}>
                             OK
                        </Button>
                    </form>
                </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
};

export default EventCheckInPage;