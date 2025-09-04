// src/components/dashboards/admin-widgets/NewCompaniesWidget.tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Building } from 'lucide-react';

interface NewCompaniesWidgetProps {
  count: number;
  total: number;
}
const NewCompaniesWidget: React.FC<NewCompaniesWidgetProps> = ({ count , total }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between ...">
      <CardTitle className="text-sm font-medium">Total de Empresas / (7 dias)</CardTitle>
      <Building className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent><div className="text-2xl font-bold">{total} / {count}</div></CardContent>
  </Card>
);
export default NewCompaniesWidget;