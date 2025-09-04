// src/components/dashboards/widgets/UpcomingRegistrationsWidget.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUpcomingRegistrations } from '../../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/Button';

const UpcomingRegistrationsWidget: React.FC = () => {
  const { data: registrations = [], isLoading, error } = useQuery({
    queryKey: ['upcomingRegistrations'],
    queryFn: fetchUpcomingRegistrations,
  });

  if (isLoading) return <Card><CardContent>A carregar...</CardContent></Card>;
  if (error) return <Card><CardContent className="text-red-500">Erro ao carregar.</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>As Minhas Próximas Inscrições</CardTitle>
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <p className="text-muted-foreground">Não tem inscrições para eventos futuros.</p>
        ) : (
          <ul className="space-y-4">
            {registrations.slice(0, 3).map((reg: any) => (
              <li key={reg.id} className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{reg.event.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(reg.event.startDate).toLocaleDateString()} - {reg.status}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/evento/${reg.event.id}`}>Ver Evento</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {registrations.length > 3 && (
          <div className="text-center mt-4">
            <Button variant="link" asChild>
              <Link to="/app/my-registrations">Ver todas as inscrições...</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingRegistrationsWidget;