// src/pages/QueueDashboardPage.tsx

import React, { useState, useMemo } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  fetchDashboardStats,
  fetchCompanies,
  fetchServices,
  fetchOperators,
  fetchOperatorProfile,
  fetchCompanyDetails
} from '../services/api';
import { UserRole } from '../types/user';

import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { format } from 'date-fns';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, CartesianGrid, XAxis, YAxis, Bar
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { ChartBarStacked, Star, FileDown, FileSpreadsheet } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

import { OperatorReportPDF } from '../components/reports/OperatorReportPDF';
import { CompanyGlobalReportPDF } from '../components/reports/CompanyGlobalReportPDF';
import { getBase64Image } from '../lib/image-utils';
import { CompanySelect } from '../components/common/CompanySelect';

import { UtilityPageTemplate, UtilitySection } from '../components/templates/UtilityPageTemplate';
import { Button } from '../components/ui/Button';

// --- INTERFACES ---
interface StatsByService {
  service_name: string;
  total_tickets: string; // vem string da BD
  completed_tickets: string;
  avg_wait_time: string | null;
  avg_service_time: string | null;
}

interface StatsByOperator {
  operator_id: string;
  operator_name: string;
  total_tickets: string;
  avg_service_time: string | null;
  avg_rating?: number | string | null;
}

interface StatsTicketsPerDay {
  date: string;
  service_name: string;
  total_tickets: string;
  completed_tickets: string;
}

