// frontend/src/pages/LoginForm.tsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import { loginUser, verify2FA, logoutUser } from '../services/api'; 
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Laptop, Eraser } from 'lucide-react';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth(); // Importamos logout para o botão de debug

  // Estados de Dados
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  // MÁQUINA DE ESTADOS VISUAL (A Solução para o Loop)
  // 'credentials': Login inicial
  // '2fa_input': Inserir código
  // '2fa_decision': Modal aberto (Input bloqueado)
  const [uiState, setUiState] = useState<'credentials' | '2fa_input' | '2fa_decision'>('credentials');
  
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'TOTP' | 'EMAIL'>('TOTP');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // --- DEBUG: LIMPEZA TOTAL ---
  const handleHardReset = async () => {
    try { await logoutUser(); } catch (e) {} 
    logout(); 
    window.location.reload();
  };

  const handleSuccessRedirect = (user: any) => {  //VERSÃO ANTIGA
  //const handleSuccessRedirect = (user: any, initialToken: string | null = null) => { 
    if (user.is2FASetupRequired) { 
        navigate('/setup-required');
        return;
    }
    // REDIRECIONAMENTO DE STAFF (NOVO)
    if (user.role === UserRole.EVENT_STAFF) {
        const staffRole = user.eventStaffDetails?.staffRole;

        // Se for Porteiro -> App de Check-in
        if (staffRole === 'CHECKIN') {
            navigate('/event-checkin'); 
            return;
        }
        
        // Se for Gestor -> Lista de Eventos (Dashboard deles)
        if (staffRole === 'MANAGEMENT') {
            navigate('/events/list'); 
            return;
        }
    }    
    if (user.role === UserRole.COMPANY_ADMIN && user.companySlug) {
      const { protocol, port } = window.location;
      const mainDomain = process.env.REACT_APP_MAIN_DOMAIN || 'localhost';
      const targetPort = port ? `:${port}` : ''; 
      const newUrl = `${protocol}//${user.companySlug}.${mainDomain}${targetPort}/dashboard`;
      window.location.href = newUrl;
    } else {
      //navigate('/dashboard', { replace: true });
      window.location.href = '/dashboard';
    }
  };

  // Passo 1: Enviar Credenciais
  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const data = await loginUser(email, password);

      if (data.requiresTwoFactor) {
        setTempToken(data.tempAccessToken); 
        setTwoFactorMethod(data.method);
        setUiState('2fa_input'); // Muda para o ecrã de código
      } else {
        const userToLogin = { ...data.user, is2FASetupRequired: data.is2FASetupRequired };
        if (data.is2FASetupRequired) {
             handleSuccessRedirect(userToLogin); 
        } else {
            // 1. Atualizamos o estado GLOBAL do AuthContext com os dados do JSON
             login(userToLogin);
             // 2. Redirecionamos IMEDIATAMENTE (pode ser navigate, já não precisa de window.location.href)
             handleSuccessRedirect(userToLogin); //CORRECAO PARA O F5 NO VPS
             //handleSuccessRedirect(userToLogin, data.accessToken);
        }
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  }; 

  // Detetor de input do código (Substitui o useEffect problemático)
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    
    if (val.length <= 6) {
        setOtpCode(val);
        // LÓGICA DE ESTADO: Se chegar a 6, bloqueia UI e abre modal
        if (val.length === 6) {
            setUiState('2fa_decision');
        }
    }
  };

  // Passo 3: Envio Final (Vem do Modal)
  const submitCode = async (isTrusted: boolean) => {
    if (!tempToken) {
      setMessage('Sessão expirada. Volte a fazer login.');
      setUiState('credentials');
      return;
    }
    
    setLoading(true);
    
    try {
      const data = await verify2FA(otpCode, tempToken, isTrusted);
      login(data.user); // Atualiza o estado
      handleSuccessRedirect(data.user); //CORRECAO PARA O F5 NO VPS
      //handleSuccessRedirect(data.user, data.accessToken);
    } catch (error: any) {
      setMessage('Código incorreto. Tente novamente.');
      setOtpCode(''); 
      setUiState('2fa_input'); // Volta ao estado de input em caso de erro
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4 relative gap-4">
      
      {/* MODAL DE CONFIANÇA */}
      {uiState === '2fa_decision' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-lg animate-in fade-in zoom-in duration-200">
          <div className="bg-white border border-gray-200 shadow-xl rounded-lg p-6 max-w-xs w-full text-center space-y-4">
            <div className="mx-auto bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center">
              <Laptop className="w-6 h-6 text-blue-600" />
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Confiar neste dispositivo?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Evita pedir código nos próximos 30 dias.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button 
                type="button" 
                onClick={() => submitCode(true)} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'A validar...' : 'Sim, confiar'}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => submitCode(false)} 
                className="w-full"
                disabled={loading}
              >
                Não, apenas entrar
              </Button>
            </div>
            
            <button 
                type="button"
                onClick={() => { setUiState('2fa_input'); setOtpCode(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
                disabled={loading}
            >
                Cancelar
            </button>
          </div>
        </div>
      )}

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {uiState === 'credentials' ? 'GesLogic Login' : 'Autenticação Segura'}
          </CardTitle>
          {(uiState === '2fa_input' || uiState === '2fa_decision') && (
             <CardDescription>
               {twoFactorMethod === 'EMAIL' 
                 ? 'Código enviado para o seu email.' 
                 : 'Insira o código da app autenticadora.'}
             </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          
          {/* FASE 1: CREDENCIAIS */}
          {uiState === 'credentials' && (
            <form onSubmit={handleSubmitCredentials} className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="exemplo@empresa.com"
                />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'A verificar...' : 'Continuar'}
              </Button>
            </form>
          )}

          {/* FASE 2: INPUT DE CÓDIGO */}
          {(uiState === '2fa_input' || uiState === '2fa_decision') && (
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="otp">Código de Verificação</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  id="otp"
                  value={otpCode}
                  onChange={handleOtpChange}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                  autoFocus
                  disabled={loading || uiState === '2fa_decision'} // Bloqueia quando o modal abre
                />
              </div>
              
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full mt-2"
                onClick={() => { setUiState('credentials'); setPassword(''); setOtpCode(''); }}
                disabled={loading}
              >
                Voltar
              </Button>
            </div>
          )}

          {message && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600 text-center">
              {message}
            </div>
          )}

        </CardContent>
      </Card>

      {/* BOTÃO DE EMERGÊNCIA (DEBUG) */}
      <button 
        onClick={handleHardReset} 
        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors mt-8"
        title="Limpar todos os cookies e reiniciar sessão"
      >
        <Eraser className="w-3 h-3" /> Debug: Limpar Sessão
      </button>

    </div>
  );
};

export default LoginForm;