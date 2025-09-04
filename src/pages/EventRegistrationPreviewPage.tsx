// frontend/src/pages/EventRegistrationPreviewPage.tsx (VERSÃO FINAL E COMPLETA)

import React, { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { fetchEventById } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EventForm } from '../components/events/EventForm'; // 1. IMPORTAR O NOSSO NOVO COMPONENTE
import { EventData } from '../types/event'; // Importar tipos centralizados
import { Copy } from 'lucide-react';

const EventRegistrationPreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [copySuccess, setCopySuccess] = useState('');

  const { data: event, isLoading, error } = useQuery<EventData, Error>({
    queryKey: ['event', eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId && !!user,
  });

  const handleCopyLink = () => {
    const eventUrl = `${window.location.origin}/events/${eventId}`;

    // TENTA USAR A API MODERNA E SEGURA PRIMEIRO
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(eventUrl).then(() => {
        setCopySuccess('Link copiado!');
        setTimeout(() => setCopySuccess(''), 2000);
      }).catch(err => {
        console.error('Erro ao copiar (API segura):', err);
        setCopySuccess('Erro ao copiar.');
      });
    } else {
      // FALLBACK PARA HTTP E NAVEGADORES ANTIGOS
      // Cria um <textarea> "fantasma" para copiar o texto
      const textArea = document.createElement('textarea');
      textArea.value = eventUrl;
      textArea.style.position = 'fixed'; // Impede que "salte" no ecrã
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess('Link copiado!');
        setTimeout(() => setCopySuccess(''), 2000);
      } catch (err) {
        console.error('Erro ao copiar (fallback):', err);
        setCopySuccess('Erro ao copiar.');
      }
      document.body.removeChild(textArea);
    }
  };

  if (!user) return <Navigate to="/login" />;
  if (isLoading) return <div className="p-6 text-center">A carregar pré-visualização...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Erro: {error.message}</div>;
  if (!event) return <div className="p-6 text-center">Evento não encontrado.</div>;

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Pré-visualização do Formulário</CardTitle>
              <CardDescription>{event.name}</CardDescription>
            </div>
            <Button variant="outline" onClick={handleCopyLink}>
              <Copy className="mr-2 h-4 w-4" />
              {copySuccess || 'Copiar Link Público'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 2. O "TRUQUE" PARA DESATIVAR O FORMULÁRIO */}
          {/* Envolvemos o formulário num div que "rouba" todos os cliques */}
          <div className="pointer-events-none opacity-70">
            <EventForm 
              fieldDefinitions={event.fieldDefinitions} 
              eventId={event.id}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EventRegistrationPreviewPage;