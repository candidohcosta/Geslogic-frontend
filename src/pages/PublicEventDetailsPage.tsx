// src/pages/PublicEventDetailsPage.tsx (VERSÃO COMPLETA E FUNCIONAL)

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchEventById, fetchEventCapacity, registerEventInterest } from '../services/api'; // <--- IMPORTAR NOVAS
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Helmet } from 'react-helmet-async';
import { Paperclip, Users, BellRing, CheckCircle2 } from 'lucide-react';
import { EventForm } from '../components/events/EventForm';
import { EventData } from '../types/event';

const PublicEventDetailsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();

  // 1. Buscar Evento
  const { data: event, isLoading, error } = useQuery<EventData, Error>({
    queryKey: ['event', eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
  });

  // 2. Buscar Capacidade (NOVO)
  const { data: capacity } = useQuery({
    queryKey: ['eventCapacity', eventId],
    queryFn: () => fetchEventCapacity(eventId!),
    enabled: !!eventId,
    refetchInterval: 30000, // Atualiza a cada 30s para evitar conflitos de última hora
  });

  // 3. Mutação para Lista de Interesse (NOVO)
  const [interestEmail, setInterestEmail] = useState('');
  const [interestName, setInterestName] = useState('');
  const [interestSuccess, setInterestSuccess] = useState(false);

  const interestMutation = useMutation({
    mutationFn: () => registerEventInterest(eventId!, interestEmail, interestName),
    onSuccess: () => setInterestSuccess(true),
    onError: (err: any) => alert(err.message)
  });

  if (isLoading) return <div className="p-6 text-center">A carregar...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Erro: {error.message}</div>;

  // Renderização da área de inscrição baseada no estado
  const renderRegistrationArea = () => {
    if (!capacity) return <p>A verificar disponibilidade...</p>;

    // CASO 1: ESGOTADO (FULL)
    if (capacity.status === 'FULL') {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center space-y-4">
                <div className="mx-auto bg-gray-200 w-12 h-12 rounded-full flex items-center justify-center text-gray-500">
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Evento Esgotado</h3>
                    <p className="text-gray-500">Lamentamos, mas já não existem vagas disponíveis.</p>
                </div>

                {!interestSuccess ? (
                    <div className="max-w-sm mx-auto space-y-3 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-blue-600 flex items-center justify-center gap-2">
                            <BellRing className="w-4 h-4" />
                            Avise-me se houver desistências
                        </p>
                        <div className="space-y-2">
                            <Input placeholder="O seu Nome" value={interestName} onChange={e => setInterestName(e.target.value)} />
                            <Input type="email" placeholder="O seu Email" value={interestEmail} onChange={e => setInterestEmail(e.target.value)} />
                            <Button className="w-full" onClick={() => interestMutation.mutate()} disabled={!interestEmail || interestMutation.isPending}>
                                {interestMutation.isPending ? 'A registar...' : 'Notificar-me'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-100 text-green-800 p-4 rounded-md flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Email registado. Entraremos em contacto se surgir uma vaga.</span>
                    </div>
                )}
            </div>
        );
    }

    // CASO 2: LISTA DE ESPERA ou ABERTO
    return (
        <>
            {/* Aviso de Lista de Espera */}
            {capacity.status === 'WAITING_LIST' && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <Users className="h-5 w-5 text-amber-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-amber-700">
                                <strong>Nota:</strong> As vagas principais estão preenchidas. 
                                A sua inscrição ficará em <strong>Lista de Espera</strong> ({capacity.waitingSeatsLeft} lugares restantes na margem).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Aviso de Poucas Vagas (Opcional - urgência) */}
            {capacity.status === 'OPEN' && capacity.seatsLeft < 5 && (
                 <div className="mb-4 text-center text-sm text-orange-600 font-medium animate-pulse">
                    🔥 Restam apenas {capacity.seatsLeft} vagas!
                 </div>
            )}

            {event && (
                <EventForm 
                    fieldDefinitions={event.fieldDefinitions} 
                    pricingTiers={event.pricingTiers} 
                    eventId={event.id} 
                />
            )}
        </>
    );
  };

  return (
    <>
      <Helmet>
        <title>{event?.name || 'Evento'} | GesLogic Registo</title>
        {/* ... metatags ... */}
      </Helmet>
      
      <div className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl overflow-hidden">
          {/* ... Banner ... */}
          {event?.banner?.url && (
            <div className="w-full bg-gray-100">
              <img src={event.banner.url} alt={`Banner para ${event.name}`} className="w-full h-auto object-contain" />
            </div>
          )}

          <CardHeader className="text-center">
            <CardTitle className="text-4xl">{event?.name}</CardTitle>
            <CardDescription className="text-lg pt-2 whitespace-pre-wrap">{event?.description}</CardDescription>
          </CardHeader>

          <CardContent>
            {/* Info Grid */}
            <div className="grid md:grid-cols-3 gap-4 text-center mb-6 pb-6 border-b">
              {/* ... Localização, Data, Preço ... */}
              <div><p className="font-semibold text-muted-foreground">Localização</p><p>{event?.location}</p></div>
              <div><p className="font-semibold text-muted-foreground">Data</p><p>{event?.startDate ? new Date(event.startDate).toLocaleDateString('pt-PT') : 'N/A'}</p></div>
              <div>
                  <p className="font-semibold text-muted-foreground">Preço a partir de</p>
                  <p>{event?.pricingTiers && event.pricingTiers.length > 0 ? `${Math.min(...event.pricingTiers.map(t => Number(t.price))).toFixed(2)}€` : `${Number(event?.baseCost || 0).toFixed(2)}€`}</p>
              </div>
            </div>

            {/* Documentos */}
            {event?.documents && event.documents.length > 0 && (
               <div className="my-6">
                 {/* ... lista de documentos ... */}
               </div>
            )}
            
            {/* --- ÁREA DINÂMICA DE INSCRIÇÃO --- */}
            {renderRegistrationArea()}
            {/* ---------------------------------- */}

          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="link" asChild><Link to="/">Voltar à Página Inicial</Link></Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default PublicEventDetailsPage;