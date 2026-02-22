// src/components/dashboards/PlatformAdminDashboard.tsx
// Migrado para UtilityPageTemplate: header padronizado, accent e grelhas responsivas.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPlatformStats } from '../../services/api';

// Widgets (inalterados)
import NewCompaniesWidget from './admin-widgets/NewCompaniesWidget';
import TotalRegistrationsWidget from './admin-widgets/TotalRegistrationsWidget';
import ActiveEventsWidget from './admin-widgets/ActiveEventsWidget';
import RecentErrorsWidget from './admin-widgets/RecentErrorsWidget';
import TotalUserWidget from './admin-widgets/TotalUserWidget';
import RecentCompaniesWidget from './admin-widgets/RecentCompaniesWidget';
import RecentEventsWidget from './admin-widgets/RecentEventsWidget';

// Padrão de página utilitária (atenção ao caminho relativo a partir de /components/dashboards)
import { UtilityPageTemplate, UtilitySection } from '../templates/UtilityPageTemplate';

import { Activity, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

const PlatformAdminDashboard: React.FC = () => {
  // 1) Query Única e Centralizada
  const { data: stats, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['platformStats'],
    queryFn: fetchPlatformStats,
  });

  // 2) Header padronizado + ações à direita (Refresh)
  return (
    <UtilityPageTemplate
      header={{
        icon: Activity,
        title: 'Dashboard da Plataforma',
        subtitle: 'Visão geral, métricas e saúde do sistema.',
        actions: (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Atualizar métricas"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'A atualizar...' : 'Atualizar'}
            </Button>
          </div>
        ),
      }}
      // Mantém a accent bar e toolbar como nas restantes páginas (ex. DevicesStatusPage)
      accent={{ content: false, options: true }}
    >
      {/* Estados de carregamento/erro alinhados com o padrão visual */}
      {isLoading && (
        <UtilitySection withAccent>
          <div className="p-6 text-center text-gray-600">A carregar dashboard...</div>
        </UtilitySection>
      )}

      {error && !isLoading && (
        <UtilitySection withAccent>
          <div className="p-6 text-center text-red-500">
            Erro ao obter métricas: {(error as Error).message}
          </div>
        </UtilitySection>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Linha 1 — KPIs principais (4 colunas em desktop) */}
          <UtilitySection /* withAccent=true por defeito */>
            <div className="px-1">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Indicadores
                </h2>
              </div>
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <TotalUserWidget
                    total={stats?.totalUsersCount || 0}
                    count={stats?.newUsersCount || 0}
                  />
                  <NewCompaniesWidget
                    count={stats?.newCompaniesCount || 0}
                    total={stats?.totalCompaniesCount || 0}
                  />
                  <TotalRegistrationsWidget
                    count={stats?.totalRegistrationsCount || 0}
                  />
                  <ActiveEventsWidget
                    count={stats?.activeEventsCount || 0}
                  />
                </div>
              </div>
            </div>
          </UtilitySection>

          {/* Linha 2 — Listas recentes (duas colunas) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UtilitySection>
              <div className="px-1">
                <div className="px-6 pt-6 pb-4">
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    Empresas Recentes
                  </h2>
                </div>
                <div className="px-6 pb-6">
                  <RecentCompaniesWidget companies={stats?.recentCompanies || []} />
                </div>
              </div>
            </UtilitySection>

            <UtilitySection>
              <div className="px-1">
                <div className="px-6 pt-6 pb-4">
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    Eventos Recentes
                  </h2>
                </div>
                <div className="px-6 pb-6">
                  <RecentEventsWidget events={stats?.recentEvents || []} />
                </div>
              </div>
            </UtilitySection>
          </div>

          {/* Linha 3 — Logs de erro recentes (full width) */}
          <UtilitySection>
            <div className="px-1">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Logs de Erro Recentes
                </h2>
              </div>
              <div className="px-6 pb-6">
                <RecentErrorsWidget logs={stats?.recentErrorLogs || []} />
              </div>
            </div>
          </UtilitySection>
        </div>
      )}
    </UtilityPageTemplate>
  );
};

export default PlatformAdminDashboard;