interface StatsData {
  summary: {
    total: number;
    completed: number;
    absent: number;
    waiting: number;
    expired: number;
    abandonmentRate: string;
  };
  byService: StatsByService[];
  byOperator: StatsByOperator[];
  ticketsPerDay: StatsTicketsPerDay[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

// Componente reutilizável para os "widgets" de número (KPI)
const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, variant = 'default' }) => {
  const styles = {
    default: { border: 'border-l-blue-500', text: 'text-gray-900', bg: 'bg-white' },
    success: { border: 'border-l-green-500', text: 'text-green-700', bg: 'bg-green-50/30' },
    warning: { border: 'border-l-orange-500', text: 'text-orange-700', bg: 'bg-orange-50/30' },
    danger:  { border: 'border-l-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  } as const;

  const currentStyle = styles[variant];

  return (
    <div className={`rounded-xl border shadow-sm ${currentStyle.bg} ${currentStyle.border}`}>
      <div className="p-4 pb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
      </div>
      <div className="p-4 pt-0">
        <p className={`text-xl font-bold ${currentStyle.text}`}>{value}</p>
        {subtext && (
          <p className={`text-xs mt-1 opacity-80 ${currentStyle.text}`}>{subtext}</p>
        )}
      </div>
    </div>
  );
};

type OperatorSortKey = 'tickets' | 'avg_time' | 'rating';
type OperatorTieKey = 'none' | 'tickets' | 'avg_time' | 'rating';

const QueueDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();

  const today = new Date();
  const [filters, setFilters] = useState({
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
    serviceId: '',
    operatorId: '',
  });

  const selectedCompanyId =
    user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;

  // Queries
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services', selectedCompanyId],
    queryFn: () => fetchServices(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: companyDetails } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => fetchCompanyDetails(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: operators = [] } = useQuery({
    queryKey: ['operators', selectedCompanyId],
    queryFn: () => fetchOperators(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: stats, isLoading, error } = useQuery<StatsData, Error>({
    queryKey: ['dashboardStats', selectedCompanyId, filters],
    queryFn: () => fetchDashboardStats({ companyId: selectedCompanyId!, ...filters }),
    enabled: !!selectedCompanyId && !!filters.startDate && !!filters.endDate,
  });

  // Helpers
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const chartData = useMemo(() => {
    if (!stats?.byService) return [];
    return stats.byService.map((item) => ({
      ...item,
      total_tickets: Number(item.total_tickets),
    }));
  }, [stats]);

  const pieChartData = useMemo(() => {
    if (!stats?.byService) return [];
    return stats.byService.map((item) => ({
      ...item,
      total_tickets: Number(item.total_tickets),
      completed_tickets: Number(item.completed_tickets),
    }));
  }, [stats]);

  const barChartData = useMemo(() => {
    if (!stats?.ticketsPerDay) return [];
    const formatted = stats.ticketsPerDay.reduce((acc, item) => {
      const date = format(new Date(item.date), 'dd/MM');
      if (!acc[date]) acc[date] = { date };

      const total = Number(item.total_tickets);
      const completed = Number(item.completed_tickets);

      acc[date][`${item.service_name}_completed`] = completed;
      acc[date][`${item.service_name}_pending`] = total - completed;

      return acc;
    }, {} as Record<string, any>);
    return Object.values(formatted);
  }, [stats]);

  const serviceNames = useMemo(() => {
    if (!stats?.byService) return [];
    return stats.byService.map((s: StatsByService) => s.service_name);
  }, [stats]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSelectFilterChange = (name: 'serviceId' | 'operatorId', value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value === 'all' ? '' : value }));
  };

  const formatSeconds = (seconds: string | null) => {
    if (seconds === null) return 'N/A';
    const totalSeconds = Number(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExportGlobalPDF = async () => {
    if (!stats) return;
    try {
      const logoUrl = companyDetails?.logo?.url;
      let logoBase64: string | null = null;
      if (logoUrl) logoBase64 = await getBase64Image(logoUrl);

      const companyName = companyDetails?.name || 'GesLogic';
      const blob = await pdf(
        <CompanyGlobalReportPDF
          companyName={companyName}
          startDate={filters.startDate}
          endDate={filters.endDate}
          stats={stats}
          logoBase64={logoBase64}
        />
      ).toBlob();
      saveAs(blob, `Relatorio-Executivo-${companyName.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF global:', error);
      alert('Erro ao gerar relatório global.');
    }
  };

  const handleExportOperatorPDF = async (operator: StatsByOperator) => {
    try {
      const data = await fetchOperatorProfile(operator.operator_id, filters.startDate, filters.endDate);

      const logoUrl = companyDetails?.logo?.url;
      let logoBase64: string | null = null;
      if (logoUrl) logoBase64 = await getBase64Image(logoUrl);

      const statsToPdf = {
        total: parseInt((data.stats.total as any), 10) || 0,
        avgTime: formatSeconds(data.stats.avgTime as any),
        avgRating: data.stats.avgRating ? parseFloat(data.stats.avgRating as any).toFixed(1) : '0.0',
      };

      const blob = await pdf(
        <OperatorReportPDF
          operatorName={operator.operator_name}
          startDate={filters.startDate}
          endDate={filters.endDate}
          stats={statsToPdf}
          comments={data.comments || []}
          logoBase64={logoBase64}
        />
      ).toBlob();

      saveAs(blob, `Relatorio-${operator.operator_name}.pdf`);
    } catch (error) {
      console.error('ERRO NO PDF:', error);
      alert('Erro técnico ao gerar PDF. Veja a consola (F12).');
    }
  };

  // ===== Ordenação Top N Operadores =====
  const [opSortKey, setOpSortKey] = useState<OperatorSortKey>('tickets');
  const [opSortOrder, setOpSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [opLimit, setOpLimit] = useState<'5' | '10' | '25' | 'ALL'>('10');
  const [opTieBreaker, setOpTieBreaker] = useState<OperatorTieKey>('none');

const rankedOperators = useMemo(() => {
  const base = (stats?.byOperator ?? []).map((op) => {
    const tickets = Number(op.total_tickets) || 0;
    const avgSecs = op.avg_service_time == null ? NaN : Number(op.avg_service_time); // segundos
    const rating =
      op.avg_rating == null
        ? 0
        : typeof op.avg_rating === 'string'
        ? Number(op.avg_rating)
        : (op.avg_rating as number);

    return { ...op, _tickets: tickets, _avgSecs: avgSecs, _rating: rating };
  });

  const keyCmp = (a: any, b: any, key: OperatorSortKey) => {
    switch (key) {
      case 'tickets':
        return a._tickets - b._tickets; // ASC base
      case 'rating':
        return a._rating - b._rating;   // ASC base
      case 'avg_time': {
        // tempo: NaN (sem dados) vai para o fim em ASC
        const aa = isNaN(a._avgSecs) ? Number.POSITIVE_INFINITY : a._avgSecs;
        const bb = isNaN(b._avgSecs) ? Number.POSITIVE_INFINITY : b._avgSecs;
        return aa - bb; // ASC base (mais rápido = melhor)
      }
    }
  };

  const sorted = [...base].sort((a, b) => {
    // Primário
    let cmp = keyCmp(a, b, opSortKey);
    if (opSortOrder === 'DESC') cmp = -cmp;
    if (cmp !== 0) return cmp;

    // Desempate secundário (usa MESMA direção do primário)
    if (opTieBreaker !== 'none') {
      let tieCmp = keyCmp(a, b, opTieBreaker as OperatorSortKey);
      if (opSortOrder === 'DESC') tieCmp = -tieCmp;
      if (tieCmp !== 0) return tieCmp;
    }

    // Fallback determinístico: nome
    return String(a.operator_name || '').localeCompare(String(b.operator_name || ''));
  });

  const limit = opLimit === 'ALL' ? sorted.length : Number(opLimit);
  return sorted.slice(0, limit);
}, [stats?.byOperator, opSortKey, opSortOrder, opLimit, opTieBreaker]);

  const handleExportOperatorsCSV = () => {
    if (!rankedOperators.length) {
      alert('Sem dados para exportar.');
      return;
    }
    const header = ['Operador', 'Tickets', 'Tempo Médio', 'Satisfação'];
    const csvEscape = (v: any) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ').trim()}"`;
    const rows = rankedOperators.map((op: any) => [
      op.operator_name,
      op.total_tickets,
      formatSeconds(op.avg_service_time),
      op.avg_rating ? Number(op.avg_rating).toFixed(1) : 'N/A',
    ]);

    const csv = [
      header.map(csvEscape).join(','),
      ...rows.map(r => r.map(csvEscape).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `TopOperadores-${filters.startDate}_a_${filters.endDate}.csv`);
  };

  // Permissões
  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <UtilityPageTemplate
      header={{
        icon: ChartBarStacked, // o template dá text-brand-500 ao ícone
        title: 'Dashboard de Estatísticas',
        subtitle: 'Indicadores operacionais e desempenho do atendimento.',
        actions: (
          <div className="flex items-center gap-3 w-[42rem] max-w-full">
            {/* Coluna esquerda: CompanySelect (Platform Admin) */}
            {user.role === UserRole.PLATFORM_ADMIN && (
              <div className="flex-1 min-w-[26rem]">
                <CompanySelect
                  mode="navigate"
                  value={selectedCompanyId ?? ''}
                  buildHref={(companyId) => `/dashboard/queues/${companyId}`}
                  companies={companies}
                  triggerWidthClass="w-full"
                />
              </div>
            )}

            {/* Botão de exportação */}
            {selectedCompanyId && (
              <Button onClick={handleExportGlobalPDF} className="shrink-0 bg-red-600 hover:bg-red-700">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            )}
          </div>
        ),
      }}

      // Filtros globais “por conteúdo” na optionsBar com brand accent
      optionsBar={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Datas */}
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

          {/* Serviços */}
          <Select
            value={filters.serviceId || 'all'}
            onValueChange={(v) => handleSelectFilterChange('serviceId', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os Serviços" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Serviços</SelectItem>
              {services.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operadores */}
          <Select
            value={filters.operatorId || 'all'}
            onValueChange={(v) => handleSelectFilterChange('operatorId', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os Operadores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Operadores</SelectItem>
              {operators.map((op: any) => (
                <SelectItem key={op.id} value={op.id}>
                  {op.firstName} {op.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }

      accent={{ content: false, options: true }}
    >
      <div className="space-y-6">
        {/* Loading / Error */}
        {isLoading && (
          <UtilitySection>
            <div className="p-6 text-center">A carregar…</div>
          </UtilitySection>
        )}
        {error && (
          <UtilitySection>
            <div className="p-6 text-red-600">{error.message}</div>
          </UtilitySection>
        )}

        {stats && (
          <>
            {/* ===== KPIs (cada bloco com a “linha azul”) ===== */}
            <UtilitySection>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard title="Total Emitido" value={stats.summary.total} variant="default" />
                <StatCard title="Atendidas" value={stats.summary.completed} variant="success" />
                <StatCard title="Em Espera" value={stats.summary.waiting} variant="default" />
                <StatCard title="Ausentes" value={stats.summary.absent} variant="warning" subtext="Desistência presencial" />
                <StatCard title="Expiradas" value={stats.summary.expired} variant="warning" subtext="Por fecho de sistema" />
                <StatCard title="Taxa de Perda" value={stats.summary.abandonmentRate} variant="danger" subtext="Ausentes + Expiradas" />
              </div>
            </UtilitySection>

            {/* ===== Gráficos de Círculo (cada um com accent) ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UtilitySection>
                <h3 className="text-sm font-semibold text-center mb-4">Senhas Emitidas por Serviço</h3>
                <div className="w-full min-w-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieChartData} dataKey="total_tickets" outerRadius={100} label>
                        {pieChartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </UtilitySection>

              <UtilitySection>
                <h3 className="text-sm font-semibold text-center mb-4">Senhas Atendidas por Serviço</h3>
                <div className="w-full min-w-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieChartData} dataKey="completed_tickets" outerRadius={100} label>
                        {pieChartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </UtilitySection>
            </div>

            {/* ===== Tabela: Performance por Operador (com Top N + Ordenação + CSV) ===== */}
            <UtilitySection>
              <div className="mb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Performance por Operador</h3>

                {/* Controles de ordenação e limite */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Ordenar por */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Ordenar por</span>
                    <Select
                      value={opSortKey}
                      onValueChange={(v) => {
                        const next = v as OperatorSortKey;
                        setOpSortKey(next);
                        // Ajuste automático de direção ao mudar a métrica
                        if (next === 'avg_time') setOpSortOrder('ASC');
                        else setOpSortOrder('DESC');
                      }}
                    >
                      <SelectTrigger className="h-8 min-w-[12rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tickets">Tickets atendidos</SelectItem>
                        <SelectItem value="avg_time">Tempo médio de atendimento</SelectItem>
                        <SelectItem value="rating">Satisfação média</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ordem */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Ordem</span>
                    <Select value={opSortOrder} onValueChange={(v) => setOpSortOrder(v as 'ASC' | 'DESC')}>
                      <SelectTrigger className="h-8 min-w-[8rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DESC">Descendente</SelectItem>
                        <SelectItem value="ASC">Ascendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Desempate */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Desempate</span>
                    <Select value={opTieBreaker} onValueChange={(v) => setOpTieBreaker(v as OperatorTieKey)}>
                      <SelectTrigger className="h-8 min-w-[12rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        <SelectItem value="tickets">Tickets</SelectItem>
                        <SelectItem value="avg_time">Tempo médio</SelectItem>
                        <SelectItem value="rating">Satisfação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Top N */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Top</span>
                    <Select value={opLimit} onValueChange={(v) => setOpLimit(v as typeof opLimit)}>
                      <SelectTrigger className="h-8 min-w-[7rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="ALL">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Export CSV (Top N atual) */}
                  <Button variant="outline" className="h-8" onClick={handleExportOperatorsCSV} title="Exportar CSV (Top N atual)">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operador</TableHead>
                      <TableHead>Senhas Atendidas</TableHead>
                      <TableHead>Tempo Médio</TableHead>
                      <TableHead>Satisfação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedOperators.map((op: any) => (
                      <TableRow key={op.operator_id}>
                        <TableCell>{op.operator_name}</TableCell>
                        <TableCell>{op.total_tickets}</TableCell>
                        <TableCell>{formatSeconds(op.avg_service_time)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">
                              {op.avg_rating ? Number(op.avg_rating).toFixed(1) : 'N/A'}
                            </span>
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleExportOperatorPDF(op)}>
                            <FileDown className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </UtilitySection>

            {/* ===== Gráfico de Barras ===== */}
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
                    {serviceNames.map((name: string, index: number) => (
                      <React.Fragment key={name}>
                        <Bar
                          dataKey={`${name}_completed`}
                          stackId={name}
                          name={`${name} - Atendidas`}
                          fill={COLORS[index % COLORS.length]}
                        />
                        <Bar
                          dataKey={`${name}_pending`}
                          stackId={name}
                          name={`${name} - Não Atendidas`}
                          fill={`${COLORS[index % COLORS.length]}60`}
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

export default QueueDashboardPage;