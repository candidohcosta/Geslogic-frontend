import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TwoFactorSetup } from '../components/auth/TwoFactorSetup';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

const ForceSetupPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleComplete = () => {
    // Ao completar, fazemos reload para garantir que o backend
    // nos dá um novo token/user sem a flag 'is2FASetupRequired'
    window.location.href = '/dashboard';
  };

  if (!user) return null; // O SecurityGuard trata disto

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Segurança Obrigatória</h1>
            <p className="text-gray-600">
                Olá, {user.firstName}.<br/>
                Para continuar a usar o GesLogic, configure a proteção de conta.
            </p>
        </div>
        
        {/* Não precisamos de passar userOverride, o componente lê do contexto */}
        <TwoFactorSetup forced={true} onComplete={handleComplete} />
        
        <div className="text-center">
            <Button variant="link" onClick={() => logout()} className="text-gray-500">
                Sair
            </Button>
        </div>
      </div>
    </div>
  );
};

export default ForceSetupPage;