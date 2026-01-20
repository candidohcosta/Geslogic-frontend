// frontend/src/pages/FeedbackAuditoryPage.tsx

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDetailedFeedback, fetchOperators, fetchCompanies, fetchCompanyDetails } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent 
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { 
  Star, MessageSquare, User as UserIcon, Calendar, 
  FileDown, Filter, Trash2, Search, CheckCircle2, 
  Loader2
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { FeedbackAuditoryReportPDF } from '../components/reports/FeedbackAuditoryReportPDF';
import { getBase64Image } from '../lib/image-utils';

// --- INTERFACES ---
interface FeedbackRecord {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  ticket: {
    ticketNumber: string;
    service: { name: string };
    operator: { firstName: string; lastName: string } | null;
  };
}

const FeedbackAuditoryPage: React.FC = () => {
  const { user } = useAuth();
  
  // 1. ESTADOS DE FILTRO
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [operatorId, setOperatorId] = useState<string>('ALL');
  const [minRating, setMinRating] = useState<string>('0');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(user?.company?.id || '');

  // 2. QUERIES
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: companyDetails } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => fetchCompanyDetails(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: operators = [] } = useQuery({
    queryKey: ['operators', selectedCompanyId],
    queryFn: () => fetchOperators(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: feedbacks = [], isLoading } = useQuery<FeedbackRecord[]>({
    queryKey: ['detailedFeedback', selectedCompanyId, startDate, endDate, operatorId, minRating],
    queryFn: async () => {
        const response = await fetchDetailedFeedback({
          companyId: selectedCompanyId,
          startDate,
          endDate,
          operatorId: operatorId === 'ALL' ? undefined : operatorId,
          minRating: minRating === '0' ? undefined : minRating
        });
        console.log("Dados de Feedback Recebidos:", response); // <--- DEBUG
        return response;
    },
    enabled: !!selectedCompanyId,
  });

  // 3. CÁLCULOS DE RESUMO
  const stats = useMemo(() => {
    if (feedbacks.length === 0) return { avg: 0, total: 0 };
    const sum = feedbacks.reduce((acc, curr) => acc + curr.rating, 0);
    return {
      avg: (sum / feedbacks.length).toFixed(1),
      total: feedbacks.length
    };
  }, [feedbacks]);

  // 4. LOGICA DE PDF (Placeholder para a próxima fase)
  const handleExportPDF = async () => {
    if (feedbacks.length === 0) {
      alert("Não existem dados para exportar no período selecionado.");
      return;
    }

    try {
        //console.log("Estado atual do companyDetails:", companyDetails);
      // 1. Procurar o URL do logo nos detalhes da empresa
      const logoUrl = companyDetails?.logo?.url;
      //console.log("URL do Logótipo encontrado:", logoUrl);
      let logoBase64 = null;

      // 2. Converter se o URL existir
      if (logoUrl) {
          logoBase64 = await getBase64Image(logoUrl);
          //console.log("Base64 gerado com sucesso?", !!logoBase64); 
      }

        const companyName = companies.find((c: any) => c.id === selectedCompanyId)?.name || user?.company?.name || 'GesLogic';

      const blob = await pdf(
        <FeedbackAuditoryReportPDF 
          feedbacks={feedbacks}
          startDate={startDate}
          endDate={endDate}
          companyName={companyName}
          logoBase64={logoBase64}
        />
      ).toBlob();

      saveAs(blob, `Relatorio-Satisfacao-${companyName.replace(/\s+/g, '-')}-${startDate}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF de auditoria:", error);
      alert("Ocorreu um erro ao gerar o relatório.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Star className="text-yellow-500 fill-yellow-500" /> Auditoria de Satisfação
          </h1>
          <p className="text-sm text-gray-500 text-left">Análise de feedback e comentários dos utentes.</p>
        </div>
        <Button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700 text-white">
          <FileDown className="w-4 h-4 mr-2" /> Exportar Relatório PDF
        </Button>
      </div>

      {/* FILTROS */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          
          {user?.role === UserRole.PLATFORM_ADMIN && (
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger><SelectValue placeholder="Empresa..." /></SelectTrigger>
                <SelectContent>
                  {companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Operador</Label>
            <Select value={operatorId} onValueChange={setOperatorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Operadores</SelectItem>
                {operators.map((op: any) => (
                  <SelectItem key={op.id} value={op.id}>{op.firstName} {op.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Avaliação Mínima</Label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todas as notas</SelectItem>
                <SelectItem value="5">Apenas 5 ⭐</SelectItem>
                <SelectItem value="3">3 ⭐ ou mais</SelectItem>
                <SelectItem value="1">Apenas com críticas (1-2 ⭐)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* RESUMO RÁPIDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-bold uppercase tracking-wider">Média de Satisfação</p>
              <h3 className="text-3xl font-black text-yellow-800">{stats.avg} / 5.0</h3>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-6 h-6 ${Number(stats.avg) >= s ? 'text-yellow-500 fill-yellow-500' : 'text-yellow-200'}`} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <p className="text-sm text-blue-700 font-bold uppercase tracking-wider">Total de Avaliações</p>
            <h3 className="text-3xl font-black text-blue-800">{stats.total}</h3>
          </CardContent>
        </Card>
      </div>

      {/* LISTA DE COMENTÁRIOS */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="text-lg">Registos Detalhados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-indigo-600" /></div>
          ) : feedbacks.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-2" />
              <p>Nenhum feedback encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {feedbacks.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors group">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    
                    {/* INFO DO TICKET E OPERADOR */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded">
                          {item.ticket.ticketNumber}
                        </span>
                        <span className="text-sm font-bold text-gray-700">{item.ticket.service.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <UserIcon className="w-3 h-3" />
                        Atendido por: <span className="font-semibold text-gray-700">
                          {item.ticket.operator ? `${item.ticket.operator.firstName} ${item.ticket.operator.lastName}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(item.createdAt), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
                      </div>
                    </div>

                    {/* NOTA E COMENTÁRIO */}
                    <div className="md:text-right flex-grow max-w-xl">
                      <div className="flex md:justify-end gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-4 h-4 ${item.rating >= s ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      {item.comment ? (
                        <p className="text-sm text-gray-600 italic bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative">
                          <span className="text-indigo-300 absolute -top-2 -left-1 text-2xl">“</span>
                          {item.comment}
                          <span className="text-indigo-300 absolute -bottom-4 -right-1 text-2xl">”</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-300 italic">Sem comentário escrito.</p>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackAuditoryPage;