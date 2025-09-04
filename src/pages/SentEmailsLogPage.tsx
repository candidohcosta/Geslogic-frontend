// frontend/src/pages/SentEmailsLogPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState, useMemo, useRef  } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchSentEmails, fetchSentEmailLogDetails } from '../services/api'; // Adicionar a nova função
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { useDebounce } from '../hooks/useDebounce';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Interfaces
interface SentEmailLogData {
  id: string; timestamp: string; status: 'SENT' | 'FAILED'; recipient: string;
  subject: string; body: string; errorMessage?: string;
  company?: { name: string }; triggeredBy?: { email: string };
}
interface EmailsApiResponse { data: SentEmailLogData[]; total: number; page: number; limit: number; }

const SentEmailsLogPage: React.FC = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ recipient: '', subject: '' });
  const debouncedFilters = useDebounce(filters, 500);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const emailContentRef = useRef<HTMLDivElement>(null); 


  const queryFilters = useMemo(() => ({ page, ...debouncedFilters, sortBy, sortOrder }), [page, debouncedFilters, sortBy, sortOrder]);

  const { data: emailsData, isLoading, error } = useQuery<EmailsApiResponse, Error>({
    queryKey: ['sentEmails', queryFilters],
    queryFn: () => fetchSentEmails(queryFilters),
    placeholderData: keepPreviousData,
    enabled: !!user,
  });

  // NOVA QUERY para os detalhes do modal
  const { data: logDetails, isLoading: isLoadingDetails } = useQuery<SentEmailLogData, Error>({
    queryKey: ['sentEmailDetails', selectedLogId],
    queryFn: () => fetchSentEmailLogDetails(selectedLogId!),
    enabled: !!selectedLogId,
  });

  const handleExportPdf = () => {
    const input = emailContentRef.current;
    if (!input || !logDetails) return;

    html2canvas(input, { scale: 2 }) // Aumentar a escala para melhor resolução
      .then((canvas) => {
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
  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortOrder(current => (current === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(columnName);
      setSortOrder('DESC');
    }
  };

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Emails Enviados</CardTitle>
          <CardDescription>Consulte todos os emails enviados pela plataforma ou pela sua empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p>A carregar...</p>}
          {error && <p className="text-red-500">{error.message}</p>}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('timestamp')}>
                      Data
                      {sortBy === 'timestamp' && (sortOrder === 'ASC' ? ' ▲' : ' ▼')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('recipient')}>
                      Destinatário
                      {sortBy === 'recipient' && (sortOrder === 'ASC' ? ' ▲' : ' ▼')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('subject')}>
                      Assunto
                      {sortBy === 'subject' && (sortOrder === 'ASC' ? ' ▲' : ' ▼')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('status')}>
                      Estado
                      {sortBy === 'status' && (sortOrder === 'ASC' ? ' ▲' : ' ▼')}
                    </Button>
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="p-1"></TableHead>
                  <TableHead className="p-1"><Input name="recipient" placeholder="Pesquisar..." value={filters.recipient} onChange={handleFilterChange} /></TableHead>
                  <TableHead className="p-1"><Input name="subject" placeholder="Pesquisar..." value={filters.subject} onChange={handleFilterChange} /></TableHead>
                  <TableHead className="p-1"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailsData?.data.map((log) => (
                  <TableRow key={log.id} onDoubleClick={() => setSelectedLogId(log.id)} className="cursor-pointer">
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{log.recipient}</TableCell>
                    <TableCell>{log.subject}</TableCell>
                    <TableCell><span className={log.status === 'SENT' ? 'text-green-600' : 'text-red-600'}>{log.status}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Paginação */}
        </CardContent>
      </Card>

      {/* MODAL DE DETALHES */}
{selectedLogId && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 " onClick={() => setSelectedLogId(null)}>
    <Card ref={emailContentRef} className="w-full max-w-4xl h-[90vh] flex flex-col pl-[75px] pr-[50px]" onClick={(e) => e.stopPropagation()}>
      <CardHeader>
        <CardTitle>Detalhes do Email</CardTitle>
        <CardDescription>Para: <strong>{logDetails?.recipient}</strong> | Assunto: <strong>{logDetails?.subject}</strong></CardDescription>
      </CardHeader>
      
      {/* O CardContent agora tem a ref e a lógica de renderização correta */}
      <CardContent className="flex-grow overflow-y-auto bg-white p-4 border rounded-md">
        {isLoadingDetails ? <p>A carregar corpo do email...</p> : (
          <div>
            {/* Usamos o 'dangerouslySetInnerHTML' para renderizar o corpo do email */}
            <div dangerouslySetInnerHTML={{ __html: logDetails?.body || '' }} />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="justify-end space-x-2 border-t pt-4">
        <Button variant="outline" onClick={() => setSelectedLogId(null)}>Fechar</Button>
        <Button onClick={handleExportPdf}>Exportar para PDF</Button>
      </CardFooter>
    </Card>
  </div>
)}
    </>
  );
};

export default SentEmailsLogPage;