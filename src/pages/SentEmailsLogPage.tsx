// frontend/src/pages/SentEmailsLogPage.tsx

import React, { useState, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchSentEmails, fetchSentEmailLogDetails } from '../services/api';
import { UserRole } from '../types/user';

// Templates
import { ListPageTemplate } from '../components/templates/ListPageTemplate';
import type { Column, SortOrder } from '../components/templates/types';

// UI
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
} from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/Select';

import { useDebounce } from '../hooks/useDebounce';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Send } from 'lucide-react';

// ---------- Larguras (um único source of truth) ----------
const COLS = {
  date: 18,       // Data
  recipient: 28,  // Destinatário
  subject: 36,    // Assunto
  status: 14,     // Estado
} as const;

const FILTER_GRID_TEMPLATE = `${COLS.date}% ${COLS.recipient}% ${COLS.subject}% ${COLS.status}%`;

// Interfaces
interface SentEmailLogData {
  id: string;
  timestamp: string;
  status: 'SENT' | 'FAILED';
  recipient: string;
  subject: string;
  body: string;
  errorMessage?: string;
  company?: { name: string };
  triggeredBy?: { email: string };
}

interface EmailsApiResponse {
  data: SentEmailLogData[];
  total: number;
  page: number;
  limit: number;
}

const SentEmailsLogPage: React.FC = () => {
  const { user } = useAuth();

  const [page, setPage] = useState(1);

  // Filtros (inclui datas e estado)
  const [filters, setFilters] = useState({
    recipient: '',
    subject: '',
    startDate: '',
    endDate: '',
    status: '' as '' | 'SENT' | 'FAILED',
  });

  const debouncedFilters = useDebounce(filters, 500);

  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const emailContentRef = useRef<HTMLDivElement>(null);

  const queryFilters = useMemo(
    () => ({ page, ...debouncedFilters, sortBy, sortOrder }),
    [page, debouncedFilters, sortBy, sortOrder]
  );

  const { data: emailsData, isLoading, error } = useQuery<EmailsApiResponse, Error>({
    queryKey: ['sentEmails', queryFilters],
    queryFn: () => fetchSentEmails(queryFilters),
    placeholderData: keepPreviousData,
    enabled: !!user,
  });

  const { data: logDetails, isLoading: isLoadingDetails } = useQuery<SentEmailLogData, Error>({
    queryKey: ['sentEmailDetails', selectedLogId],
    queryFn: () => fetchSentEmailLogDetails(selectedLogId!),
    enabled: !!selectedLogId,
  });

  const handleExportPdf = () => {
    const input = emailContentRef.current;
    if (!input || !logDetails) return;

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`email_${logDetails?.recipient}_${new Date().toISOString().split('T')[0]}.pdf`);
    });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleSelectFilterChange = (name: 'status', value: string) => {
    setFilters(prev => ({ ...prev, [name]: (value === 'all' ? '' : (value as 'SENT' | 'FAILED')) }));
    setPage(1);
  };

  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortOrder(current => (current === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(columnName);
      setSortOrder('DESC');
    }
  };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  // --- Colunas da Tabela (ListPageTemplate) ---
  const columns: Column<SentEmailLogData>[] = [
    {
      key: 'timestamp',
      header: 'Data',
      widthPct: COLS.date,
      sortable: true,
      render: (row) => new Date(row.timestamp).toLocaleString(),
    },
    {
      key: 'recipient',
      header: 'Destinatário',
      widthPct: COLS.recipient,
      sortable: true,
      render: (row) => (
        <span className="block w-full truncate" title={row.recipient}>
          {row.recipient}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Assunto',
      widthPct: COLS.subject,
      sortable: true,
      render: (row) => (
        <span className="block w-full truncate" title={row.subject}>
          {row.subject}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      widthPct: COLS.status,
      sortable: true,
      render: (row) => (
        <span className={row.status === 'SENT' ? 'text-green-600' : 'text-red-600'}>
          {row.status}
        </span>
      ),
    },
  ];

  // Estado vazio custom (mostra loading/erro/sem resultados)
  const tableEmptyState = (
    <div className="py-10 text-center text-sm">
      {isLoading ? 'A carregar…' : error ? <span className="text-red-600">{error.message}</span> : 'Sem resultados para os filtros atuais.'}
    </div>
  );

  return (
    <ListPageTemplate<SentEmailLogData>
      header={{
        icon: Send,
        title: 'Histórico de Emails Enviados',
        subtitle: 'Consulte todos os emails enviados pela plataforma ou pela sua empresa.',
      }}

      filters={{
        colsTemplate: FILTER_GRID_TEMPLATE,
        accent: true,
        children: (
          <>
            {/* Data (start/end) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] font-medium text-gray-600">Data início</label>
                <Input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="h-8 px-2"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] font-medium text-gray-600">Data fim</label>
                <Input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="h-8 px-2"
                />
              </div>
            </div>

            {/* Destinatário */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] font-medium text-gray-600">Destinatário</label>
              <Input
                name="recipient"
                placeholder="Pesquisar…"
                value={filters.recipient}
                onChange={handleFilterChange}
                className="h-8 px-2"
              />
            </div>

            {/* Assunto */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] font-medium text-gray-600">Assunto</label>
              <Input
                name="subject"
                placeholder="Pesquisar…"
                value={filters.subject}
                onChange={handleFilterChange}
                className="h-8 px-2"
              />
            </div>

            {/* Estado */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] font-medium text-gray-600">Estado</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleSelectFilterChange('status', value)}
              >
                <SelectTrigger className="h-8 w-full px-2">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="SENT">SENT</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ),
      }}

      toolbar={
        <>
          <div className="text-sm text-gray-700">
            Total de {emailsData?.total ?? 0} registos. Página {emailsData?.page ?? page}.
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1 || isLoading}
            >
              Anterior
            </Button>
            <Button
              onClick={() => setPage((p) => p + 1)}
              disabled={
                !emailsData ||
                emailsData.data.length < (emailsData.limit || 0) ||
                isLoading
              }
            >
              Próxima
            </Button>
          </div>
        </>
      }

      table={{
        columns,
        data: emailsData?.data ?? [],
        rowKey: (row) => row.id,
        sortBy,
        sortOrder,
        onSort: handleSort,
        onRowClick: (row) => setSelectedLogId(row.id),
        emptyState: tableEmptyState,
        stickyHeader: true,
        tableClassName: 'text-sm',
        rowClassName: (row) => (row.status === 'FAILED' ? 'bg-red-50' : ''), // opcional (ver nota abaixo)
      }}
    />
  );
};

export default SentEmailsLogPage;