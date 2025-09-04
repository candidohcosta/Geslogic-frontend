// src/components/dashboards/CompanyAdminDashboard.tsx
import React from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';

const CompanyAdminDashboard: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard do Administrador de Empresa</CardTitle>
      </CardHeader>
      {/* TODO: Adicionar widgets de estatísticas da empresa */}
    </Card>
  );
};
export default CompanyAdminDashboard;