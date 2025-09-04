// src/components/dashboards/admin-widgets/RecentEventsWidget.tsx

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/Button';

const RecentEventsWidget: React.FC<{ events: any[] }> = ({ events }) => (
  <Card>
    <CardHeader>
      <CardTitle>Últimos Eventos Criados</CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="space-y-2">
        {events.map(event => (
          <li key={event.id} className="flex justify-between items-center text-sm">
            <div>
              <p className="font-medium">{event.name}</p>
              <p className="text-muted-foreground">{event.company.name}</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/events/edit/${event.id}`}>Gerir</Link>
            </Button>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);
export default RecentEventsWidget;