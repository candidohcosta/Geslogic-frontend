// src/components/dashboards/admin-widgets/ActiveEventsWidget.tsx
// (Estrutura idêntica, com o ícone 'CalendarCheck' e o título 'Eventos Ativos')

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { CalendarCheck } from 'lucide-react';

interface ActiveEventsWidgetProps {
  count: number;
}
const ActiveEventsWidget: React.FC<ActiveEventsWidgetProps> = ({ count }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between ...">
      <CardTitle className="text-sm font-medium">Eventos Ativos</CardTitle>
      <CalendarCheck className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
  </Card>
);
export default ActiveEventsWidget;