// src/pages/FeedbackAuditoryPage.tsx
// Página de auditoria de feedback dos utentes, com filtros avançados e exportação PDF.
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchDetailedFeedback,
  fetchOperators,
  fetchCompanies,
  fetchCompanyDetails
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '../components/ui/Card';
import { StandardCard } from '../components/ui/StandardCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/Select';
import {
  Star, MessageSquare, User as UserIcon, Calendar,
  FileDown, Loader2, FileSpreadsheet
} from 'lucide-react';

import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { FeedbackAuditoryReportPDF } from '../components/reports/FeedbackAuditoryReportPDF';
import { getBase64Image } from '../lib/image-utils';

import { CompanySelect } from '../components/common/CompanySelect';
import { UtilityPageTemplate, UtilitySection } from '../components/templates/UtilityPageTemplate';

// --- Tipos ---
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

type HasComment = 'all' | 'yes' | 'no';
type OrderKey = 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc';

const FeedbackAuditoryPage: React.FC = () => {
  const { user } = useAuth();

  // -------- 1) Estado de filtros --------
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [operatorId, setOperatorId] = useState<string>('ALL');
  const [minRating, setMinRating] = useState<string>('0');
  const [hasComment, setHasComment] = useState<HasComment>('all');
  const [orderKey, setOrderKey] = useState<OrderKey>('date_desc');

  // PlatformAdmin escolhe empresa; CompanyAdmin fixa
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(user?.company?.id || '');

  // -------- 2) Queries --------
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
      return response;
    },
    enabled: !!selectedCompanyId,
  });

  // -------- 3) Derivados: filtro “tem comentário” + ordenação + KPIs --------
  const filteredAndSorted = useMemo(() => {
    const base = feedbacks
      .filter(f => {
        if (hasComment === 'all') return true;
        const exists = !!(f.comment && f.comment.trim().length > 0);
        return hasComment === 'yes' ? exists : !exists;
      });

    const arr = [...base];
    arr.sort((a, b) => {
      switch (orderKey) {
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'rating_desc':
          return b.rating - a.rating;
        case 'rating_asc':
          return a.rating - b.rating;
        case 'date_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return arr;
  }, [feedbacks, hasComment, orderKey]);

  const stats = useMemo(() => {
    if (filteredAndSorted.length === 0) return { avg: '0.0', total: 0 };
    const sum = filteredAndSorted.reduce((acc, curr) => acc + curr.rating, 0);
    return { avg: (sum / filteredAndSorted.length).toFixed(1), total: filteredAndSorted.length };
  }, [filteredAndSorted]);

  // -------- 4) Exportações --------
  const companyName =
    (companies as any[]).find((c) => c.id === selectedCompanyId)?.name ||
    user?.company?.name ||
    'GesLogic';

  const handleExportPDF = async () => {
    if (filteredAndSorted.length === 0) {
      alert('Não existem dados para exportar no período selecionado.');
      return;
    }
    try {
      const logoUrl = companyDetails?.logo?.url;
      let logoBase64: string | null = null;
      if (logoUrl) {
        logoBase64 = await getBase64Image(logoUrl);
      }
      const blob = await pdf(
        <FeedbackAuditoryReportPDF
          feedbacks={filteredAndSorted}
          startDate={startDate}
          endDate={endDate}
          companyName={companyName}
          logoBase64={logoBase64}
        />
      ).toBlob();
      saveAs(blob, `Relatorio-Satisfacao-${companyName.replace(/\s+/g, '-')}-${startDate}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF de auditoria:', error);
      alert('Ocorreu um erro ao gerar o relatório.');
    }
  };

  const csvEscape = (v: any) =>
    `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ').trim()}"`;

  const handleExportCSV = async () => {
    if (filteredAndSorted.length === 0) {
      alert('Não existem dados para exportar no período selecionado.');
      return;
    }
    const header = ['Data', 'Ticket', 'Serviço', 'Operador', 'Rating', 'Comentário'];
    const rows = filteredAndSorted.map(f => {
      const date = new Date(f.createdAt).toLocaleString('pt-PT');
      const ticket = f.ticket.ticketNumber;
      const service = f.ticket.service?.name ?? '';
      const operator = f.ticket.operator
        ? `${f.ticket.operator.firstName} ${f.ticket.operator.lastName}`
        : 'N/A';
      const rating = f.rating;
      const comment = f.comment ?? '';
      return [date, ticket, service, operator, rating, comment];
    });

    const csv = [
      header.map(csvEscape).join(','),
      ...rows.map(r => r.map(csvEscape).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Relatorio-Satisfacao-${companyName.replace(/\s+/g, '-')}-${startDate}.csv`);
  };

  // -------- 5) Render --------
  return (
    <UtilityPageTemplate
      header={{
        icon: Star,
        title: 'Auditoria de Satisfação',
        subtitle: 'Análise detalhada de feedback, avaliações e comentários dos utentes.',
        actions: (
          <div className="flex items-center gap-3 w-[42rem] max-w-full">
            {user?.role === UserRole.PLATFORM_ADMIN && (
              <div className="flex-1 min-w-[26rem]">
                <CompanySelect
                  mode="controlled"
                  value={selectedCompanyId}
                  onChange={(v) => setSelectedCompanyId(v)}
                  companies={companies}
                  triggerWidthClass="w-full"
                  placeholder="Selecione uma empresa"
                />
              </div>
            )}

            {selectedCompanyId && (
              <>
                <Button variant="outline" className="shrink-0" onClick={handleExportCSV} title="Exportar CSV">
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
                </Button>
                <Button onClick={handleExportPDF} className="shrink-0 bg-red-600 hover:bg-red-700" title="Exportar PDF">
                  <FileDown className="w-4 h-4 mr-2" /> PDF
                </Button>
              </>
            )}
          </div>
        ),
      }}

      // OptionsBar com acento: adicionámos “Tem comentário” + “Ordenar por”
      optionsBar={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Início */}
          <div className="space-y-1.5">
            <Label>Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          {/* Fim */}
          <div className="space-y-1.5">
            <Label>Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          {/* Operador */}
          <div className="space-y-1.5">
            <Label>Operador</Label>
            <Select value={operatorId} onValueChange={setOperatorId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os operadores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Operadores</SelectItem>
                {operators.map((op: any) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.firstName} {op.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Avaliação mínima */}
          <div className="space-y-1.5">
            <Label>Avaliação Mínima</Label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todas as notas</SelectItem>
                <SelectItem value="5">Apenas 5 ⭐</SelectItem>
                <SelectItem value="3">3 ⭐ ou mais</SelectItem>
                <SelectItem value="1">Apenas críticas (1–2 ⭐)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tem comentário */}
          <div className="space-y-1.5">
            <Label>Tem comentário</Label>
            <Select value={hasComment} onValueChange={(v) => setHasComment(v as HasComment)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Apenas com comentário</SelectItem>
                <SelectItem value="no">Sem comentário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ordenar por */}
          <div className="space-y-1.5">
            <Label>Ordenar por</Label>
            <Select value={orderKey} onValueChange={(v) => setOrderKey(v as OrderKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Mais recentes</SelectItem>
                <SelectItem value="date_asc">Mais antigos</SelectItem>
                <SelectItem value="rating_desc">Maior rating</SelectItem>
                <SelectItem value="rating_asc">Menor rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }

      accent={{ content: false, options: true }}
    >
      <div className="space-y-6">
        {/* ===== KPIs (com tipografia menor) ===== */}
        <UtilitySection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StandardCard>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wider">
                    Média de Satisfação
                  </p>
                  <h3 className="text-xl font-extrabold text-yellow-800">
                    {stats.avg} / 5.0
                  </h3>
                </div>

                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-5 h-5 ${
                        Number(stats.avg) >= s ? 'text-yellow-500 fill-yellow-500' : 'text-yellow-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </StandardCard>

            <StandardCard>
              <div className="p-5">
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider">
                  Total de Avaliações
                </p>
                <h3 className="text-xl font-extrabold text-blue-800">{stats.total}</h3>
              </div>
            </StandardCard>
          </div>
        </UtilitySection>

        {/* ===== Lista de Comentários ===== */}
        <UtilitySection>
          <div className="border-b px-6 py-4 bg-gray-50/50">
            <h3 className="text-base font-semibold">Registos Detalhados</h3>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="p-10 text-center">
                <Loader2 className="animate-spin mx-auto h-8 w-8 text-indigo-600" />
              </div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="p-20 text-center text-gray-400">
                <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-2" />
                <p>Nenhum feedback encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAndSorted.map((item) => (
                  <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors group">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      {/* Ticket / operador */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded">
                            {item.ticket.ticketNumber}
                          </span>
                          <span className="text-sm font-bold text-gray-700">
                            {item.ticket.service.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <UserIcon className="w-3 h-3" />
                          Atendido por:
                          <span className="font-semibold text-gray-700">
                            {item.ticket.operator
                              ? `${item.ticket.operator.firstName} ${item.ticket.operator.lastName}`
                              : 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(item.createdAt), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
                        </div>
                      </div>

                      {/* Nota e Comentário */}
                      <div className="md:text-right flex-grow max-w-xl">
                        <div className="flex md:justify-end gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                item.rating >= s ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>

                        {item.comment ? (
                          <p className="text-sm text-gray-600 italic bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative">
                            <span className="text-indigo-300 absolute -top-2 -left-1 text-2xl">“</span>
                            {item.comment}
                            <span className="text-indigo-300 absolute -bottom-4 -right-1 text-2xl">”</span>
                          </p>
                        ) : (
                          <p className="text-xs text-gray-300 italic">
                            Sem comentário escrito.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </UtilitySection>
      </div>
    </UtilityPageTemplate>
  );
};

export default FeedbackAuditoryPage;