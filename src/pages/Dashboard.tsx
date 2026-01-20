// src/pages/Dashboard.tsx (VERSÃO FINAL E COMPLETA)

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import OperatorRouteHandler from './OperatorRouteHandler';

// Importar os nossos novos dashboards específicos
import PlatformAdminDashboard from '../components/dashboards/PlatformAdminDashboard';
import CompanyAdminDashboard from '../components/dashboards/CompanyAdminDashboard';
import ParticipantDashboard from '../components/dashboards/ParticipantDashboard';
import OperatorDashboard from '../components/dashboards/OperatorDashboard';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Link } from 'react-router-dom';

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
    case UserRole.OPERATOR:
      //return <OperatorDashboard />;
      return <OperatorRouteHandler />;
    default:
      // Um fallback de segurança
      return <div>O seu dashboard está a ser preparado.</div>;
  }
};

export default Dashboard;