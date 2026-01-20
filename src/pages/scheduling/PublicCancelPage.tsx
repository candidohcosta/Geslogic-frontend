// frontend/src/pages/scheduling/PublicCancelPage.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cancelAppointmentPublic  } from '../../services/api';

const PublicCancelPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'CONFIRM' | 'LOADING' | 'SUCCESS' | 'ERROR'>('CONFIRM');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCancel = async () => {
    if (!id || !token) return;
    setStatus('LOADING');
    try {
        await cancelAppointmentPublic(id, token);
        setStatus('SUCCESS');
    } catch (err: any) {
        setStatus('ERROR');
        setErrorMsg(err.message || 'Token inválido ou agendamento já cancelado.');
    }
  };

  if (!id || !token) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Link inválido.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
            {status === 'SUCCESS' ? (
                <div className="mx-auto bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
            ) : status === 'ERROR' ? (
                <div className="mx-auto bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                    <XCircle className="w-8 h-8 text-red-600" />
                </div>
            ) : (
                <div className="mx-auto bg-amber-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
            )}
            <CardTitle className="text-xl">
                {status === 'CONFIRM' && 'Cancelar Agendamento?'}
                {status === 'LOADING' && 'A processar...'}
                {status === 'SUCCESS' && 'Agendamento Cancelado'}
                {status === 'ERROR' && 'Erro no Cancelamento'}
            </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-6">
            {status === 'CONFIRM' && (
                <>
                    <p className="text-gray-600">
                        Tem a certeza que deseja cancelar a sua marcação? Esta ação é irreversível e o horário ficará livre para outros utentes.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button variant="destructive" onClick={handleCancel} className="w-full">
                            Sim, Cancelar
                        </Button>
                    </div>
                </>
            )}

            {status === 'LOADING' && (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            )}

            {status === 'SUCCESS' && (
                <p className="text-gray-600">
                    O seu agendamento foi cancelado com sucesso. Receberá um email de confirmação.
                </p>
            )}

            {status === 'ERROR' && (
                <p className="text-red-600 bg-red-50 p-3 rounded border border-red-100 text-sm">
                    {errorMsg}
                </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicCancelPage;