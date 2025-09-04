// src/components/dashboards/ParticipantDashboard.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import UpcomingRegistrationsWidget from './widgets/UpcomingRegistrationsWidget';
import SuggestedEventsWidget from './widgets/SuggestedEventsWidget';
import FavoriteCompaniesWidget from './widgets/FavoriteCompaniesWidget';

const ParticipantDashboard: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bem-vindo, {user?.firstName}!</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{/*         <Card>
          <CardHeader><CardTitle>As Minhas Próximas Inscrições</CardTitle></CardHeader>
          <CardContent><p>(Widget a ser implementado)</p></CardContent>
        </Card> */}
        <UpcomingRegistrationsWidget />
{/*         <Card>
          <CardHeader><CardTitle>Empresas Favoritas</CardTitle></CardHeader>
          <CardContent><p>(Widget a ser implementado)</p></CardContent>
        </Card> */}
        <SuggestedEventsWidget />
{/*         <Card>
          <CardHeader><CardTitle>Sugestões de Eventos</CardTitle></CardHeader>
          <CardContent><p>(Widget a ser implementado)</p></CardContent>
        </Card> */}
        <FavoriteCompaniesWidget />
      </div>
    </div>
  );
};
export default ParticipantDashboard;