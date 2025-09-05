// frontend/src/pages/PolicyDocumentsPage.tsx

import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchPolicies } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { FilePenLine, PlusCircle } from 'lucide-react';

// Interface para os dados
interface PolicyData {
  id: string;
  name: string;
  consentText: string;
  company: { id: string; name: string } | null;
}

const PolicyDocumentsPage: React.FC = () => {
  const { user } = useAuth();

  const { data: policies = [], isLoading, error } = useQuery<PolicyData[], Error>({
    queryKey: ['policies'],
    queryFn: fetchPolicies,
  });

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestão de Políticas de Privacidade</CardTitle>
          <CardDescription>Crie e gira os documentos de consentimento.</CardDescription>
        </div>
        <Button asChild>
          <Link to="/policy-documents/new"><PlusCircle className="mr-2 h-4 w-4" /> Criar Nova</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <p>A carregar políticas...</p>}
        {error && <p className="text-red-500">{(error as Error).message}</p>}
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Texto de Consentimento</TableHead>
                <TableHead>Âmbito</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy: PolicyData) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.name}</TableCell>
                  <TableCell className="max-w-md truncate">{policy.consentText}</TableCell>
                  <TableCell>{policy.company ? policy.company.name : 'Plataforma'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild title="Editar">
                      <Link to={`/policy-documents/edit/${policy.id}`}><FilePenLine className="h-4 w-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolicyDocumentsPage;