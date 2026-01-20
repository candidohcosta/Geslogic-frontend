// frontend/src/pages/EventFeedbackPage.tsx

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEventFeedbackStats, fetchCompanies, fetchEvents } from '../services/api'; // <--- Precisamos de uma nova API
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Card, CardHeader, CardTitle, CardContent 
} from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { 
  Star, MessageSquare, Calendar, Filter, Loader2, PartyPopper
} from 'lucide-react';

// Interfaces Específicas
interface EventFeedbackRecord {
  eventName: string;
  rating: number;
  comment: string | null;
  date: string;
  registrationId: string;
}

interface FeedbackStatsResponse {
  averageRating: number;
  totalFeedbacks: number;
  starCounts: { [key: number]: number };
  recentFeedbacks: EventFeedbackRecord[];
}

const SupportFeedbackPage: React.FC = () => {
  const { user } = useAuth();
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(user?.company?.id || '');
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');

  // 1. QUERIES
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', selectedCompanyId],
    queryFn: () => fetchEvents(selectedCompanyId), // Reutiliza a função existente
    enabled: !!selectedCompanyId,
  });

  const { data: stats, isLoading } = useQuery<FeedbackStatsResponse>({
    queryKey: ['eventFeedbackStats', selectedCompanyId, selectedEventId],
    queryFn: () => fetchEventFeedbackStats({ 
        eventId: selectedEventId 
    }),
    enabled: !!selectedCompanyId,
  });

  // Cálculos visuais (ou usa o que vem do backend)
  const averageRating = stats?.averageRating || 0;
  const totalReviews = stats?.totalFeedbacks || 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Star className="text-yellow-500 fill-yellow-500" /> Feedback de Eventos
          </h1>
          <p className="text-sm text-gray-500 text-left">O que os participantes dizem sobre os seus eventos.</p>
        </div>
      </div>

      {/* FILTROS */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          
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
            <Label>Evento</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger><SelectValue placeholder="Todos os Eventos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Eventos</SelectItem>
                {events.map((ev: any) => (
                  <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                ))}
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
              <p className="text-sm text-yellow-700 font-bold uppercase tracking-wider">Média Global</p>
              <h3 className="text-3xl font-black text-yellow-800">{Number(averageRating).toFixed(1)} / 5.0</h3>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-6 h-6 ${Number(averageRating) >= s ? 'text-yellow-500 fill-yellow-500' : 'text-yellow-200'}`} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <p className="text-sm text-blue-700 font-bold uppercase tracking-wider">Total de Avaliações</p>
            <h3 className="text-3xl font-black text-blue-800">{totalReviews}</h3>
          </CardContent>
        </Card>
      </div>

      {/* LISTA DE COMENTÁRIOS */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="text-lg">Comentários Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-indigo-600" /></div>
          ) : !stats?.recentFeedbacks || stats.recentFeedbacks.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-2" />
              <p>Nenhum feedback encontrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.recentFeedbacks.map((item, idx) => (
                <div key={idx} className="p-6 hover:bg-gray-50 transition-colors group">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    
                    {/* INFO DO EVENTO */}
                    <div className="space-y-1 w-64 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <PartyPopper className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-bold text-gray-700 truncate" title={item.eventName}>{item.eventName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 pl-6">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(item.date), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
                      </div>
                    </div>

                    {/* NOTA E COMENTÁRIO */}
                    <div className="flex-grow max-w-2xl">
                      <div className="flex gap-0.5 mb-2">
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

export default SupportFeedbackPage;