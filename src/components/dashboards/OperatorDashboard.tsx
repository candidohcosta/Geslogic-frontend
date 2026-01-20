// frontend/src/components/dashboards/OperatorDashboard.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchMyOperatorStats, fetchServices } from '../../services/api';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import { UserRole } from '../../types/user';

// --- INTERFACES DE DADOS ---
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
  summary: { total: number; completed: number; absent: number; waiting: number; };
  byService: StatsByService[];
  ticketsPerDay: StatsTicketsPerDay[];
}
interface ServiceData {
  id: string;
  name: string;
}

// Componente reutilizável para os "Widgets" de número
const StatCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <Card>
    <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
    <CardContent><p className="text-2xl font-bold">{value}</p></CardContent>
  </Card>
);

const OperatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const today = new Date();

  // ESTADOS PARA OS FILTROS
  const [filters, setFilters] = useState({
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
    serviceId: '',
  });

  // Query para buscar os serviços do operador (para o dropdown de filtro)
  const { data: availableServices = [] } = useQuery<ServiceData[], Error>({
    queryKey: ['services', user?.company?.id],
    queryFn: () => fetchServices(user?.company?.id),
    enabled: !!user?.company?.id,
  });

  // Usamos os 'allowedServiceIds' que vêm do nosso objeto 'user'
  const operatorServices = useMemo(() => {
    // Primeiro, obtemos os IDs permitidos
    const allowedIds = user?.operatorDetails?.allowedServiceIds;
    
    // Se não houver 'allowedIds' (array vazio ou não definido), o operador pode ver TODOS os serviços
    if (!allowedIds || allowedIds.length === 0) {
      return availableServices;
    }
    
    // Se houver restrições, filtramos a lista completa de serviços
    const allowedIdsSet = new Set(allowedIds);
    return availableServices.filter(service => allowedIdsSet.has(service.id));

  }, [user, availableServices]);
  

  // Query principal que reage aos filtros
  const { data: stats, isLoading, error } = useQuery<OperatorStatsData, Error>({
    queryKey: ['myOperatorStats', filters],
    queryFn: () => fetchMyOperatorStats(filters),
    enabled: !!user && user.role === UserRole.OPERATOR && !!filters.startDate && !!filters.endDate,
  });


  // --- LOG DE DEPURAÇÃO #1: VERIFICAR OS DADOS "CRUS" DA API ---
  console.log('--- PASSO 1: DADOS "CRUS" DA API ---');
  console.log('stats?.ticketsPerDay:', stats?.ticketsPerDay);
  console.log('------------------------------------');

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value === 'all' ? '' : value }));
  };

  // Lógica de transformação para os gráficos (agora completa)
    const pieChartData = useMemo(() => {
        if (!stats?.byService) return [];
        return stats.byService.map(item => ({
        service_name: item.service_name,
        total_tickets: Number(item.total_tickets),
        completed_tickets: Number(item.completed_tickets),
        }));
    }, [stats]);

  const barChartData = useMemo(() => {
    if (!stats?.ticketsPerDay) return [];
    const dataByDate = stats.ticketsPerDay.reduce((acc, item) => {
      const date = format(new Date(item.date), 'dd/MM');
      if (!acc[date]) acc[date] = { date };
      
    const total = Number(item.total_tickets);
    const completed = Number(item.completed_tickets);
      
      // Criamos as chaves para as barras empilhadas
    acc[date][`${item.service_name}_completed`] = completed;
    acc[date][`${item.service_name}_pending`] = total - completed;
      
      return acc;
    }, {} as Record<string, any>);
    return Object.values(dataByDate);
  }, [stats]);

  // --- LOG DE DEPURAÇÃO #2: VERIFICAR OS DADOS TRANSFORMADOS ---
  console.log('--- PASSO 2: DADOS TRANSFORMADOS PARA O GRÁFICO (barChartData) ---');
  console.log(barChartData);
  console.log('--------------------------------------------------------------');  
  
  const serviceNamesForChart = useMemo(() => {
    if (!stats?.byService) return [];
    return stats.byService.map(s => s.service_name);
  }, [stats]);

  // --- LOG DE DEPURAÇÃO #3: VERIFICAR AS CHAVES DOS SERVIÇOS ---
  console.log('--- PASSO 3: NOMES DOS SERVIÇOS PARA AS BARRAS (serviceNamesForChart) ---');
  console.log(serviceNamesForChart);
  console.log('--------------------------------------------------------------------');

    const serviceNames = useMemo(() => {
    if (!stats?.byService) return [];
    return stats.byService.map((s: StatsByService) => s.service_name);
    }, [stats]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-3xl font-bold">A Minha Performance</h1>
      <p className="text-muted-foreground">Bem-vindo, {user?.firstName}.</p>

      {/* BARRA DE FILTROS */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
          <Input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
{/*           <Select value={filters.serviceId} onValue-Change={(value: string) => handleSelectFilterChange('serviceId', value)}>
            <SelectTrigger><SelectValue placeholder="Filtrar por Serviço" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Serviços</SelectItem>
              {operatorServices.map((service: any) => (
                <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
              ))}
            </SelectContent>
          </Select> */}

        </CardContent>
      </Card>

      {isLoading && <p>A carregar estatísticas...</p>}
      {error && <p className="text-red-500">{(error as Error).message}</p>}

      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Chamadas" value={stats.summary.total} />
            <StatCard title="Atendidas" value={stats.summary.completed} />
            <StatCard title="Ausentes" value={stats.summary.absent} />
            <StatCard title="Em Espera" value={stats.summary.waiting} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Senhas Emitidas (por Serviço)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieChartData} dataKey="total_tickets" nameKey="service_name" label>
                      {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /> <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Senhas Atendidas (por Serviço)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieChartData} dataKey="completed_tickets" nameKey="service_name" label>
                      {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /> <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Senhas por Dia e Serviço</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {serviceNamesForChart.map((serviceName, index) => (
                    <React.Fragment key={serviceName}>
                      <Bar dataKey={`${serviceName}_completed`} stackId={serviceName} name={`${serviceName} - Atendidas`} fill={COLORS[index % COLORS.length]} />
                      <Bar dataKey={`${serviceName}_pending`} stackId={serviceName} name={`${serviceName} - Não Atendidas`} fill={`${COLORS[index % COLORS.length]}50`} />
                    </React.Fragment>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OperatorDashboard;