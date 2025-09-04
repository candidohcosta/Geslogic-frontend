// src/components/dashboards/PlatformAdminDashboard.tsx (VERSÃO FINAL E CORRETA)

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPlatformStats } from '../../services/api';

// 1. IMPORTAR OS NOSSOS NOVOS WIDGETS
import NewCompaniesWidget from './admin-widgets/NewCompaniesWidget';
import TotalRegistrationsWidget from './admin-widgets/TotalRegistrationsWidget';
import ActiveEventsWidget from './admin-widgets/ActiveEventsWidget';
import RecentErrorsWidget from './admin-widgets/RecentErrorsWidget';
import TotalUserWidget from './admin-widgets/TotalUserWidget';
import RecentCompaniesWidget from './admin-widgets/RecentCompaniesWidget';
import RecentEventsWidget from './admin-widgets/RecentEventsWidget';

const PlatformAdminDashboard: React.FC = () => {
  // 2. A CHAMADA À API CONTINUA A SER ÚNICA E CENTRALIZADA
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['platformStats'],
    queryFn: fetchPlatformStats,
  });

  if (isLoading) return <div>A carregar dashboard...</div>;
  if (error) return <div className="text-red-500">Erro: {(error as Error).message}</div>;
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard da Plataforma</h1>

      {/* 3. O LAYOUT AGORA É UMA COMPOSIÇÃO DE WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TotalUserWidget total={stats?.totalUsersCount || 0} count={stats?.newUsersCount || 0} />
        <NewCompaniesWidget count={stats?.newCompaniesCount || 0} total={stats?.totalCompaniesCount || 0} />
        <TotalRegistrationsWidget count={stats?.totalRegistrationsCount || 0} />
        <ActiveEventsWidget count={stats?.activeEventsCount || 0} />
      </div>

      {/* A TUA NOVA LINHA DE WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentCompaniesWidget companies={stats?.recentCompanies || []} />
        <RecentEventsWidget events={stats?.recentEvents || []} />
      </div>

      {/* O teu widget de logs de erro (está perfeito) */}
      <RecentErrorsWidget logs={stats?.recentErrorLogs || []} />
    </div>
  );
};

export default PlatformAdminDashboard;