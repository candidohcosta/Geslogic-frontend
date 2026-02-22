import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchMyOperatorStats, fetchServices } from '../../services/api';
import { format } from 'date-fns';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { UtilityPageTemplate, UtilitySection } from '../../components/templates/UtilityPageTemplate';
import { UserRole } from '../../types/user';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
} from 'recharts';
import { ChartBarStacked } from 'lucide-react';

// --- Tipos de dados ---
interface StatsByService {
  service_name: string;
  total_tickets: string;
  completed_tickets: string;
}
interface StatsTicketsPerDay {
  date: string;
  service_name: string;
  total_tickets: string;
  completed_tickets: string;
}
interface OperatorStatsData {
  summary: { total: number; completed: number; absent: number; waiting: number };
  byService: StatsByService[];
  ticketsPerDay: StatsTicketsPerDay[];
}
interface ServiceData {
  id: string;
  name: string;
}

// KPI compacto (segue tipografia do resto da app, mas dentro do UtilitySection)
const StatKpi: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <div className="rounded-xl border bg-white">
    <div className="p-3 pb-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
    </div>
    <div className="p-3 pt-0">
      <p className="text-xl font-bold">{value}</p>
    </div>
  </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const OperatorStatsDashboard: React.FC = () => {
  const { user } = useAuth();
  const today = new Date();

  // Filtros
  const [filters, setFilters] = useState({
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
    serviceId: '',
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSelectFilterChange = (value: string) => {
    setFilters((prev) => ({ ...prev, serviceId: value === 'all' ? '' : value }));
  };

  // Serviços disponíveis (para filtro)
  const { data: availableServices = [] } = useQuery<ServiceData[], Error>({
    queryKey: ['services', user?.company?.id],
    queryFn: () => fetchServices(user?.company?.id),
    enabled: !!user?.company?.id,
  });

  // Filtrar por allowedServiceIds do operador
  const operatorServices = useMemo(() => {
    const allowed = user?.operatorDetails?.allowedServiceIds;
    if (!allowed || allowed.length === 0) return availableServices;
    const set = new Set(allowed);
    return availableServices.filter((s) => set.has(s.id));
  }, [user, availableServices]);

  // Estatísticas do operador (filtradas por data/serviço)
  const { data: stats, isLoading, error } = useQuery<OperatorStatsData, Error>({
    queryKey: ['myOperatorStats', filters],
    queryFn: () => fetchMyOperatorStats(filters),
    enabled:
      !!user && user.role === UserRole.OPERATOR && !!filters.startDate && !!filters.endDate,
  });

  // Transformações para gráficos
  const pieChartData = useMemo(() => {
    if (!stats?.byService) return [];
    return stats.byService.map((item) => ({
      service_name: item.service_name,
      total_tickets: Number(item.total_tickets),
      completed_tickets: Number(item.completed_tickets),
    }));
  }, [stats]);

  const barChartData = useMemo(() => {
    if (!stats?.ticketsPerDay) return [];
    const dataByDate = stats.ticketsPerDay.reduce((acc, item) => {
      const dateKey = format(new Date(item.date), 'dd/MM');
      if (!acc[dateKey]) acc[dateKey] = { date: dateKey };

      const total = Number(item.total_tickets);
      const completed = Number(item.completed_tickets);

      acc[dateKey][`${item.service_name}_completed`] = completed;
      acc[dateKey][`${item.service_name}_pending`] = total - completed;

      return acc;
    }, {} as Record<string, any>);
    return Object.values(dataByDate);
  }, [stats]);

  const serviceNamesForChart = useMemo(() => {
    if (!stats?.byService) return [];
    return stats.byService.map((s) => s.service_name);
  }, [stats]);

  // Se por alguma razão for usado fora do contexto OPERATOR, mostramos uma nota
  const isOperator = user?.role === UserRole.OPERATOR;

  return (
    <UtilityPageTemplate
      header={{
        icon: ChartBarStacked,
        title: 'Dashboard do Operador (Estatísticas)',
        subtitle: 'Indicadores pessoais de atendimento no período selecionado.',
        actions: null,
      }}
      // Filtros globais no optionsBar (sobre accent)
      optionsBar={
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
          <Input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
          <Select value={filters.serviceId || 'all'} onValueChange={handleSelectFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os Serviços" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Serviços</SelectItem>
              {operatorServices.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      accent={{ content: false, options: true }}
    >
      <div className="space-y-6">
        {!isOperator && (
          <UtilitySection>
            <div className="p-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
              Este painel é específico do operador.
            </div>
          </UtilitySection>
        )}

        {isLoading && (
          <UtilitySection>
            <div className="p-6 text-center">A carregar estatísticas…</div>
          </UtilitySection>
        )}

        {error && (
          <UtilitySection>
            <div className="p-6 text-red-600">{error.message}</div>
          </UtilitySection>
        )}

        {stats && (
          <>
            {/* KPIs */}
            <UtilitySection>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatKpi title="Total Chamadas" value={stats.summary.total} />
                <StatKpi title="Atendidas" value={stats.summary.completed} />
                <StatKpi title="Ausentes" value={stats.summary.absent} />
                <StatKpi title="Em Espera" value={stats.summary.waiting} />
              </div>
            </UtilitySection>

            {/* Pie charts por serviço */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UtilitySection>
                <h3 className="text-sm font-semibold text-center mb-4">
                  Senhas Emitidas (por Serviço)
                </h3>
                <div className="w-full min-w-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieChartData} dataKey="total_tickets" nameKey="service_name" label>
                        {pieChartData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </UtilitySection>

              <UtilitySection>
                <h3 className="text-sm font-semibold text-center mb-4">
                  Senhas Atendidas (por Serviço)
                </h3>
                <div className="w-full min-w-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        dataKey="completed_tickets"
                        nameKey="service_name"
                        label
                      >
                        {pieChartData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </UtilitySection>
            </div>

            {/* Barras por dia/serviço */}
            <UtilitySection>
              <h3 className="text-sm font-semibold mb-4">Senhas por Dia e Serviço</h3>
              <div className="w-full min-w-0">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {serviceNamesForChart.map((name, idx) => (
                      <React.Fragment key={name}>
                        <Bar
                          dataKey={`${name}_completed`}
                          stackId={name}
                          name={`${name} - Atendidas`}
                          fill={COLORS[idx % COLORS.length]}
                        />
                        <Bar
                          dataKey={`${name}_pending`}
                          stackId={name}
                          name={`${name} - Não Atendidas`}
                          fill={`${COLORS[idx % COLORS.length]}60`}
                        />
                      </React.Fragment>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </UtilitySection>
          </>
        )}
      </div>
    </UtilityPageTemplate>
  );
};

export default OperatorStatsDashboard;