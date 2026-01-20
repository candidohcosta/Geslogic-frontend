// frontend/src/components/kiosk/CheckInModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2, CalendarCheck } from 'lucide-react';
import { performKioskCheckIn } from '../../services/api'; // A função que exportámos antes

interface Props {
  onClose: () => void;
  deviceSecret: string;
  onSuccess: (ticket: any) => void;
}

export const CheckInModal: React.FC<Props> = ({ onClose, deviceSecret, onSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. REF PARA GUARDAR A FUNÇÃO 'onClose' MAIS RECENTE
  // Isto impede que o temporizador reinicie só porque o pai (KioskPage) atualizou o relógio
  const onCloseRef = useRef(onClose);

  // Mantém a ref sempre atualizada
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 2. TEMPORIZADOR DE INATIVIDADE (30 Segundos)
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Tempo esgotado. A fechar modal...");
      onCloseRef.current(); // Chama a função guardada na ref
    }, 30000); // 30 segundos

    return () => clearTimeout(timer);
  }, [code]); // <--- AQUI ESTÁ O SEGREDO: Só reinicia se o 'code' mudar (utilizador a mexer)

  const handleType = (char: string) => {
    if (code.length < 6) setCode(prev => prev + char);
    setError('');
  };

  const handleBackspace = () => setCode(prev => prev.slice(0, -1));

  const handleSubmit = async () => {
    if (code.length < 6) return;
    setLoading(true);
    setError('');

    try {
      const res = await performKioskCheckIn(deviceSecret, code);
      onSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Código inválido ou expirado.');
      setCode(''); 
    } finally {
      setLoading(false);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CalendarCheck className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">Check-in Agendamento</h2>
              <p className="text-blue-100 text-sm">Introduza o seu código de 6 caracteres</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-blue-700 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Visor */}
        <div className="p-8 bg-gray-50 border-b flex flex-col items-center gap-2">
          <div className={`text-4xl font-mono tracking-[0.5em] font-bold h-16 flex items-center ${error ? 'text-red-500' : 'text-gray-800'}`}>
            {code || '______'}
          </div>
          {error && <p className="text-red-500 font-medium animate-pulse">{error}</p>}
        </div>

        {/* Teclado */}
        <div className="p-4 grid grid-cols-6 gap-2 bg-gray-100 flex-1 overflow-y-auto">
          {keys.map(k => (
            <button
              key={k}
              onClick={() => handleType(k)}
              className="h-14 rounded-lg bg-white shadow-sm border border-gray-200 text-xl font-bold text-gray-700 active:bg-blue-50 active:scale-95 transition-all hover:border-blue-300"
            >
              {k}
            </button>
          ))}
          
          <button onClick={handleBackspace} className="col-span-3 h-14 rounded-lg bg-red-100 text-red-700 font-bold uppercase tracking-wide hover:bg-red-200">
            Apagar
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={loading || code.length < 6}
            className="col-span-3 h-14 rounded-lg bg-blue-600 text-white font-bold uppercase tracking-wide hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Confirmar</>}
          </button>
        </div>

      </div>
    </div>
  );
};