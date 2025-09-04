// frontend/src/pages/MyRegistrationsPage.tsx (VERSÃO COMPLETA)

import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchMyRegistrations } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Eye } from 'lucide-react';
import { RegistrationStatus, MyRegistrationData } from '../types/event';
import { Button } from '../components/ui/Button';

const MyRegistrationsPage: React.FC = () => {
  const { user } = useAuth();
  
  // 1. NOVO ESTADO PARA O FILTRO
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  // 2. A QUERY AGORA REAGE À MUDANÇA DE FILTRO
  const { data: registrations = [], isLoading, error } = useQuery<MyRegistrationData[], Error>({
    queryKey: ['myRegistrations', user?.id, filter],
    queryFn: () => fetchMyRegistrations(filter),
    enabled: !!user,
  });

  if (!user) return <Navigate to="/login" />;
  if (isLoading) return <div className="p-6 text-center">A carregar as suas inscrições...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{(error as Error).message}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>As Minhas Inscrições</CardTitle>
        <CardDescription>O seu histórico de inscrições em eventos na plataforma.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 3. OS BOTÕES DE FILTRO */}
        <div className="flex space-x-2 mb-4">
          <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Todas</Button>
          <Button variant={filter === 'upcoming' ? 'default' : 'outline'} onClick={() => setFilter('upcoming')}>Próximas</Button>
          <Button variant={filter === 'past' ? 'default' : 'outline'} onClick={() => setFilter('past')}>Passadas</Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Data de Inscrição</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">Nenhuma inscrição encontrada para este filtro.</TableCell>
                </TableRow>
              ) : (
                registrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{reg.event.name}</TableCell>
                    <TableCell>{reg.event.company.name}</TableCell>
                    <TableCell>{new Date(reg.registrationDate).toLocaleDateString()}</TableCell>
                    <TableCell>{reg.status}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild title="Ver Evento">
                        <Link to={`/evento/${reg.event.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyRegistrationsPage;