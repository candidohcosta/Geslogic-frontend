// src/components/dashboards/admin-widgets/TotalUserWidget.tsx
// (Estrutura idêntica, mas com o ícone 'Ticket' e o título 'Inscrições Totais')

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { User } from 'lucide-react';

interface TotalUserWidgetProps {
    total: number;
    count: number;
}
const TotalUserWidget: React.FC<TotalUserWidgetProps> = ({ total, count }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between ...">
      <CardTitle className="text-sm font-medium">Número total de utilizadores</CardTitle>
      <User className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent><div className="text-2xl font-bold">{total} \ {count}</div></CardContent>
  </Card>
);
export default TotalUserWidget;
