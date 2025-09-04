// src/pages/Dashboard.tsx (VERSÃO FINAL E COMPLETA)

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';

// Importar os nossos novos dashboards específicos
import PlatformAdminDashboard from '../components/dashboards/PlatformAdminDashboard';
import CompanyAdminDashboard from '../components/dashboards/CompanyAdminDashboard';
import ParticipantDashboard from '../components/dashboards/ParticipantDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Se o utilizador ainda não foi carregado, não mostra nada
  if (!user) {
    return null;
  }

  // O "Central de Despacho": decide qual dashboard renderizar
  switch (user.role) {
    case UserRole.PLATFORM_ADMIN:
      return <PlatformAdminDashboard />;
    case UserRole.COMPANY_ADMIN:
      return <CompanyAdminDashboard />;
    case UserRole.PARTICIPANT:
      return <ParticipantDashboard />;
    default:
      // Um fallback de segurança
      return <div>O seu dashboard está a ser preparado.</div>;
  }
};

export default Dashboard;