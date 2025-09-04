// src/components/dashboards/admin-widgets/TotalRegistrationsWidget.tsx
// (Estrutura idêntica, mas com o ícone 'Ticket' e o título 'Inscrições Totais')

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Ticket } from 'lucide-react';

interface TotalRegistrationsWidgetProps {
  count: number;
}
const TotalRegistrationsWidget: React.FC<TotalRegistrationsWidgetProps> = ({ count }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between ...">
      <CardTitle className="text-sm font-medium">Inscrições Totais</CardTitle>
      <Ticket className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
  </Card>
);
export default TotalRegistrationsWidget;
