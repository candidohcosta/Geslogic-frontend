// src/components/dashboards/widgets/SuggestedEventsWidget.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSuggestedEvents } from '../../../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/Button';

// Usamos a interface 'EventData' que já temos
import { EventData } from '../../../types/event';

const SuggestedEventsWidget: React.FC = () => {
  const { data: events = [], isLoading, error } = useQuery<EventData[], Error>({
    queryKey: ['suggestedEvents'],
    queryFn: fetchSuggestedEvents,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sugestões Para Si</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">A procurar eventos...</p>}
        {error && <p className="text-red-500">{(error as Error).message}</p>}
        
        {!isLoading && !error && events.length === 0 && (
          <p className="text-muted-foreground">
            Não encontrámos sugestões de eventos na sua área de momento.
          </p>
        )}
        
        {!isLoading && !error && events.length > 0 && (
          <ul className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{event.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.location} - {new Date(event.startDate).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/evento/${event.id}`}>Ver Detalhes</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default SuggestedEventsWidget;