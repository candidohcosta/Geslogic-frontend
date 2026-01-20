// frontend/src/pages/DisplaysListPage.tsx
import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDisplays, fetchCompanies, deleteDisplay, fetchAggregatedUptimeDetailed } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { PlusCircle, Edit, Trash2, Monitor, Activity, Building2, Tv } from 'lucide-react';
import { Label } from '../components/ui/Label';

interface SimpleCounterData { id: string; name: string; }

interface DisplayData {
  id: string;
  name: string;
  deviceSecret: string;
  layoutFormat: string;
  isActive: boolean;
  counters: SimpleCounterData[];
  isOnline?: boolean;
}

interface AggregatedUptimeDevice {
    id: string;
    type: 'KIOSK' | 'DISPLAY';
    totalUptimePercent: string;
    hourlyUptime: any[];
}

interface DisplayWithUptime extends DisplayData {
    totalUptimePercent: string;
    hourlyUptime: any[];
}

const DisplaysListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();
  const [uptimeDays, setUptimeDays] = useState('7');

  const selectedCompanyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: displays = [], isLoading } = useQuery<DisplayData[], Error>({
    queryKey: ['displays', selectedCompanyId],
    queryFn: () => fetchDisplays(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: uptimeData = [], isLoading: isLoadingUptime } = useQuery<AggregatedUptimeDevice[]>({
    queryKey: ['devicesUptimeDetailed', selectedCompanyId, uptimeDays],
    queryFn: () => fetchAggregatedUptimeDetailed(selectedCompanyId!, Number(uptimeDays)),
    enabled: !!selectedCompanyId,
  });

  const displaysWithUptime = useMemo(() => {
    const uptimeMap = new Map((uptimeData || []).filter(d => d.type === 'DISPLAY').map(d => [d.id, d]));
    
    return displays.map(display => {
      const uptimeInfo = uptimeMap.get(display.id);
      return {
        ...display,
        totalUptimePercent: uptimeInfo?.totalUptimePercent || '0.00%',
        hourlyUptime: uptimeInfo?.hourlyUptime || []
      } as DisplayWithUptime;
    });
  }, [displays, uptimeData]);

  const { mutate: deleteDisplayMutate } = useMutation({
    mutationFn: deleteDisplay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['displays', selectedCompanyId] });
    },
  });

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Tv className="w-6 h-6" /> Displays Públicos</CardTitle>
              <CardDescription>Gira os ecrãs de chamada de senhas.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {user.role === UserRole.PLATFORM_ADMIN && (
                <Select value={selectedCompanyId} onValueChange={(id) => navigate(`/displays/company/${id}`)}>
                  <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {selectedCompanyId && (
                <Button asChild><Link to={`/displays/new?companyId=${selectedCompanyId}`}><PlusCircle className="mr-2 h-4 w-4"/> Adicionar</Link></Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
             <div className="flex items-center gap-2">
                <Label className="text-sm">Uptime ({uptimeDays}d):</Label>
                <Select value={uptimeDays} onValueChange={setUptimeDays}>
                  <SelectTrigger className="w-24 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="1">1D</SelectItem><SelectItem value="7">7D</SelectItem><SelectItem value="30">30D</SelectItem></SelectContent>
                </Select>
              </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Balcões</TableHead>
                  <TableHead className="text-center">Uptime</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displaysWithUptime.map((display: DisplayWithUptime) => (
                  <TableRow key={display.id}>
                    <TableCell className="font-medium">{display.name}</TableCell>
                    <TableCell className="text-xs">{display.counters?.map(c => c.name).join(', ') || 'Nenhum'}</TableCell>
                    <TableCell className="text-center font-bold text-green-700">{display.totalUptimePercent}</TableCell>
                    <TableCell className="text-center">
                        <div className={`w-3 h-3 mx-auto rounded-full ${display.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/displays/edit/${display.id}`} className="inline-flex mr-2 text-gray-400 hover:text-gray-600"><Edit className="h-4 w-4"/></Link>
                      <button onClick={() => deleteDisplayMutate(display.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default DisplaysListPage;