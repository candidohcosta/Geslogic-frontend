// src/components/dashboards/widgets/FavoriteCompaniesWidget.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMyFavoriteCompanies } from '../../../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/Button';

// Interface para a "forma" dos dados que a API devolve
interface FavoriteCompanyData {
  id: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
}

const FavoriteCompaniesWidget: React.FC = () => {
  const { data: favorites = [], isLoading, error } = useQuery<FavoriteCompanyData[], Error>({
    queryKey: ['myFavoriteCompanies'],
    queryFn: fetchMyFavoriteCompanies,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Empresas que Segue</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">A carregar...</p>}
        {error && <p className="text-red-500">{(error as Error).message}</p>}
        
        {!isLoading && !error && favorites.length === 0 && (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-2">Ainda não segue nenhuma empresa.</p>
            <CardDescription>Visite a página de uma empresa para a começar a seguir.</CardDescription>
          </div>
        )}
        
        {!isLoading && !error && favorites.length > 0 && (
          <ul className="space-y-3">
            {favorites.map((fav) => (
              <li key={fav.id} className="flex justify-between items-center">
                <p className="font-semibold">{fav.company.name}</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/companies/${fav.company.slug}`}>Visitar</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default FavoriteCompaniesWidget;