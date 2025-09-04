// src/components/dashboards/admin-widgets/RecentCompaniesWidget.tsx

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/Button';

const RecentCompaniesWidget: React.FC<{ companies: any[] }> = ({ companies }) => (
  <Card>
    <CardHeader>
      <CardTitle>Últimas Empresas Registadas</CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="space-y-2">
        {companies.map(company => (
          <li key={company.id} className="flex justify-between items-center text-sm">
            <span>{company.name}</span>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/companies/edit/${company.id}`}>Gerir</Link>
            </Button>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);
export default RecentCompaniesWidget;