import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  generate2FASecret,
  enable2FA,
  startEmail2FASetup,
  completeEmail2FASetup,
  disable2FA,
} from '../../services/api';
import {
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Smartphone,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';

interface Props {
  forced?: boolean;
  onComplete?: () => void; // quando presente = modo embedded/admin
  userOverride?: any;
}

export const TwoFactorSetup: React.FC<Props> = ({
  forced = false,
  onComplete,
  userOverride,
}) => {
  const { user: contextUser } = useAuth();
  const user = userOverride || contextUser;

  const isEmbedded = Boolean(onComplete);

  const initialState =
    user?.isTwoFactorEnabled && !forced
      ? 'success-view'
      : forced
      ? 'choice'
      : 'intro';

  const [step, setStep] = useState<
    'intro' | 'choice' | 'app-setup' | 'email-setup' | 'success' | 'success-view'
  >(initialState);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSubmittingRef = useRef(false);

  // --- AÇÕES ---

  const handleStartAppSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await generate2FASecret();
      setQrCode(data.qrCode);
      setStep('app-setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEmailSetup = async () => {
    setLoading(true);
    setError('');
    try {
      await startEmail2FASetup();
      setStep('email-setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (codeOverride?: string) => {
    if (isSubmittingRef.current) return;
    const codeToUse = codeOverride || otpCode;
    if (codeToUse.length !== 6) return;

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      if (step === 'app-setup') {
        await enable2FA(codeToUse);
      } else {
        await completeEmail2FASetup(codeToUse);
      }

      setStep('success');

      if (onComplete) {
        setTimeout(onComplete, 800);
      }
    } catch {
      setError('Código incorreto ou expirado.');
      setOtpCode('');
      isSubmittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  // DESATIVAR / ALTERAR MÉTODO
  const handleReset = async () => {
    if (
      !window.confirm(
        'Tem a certeza? A conta ficará temporariamente sem proteção.'
      )
    )
      return;

    setLoading(true);
    try {
      await disable2FA();
      setStep('choice');
      setOtpCode('');
      setError('');

      if (onComplete) {
        onComplete(); // ✅ sincroniza drawer/admin
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao desativar.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (clean.length <= 6) {
      setOtpCode(clean);
      if (clean.length === 6) handleConfirm(clean);
    }
  };

  // --- RENDERIZADORES ---

  // 1. VIEW MODE (2FA ativo)
  if (step === 'success-view') {
    const methodLabel =
      user?.twoFactorMethod === 'EMAIL'
        ? 'Email'
        : 'Authenticator App';

    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">
                Conta Protegida
              </h3>
              <p className="text-sm text-green-700">
                Ativo via: <strong>{methodLabel}</strong>
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={loading}
            className="bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Alterar Método
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 2. SUCCESS
  if (step === 'success') {
    return (
      <Card className="border-green-500 bg-green-50">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-1">
            Configurado com Sucesso
          </h3>
          <p className="text-green-700">
            A segurança da conta foi atualizada.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 3. CHOICE
  if (step === 'choice') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurar Segurança</CardTitle>
          <CardDescription>
            Escolha o método de autenticação.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <button
            onClick={handleStartAppSetup}
            disabled={loading}
            className="w-full flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold">Authenticator App</div>
              <div className="text-sm text-gray-500">
                Google Auth, Authy
              </div>
            </div>
          </button>

          {user?.role === UserRole.COMPANY_ADMIN && (
            <button
              onClick={handleStartEmailSetup}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="p-3 bg-gray-100 text-gray-600 rounded-full">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold">Email</div>
                <div className="text-sm text-gray-500">
                  Código enviado por email
                </div>
              </div>
            </button>
          )}
        </CardContent>

        {!forced && !isEmbedded && (
          <CardFooter className="justify-center border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Cancelar Alteração
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  // 4. INTRO
  if (step === 'intro') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Configurar 2FA
          </CardTitle>
          <CardDescription>
            A conta não tem 2FA ativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Recomendamos ativar para maior segurança.
          </p>
          <Button onClick={() => setStep('choice')} className="w-full">
            Ativar Agora
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 5. CODE INPUT
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {step === 'app-setup' ? 'Ler QR Code' : 'Verificar Email'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'app-setup' && qrCode && (
          <div className="flex justify-center p-4 bg-white border rounded">
            <img src={qrCode} alt="QR Code" className="w-40 h-40" />
          </div>
        )}

        {step === 'email-setup' && (
          <div className="p-4 bg-blue-50 rounded text-center text-sm">
            Enviámos um código para <strong>{user?.email}</strong>.
          </div>
        )}

        <div className="max-w-xs mx-auto text-center">
          <Label>Código de 6 dígitos</Label>
          <Input
            value={otpCode}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="000000"
            className="text-center text-2xl tracking-widest mt-2 font-mono"
            maxLength={6}
            autoFocus
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}
        </div>

        <div className="flex justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => setStep('choice')}
            disabled={loading}
          >
            Voltar
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleConfirm()}
            disabled={loading || otpCode.length !== 6}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};