// src/pages/PublicEventDetailsPage.tsx (VERSÃO COMPLETA E FUNCIONAL)

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchEventById } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Helmet } from 'react-helmet-async';
import { Paperclip } from 'lucide-react';
import { EventForm } from '../components/events/EventForm'; // A NOSSA IMPORTAÇÃO
import { EventData, EventFieldDefinitionData, EventFieldType } from '../types/event';


const PublicEventDetailsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();

  // Query para buscar os detalhes do evento
  const { data: event, isLoading, error } = useQuery<EventData, Error>({
    queryKey: ['event', eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
  });


  // Estado de Loading: Mostra uma mensagem enquanto os dados são buscados
  if (isLoading) return <div className="p-6 text-center">A carregar...</div>;

  // Estado de Erro: Mostra uma mensagem se a chamada à API falhar
  if (error) return <div className="p-6 text-center text-red-500">Erro: {error.message}</div>;

   // Estado de Sucesso: Mostra os detalhes do evento
  return (
    <>
      <Helmet>
        <title>{isLoading ? 'A carregar evento...' : (event?.name || 'Evento não encontrado')} | GesLogic Registo</title>
        <meta name="description" content={event?.description?.substring(0, 160)} />

        {/* Open Graph / Facebook */}
        <meta property="og:title" content={event?.name} />
        <meta property="og:description" content={event?.description?.substring(0, 160)} />
        {event?.banner?.url && <meta property="og:image" content={event.banner.url} />}
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={event?.name} />
        <meta name="twitter:description" content={event?.description?.substring(0, 160)} />
        {event?.banner?.url && <meta name="twitter:image" content={event.banner.url} />}
      </Helmet>
      <div className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl overflow-hidden">
          {event?.banner?.url && (
            <div className="w-full bg-gray-100">
              <img src={event.banner.url} alt={`Banner para ${event.name}`} className="w-full h-auto object-contain" />
            </div>
          )}
          <CardHeader className="text-center">
            <CardTitle className="text-4xl">{event?.name}</CardTitle>
            <CardDescription className="text-lg pt-2">{event?.description}</CardDescription>
          </CardHeader>
          <CardContent>

          <div className="grid md:grid-cols-3 gap-4 text-center mb-6 pb-6 border-b">
            <div>
              <p className="font-semibold text-muted-foreground">Localização</p>
              <p>{event?.location}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Data de Início</p>
              <p>{event?.startDate ? new Date(event.startDate).toLocaleDateString('pt-PT') : 'N/A'}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Custo Base</p>
              <p>{Number(event?.baseCost).toFixed(2)}€</p>
            </div>
          </div>


            {event?.documents && event.documents.length > 0 && (
              <div className="my-6">
                <h3 className="text-xl font-bold text-center mb-4">Documentos</h3>
                <div className="space-y-2 max-w-md mx-auto">
                  {event.documents.map(doc => (
                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100">
                      <Paperclip className="h-5 w-5 text-gray-500 mr-3" />
                      <span className="text-indigo-600 font-medium">{doc.displayName}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* AQUI ESTÁ A MUDANÇA: Usamos o nosso novo componente */}
            {event && <EventForm fieldDefinitions={event.fieldDefinitions} eventId={event.id} />}





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