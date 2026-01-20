// frontend/src/pages/QueueDashboardPage.tsx (VERSÃO COMPLETA)

import React, { useState, useMemo } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, fetchCompanies, fetchServices, fetchOperators, fetchOperatorProfile, fetchCompanyDetails } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { ChartBarStacked, Star, FileDown } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { OperatorReportPDF } from '../components/reports/OperatorReportPDF';
import { Button } from '../components/ui/Button';
import { CompanyGlobalReportPDF } from '../components/reports/CompanyGlobalReportPDF';
import { getBase64Image } from '../lib/image-utils';
// --- INTERFACES ---
interface StatsByService {
  service_name: string;
  total_tickets: string; // Vem como string da BD
  completed_tickets: string;
  avg_wait_time: string | null;
  avg_service_time: string | null;
}

interface StatsByOperator {
  operator_id: string;
  operator_name: string;
  total_tickets: string;
  avg_service_time: string | null;
}

interface StatsTicketsPerDay {
  date: string;
  service_name: string;
  total_tickets: string; // <-- RENOMEADO/ADICIONADO
  completed_tickets: string; // <-- ADICIONADO
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

// Componente reutilizável para os "Widgets" de número
const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, variant = 'default' }) => {
  
  // Mapa de estilos baseado na variante
  const styles = {
    default: { border: 'border-l-blue-500', text: 'text-gray-900', bg: 'bg-white' },
    success: { border: 'border-l-green-500', text: 'text-green-700', bg: 'bg-green-50/30' },
    warning: { border: 'border-l-orange-500', text: 'text-orange-700', bg: 'bg-orange-50/30' },
    danger:  { border: 'border-l-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  };

  const currentStyle = styles[variant];

  return (
    <Card className={`border-l-4 shadow-sm ${currentStyle.border} ${currentStyle.bg}`}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className={`text-2xl font-bold ${currentStyle.text}`}>
          {value}
        </p>
        {subtext && (
          <p className={`text-xs mt-1 opacity-80 ${currentStyle.text}`}>
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

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

  const selectedCompanyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;
  const handleCompanySelect = (newCompanyId: string) => navigate(`/dashboard/queues/${newCompanyId}`);

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: fetchCompanies, enabled: user?.role === UserRole.PLATFORM_ADMIN });
  const { data: services = [] } = useQuery({ queryKey: ['services', selectedCompanyId], queryFn: () => fetchServices(selectedCompanyId), enabled: !!selectedCompanyId });
  const { data: companyDetails } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => fetchCompanyDetails(selectedCompanyId!),
    enabled: !!selectedCompanyId, // Só corre se houver um ID
  });  


  const { data: operators = [] } = useQuery({
    queryKey: ['operators', selectedCompanyId],
    queryFn: () => fetchOperators(selectedCompanyId!),
    // Só busca os operadores se uma empresa estiver selecionada
    enabled: !!selectedCompanyId,
  });

/*   const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats', selectedCompanyId, filters],
    queryFn: () => fetchDashboardStats({ companyId: selectedCompanyId!, ...filters }),
    enabled: !!selectedCompanyId && !!filters.startDate && !!filters.endDate,
  }); */

    const { data: stats, isLoading, error } = useQuery<StatsData, Error>({
    queryKey: ['dashboardStats', selectedCompanyId, filters],
    queryFn: () => fetchDashboardStats({ companyId: selectedCompanyId!, ...filters }),
    enabled: !!selectedCompanyId && !!filters.startDate && !!filters.endDate,
    });  

    const chartData = useMemo(() => {
        // Se não houver dados, devolve um array vazio
        if (!stats?.byService) return [];
        
        // Converte as strings para números
        return stats.byService.map((item: any) => ({
        ...item,
        total_tickets: Number(item.total_tickets), // A conversão
        }));
    }, [stats]); // Recalcula apenas quando 'stats' mudar

    // Dados para os gráficos de queijo (convertemos para número)
    const pieChartData = useMemo(() => {
        if (!stats?.byService) return [];
        return stats.byService.map(item => ({
        ...item,
        total_tickets: Number(item.total_tickets),
        completed_tickets: Number(item.completed_tickets),
        }));
    }, [stats]);

    // Dados para o gráfico de barras
    const barChartData = useMemo(() => {
        if (!stats?.ticketsPerDay) return [];
        const formatted = stats.ticketsPerDay.reduce((acc, item) => {
        const date = format(new Date(item.date), 'dd/MM');
        if (!acc[date]) acc[date] = { date };
        
        const total = Number(item.total_tickets);
        const completed = Number(item.completed_tickets);
        
        // Criamos as duas chaves para cada serviço
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
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSelectFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value === 'all' ? '' : value }));
  };
  
  const handleExportGlobalPDF = async () => {
    if (!stats) return;
    
    try {
      // 1. Procurar o URL do logo nos detalhes da empresa
      const logoUrl = companyDetails?.logo?.url;
      let logoBase64 = null;

      // 2. Converter se o URL existir
      if (logoUrl) {
          logoBase64 = await getBase64Image(logoUrl);
      }

      //const companyName = companies.find((c: any) => c.id === selectedCompanyId)?.name || user?.company?.name || 'GesLogic';
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
      console.error("Erro ao gerar PDF global:", error);
      alert("Erro ao gerar relatório global.");
    }
  };

  const handleExportOperatorPDF = async (operator: any) => {
    try {
        console.log("A pedir dados para o PDF...");
        const data = await fetchOperatorProfile(operator.operator_id, filters.startDate, filters.endDate);
        
        console.log("Dados recebidos do Backend:", data);

      // 1. Procurar o URL do logo nos detalhes da empresa
      const logoUrl = companyDetails?.logo?.url;
      let logoBase64 = null;

      // 2. Converter se o URL existir
      if (logoUrl) {
          logoBase64 = await getBase64Image(logoUrl);
      }

        // Validar dados antes de passar ao componente
        const statsToPdf = {
            total: parseInt(data.stats.total) || 0,
            avgTime: formatSeconds(data.stats.avgTime),
            avgRating: data.stats.avgRating ? parseFloat(data.stats.avgRating).toFixed(1) : '0.0'
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
        console.error("ERRO NO PDF:", error);
        alert("Erro técnico ao gerar PDF. Veja a consola (F12).");
    }
};

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const formatSeconds = (seconds: string | null) => {
    if (seconds === null) return 'N/A';
    const totalSeconds = Number(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

if (stats) {
  console.log("Dados de estatísticas recebidos pela API:", stats);
}

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-6">
            <CardTitle className="flex items-center gap-2">
              <ChartBarStacked className="w-6 h-6" />
              Dashboard de Estatísticas
            </CardTitle>
            <Button onClick={handleExportGlobalPDF} className="bg-red-600 hover:bg-red-700">
              <FileDown className="mr-2 h-4 w-4" /> Exportar Relatório Executivo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {user.role === UserRole.PLATFORM_ADMIN && <Select onValueChange={handleCompanySelect} value={selectedCompanyId}><SelectTrigger><SelectValue placeholder="Selecione empresa..." /></SelectTrigger><SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>}
          <Input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
          <Input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
          <Select onValueChange={(v) => handleSelectFilterChange('serviceId', v)}><SelectTrigger><SelectValue placeholder="Todos os Serviços" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os Serviços</SelectItem>{services.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
          <Select onValueChange={(v) => handleSelectFilterChange('operatorId', v)} value={filters.operatorId}>
            <SelectTrigger><SelectValue placeholder="Todos os Operadores" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Operadores</SelectItem>
              
              {/* O .map() que faltava */}
              {operators.map((op: any) => (
                <SelectItem key={op.id} value={op.id}>
                  {op.firstName} {op.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading && <p>A carregar...</p>}
      {error && <p className="text-red-500">{(error as Error).message}</p>}
      
      {!isLoading && !selectedCompanyId && user.role === UserRole.PLATFORM_ADMIN /* && <p>Selecione uma empresa.</p> */}

      {stats && (
        <div className="space-y-4">
{/* SECÇÃO DE RESUMO KPI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            
            {/* 1. TOTAL (Azul) */}
            <StatCard 
                title="Total Emitido" 
                value={stats.summary.total} 
                variant="default" 
            />
            
            {/* 2. ATENDIDAS (Verde) */}
            <StatCard 
                title="Atendidas" 
                value={stats.summary.completed} 
                variant="success" 
            />

            {/* 3. EM ESPERA (Azul) */}
            <StatCard 
                title="Em Espera" 
                value={stats.summary.waiting} 
                variant="default" 
            />
            
            {/* 4. AUSENTES (Laranja) */}
            <StatCard 
                title="Ausentes" 
                value={stats.summary.absent} 
                variant="warning" 
                subtext="Desistência presencial"
            />

            {/* 5. EXPIRADAS (Laranja) */}
            <StatCard 
                title="Expiradas" 
                value={stats.summary.expired} 
                variant="warning" 
                subtext="Por fecho de sistema"
            />

            {/* 6. TAXA DE PERDA (Vermelho) */}
            <StatCard 
                title="Taxa de Perda" 
                value={stats.summary.abandonmentRate} 
                variant="danger"
                subtext="Ausentes + Expiradas"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-center">Senhas Emitidas por Serviço</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieChartData} dataKey="total_tickets" nameKey="service_name" cx="50%" cy="50%" outerRadius={100} label>
                      {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-center">Senhas Atendidas por Serviço</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieChartData} dataKey="completed_tickets" nameKey="service_name" cx="50%" cy="50%" outerRadius={100} label>
                      {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Performance por Operador</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border">
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
                    {stats.byOperator.map((op: any) => (
                      <TableRow key={op.operator_id}>
                        <TableCell className="font-medium">{op.operator_name}</TableCell>
                        <TableCell>{op.total_tickets}</TableCell>
                        <TableCell>{formatSeconds(op.avg_service_time)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">{op.avg_rating ? parseFloat(op.avg_rating).toFixed(1) : 'N/A'}</span>
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          </div>
                        </TableCell>
                        <TableCell>
                            {/* Botão de Exportar */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleExportOperatorPDF(op)}
                            >
                              <FileDown className="h-4 w-4 mr-2" /> PDF
                            </Button>
                        </TableCell>                        
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {/* --- O GRÁFICO DE BARRAS EMPILHADAS POR SERVIÇO --- */}
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
                    {serviceNames.map((serviceName: string, index: number) => (
                        <React.Fragment key={serviceName}>
                        
                        {/* A CORREÇÃO ESTÁ AQUI, NA PROP 'name' */}
                        <Bar 
                            dataKey={`${serviceName}_completed`} 
                            stackId={serviceName} 
                            name={`${serviceName} - Atendidas`} 
                            fill={COLORS[index % COLORS.length]} 
                        />
                        <Bar 
                            dataKey={`${serviceName}_pending`} 
                            stackId={serviceName} 
                            name={`${serviceName} - Não Atendidas`} 
                            fill={`${COLORS[index % COLORS.length]}60`} 
                        />

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

export default QueueDashboardPage;