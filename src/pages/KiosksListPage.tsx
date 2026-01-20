// frontend/src/pages/KiosksListPage.tsx (VERSÃO FINAL E CORRIGIDA)

import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchKiosks, fetchCompanies, deleteKiosk, fetchAggregatedUptimeDetailed } from '../services/api';
import { UserRole } from '../types/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { PlusCircle, Edit, Trash2, Monitor, Activity, Building2, Tablet } from 'lucide-react';
import { Label } from '../components/ui/Label';

// --- INTERFACES ---
interface SimpleServiceData { id: string; name: string; }

interface KioskData {
  id: string;
  name: string;
  deviceSecret: string;
  isActive: boolean;
  services: SimpleServiceData[];
  isOnline?: boolean;
}

interface AggregatedUptimeDevice {
    id: string;
    type: 'KIOSK' | 'DISPLAY';
    totalUptimePercent: string;
    hourlyUptime: any[];
}

interface KioskWithUptime extends KioskData {
    totalUptimePercent: string;
    hourlyUptime: any[];
}

const KiosksListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId: companyIdFromUrl } = useParams<{ companyId?: string }>();
  const [uptimeDays, setUptimeDays] = useState('7');

  const selectedCompanyId = user?.role === UserRole.PLATFORM_ADMIN ? companyIdFromUrl : user?.company?.id;
  const [kioskToDelete, setKioskToDelete] = useState<KioskData | null>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: user?.role === UserRole.PLATFORM_ADMIN,
  });

  const { data: kiosks = [], isLoading } = useQuery<KioskData[], Error>({
    queryKey: ['kiosks', selectedCompanyId],
    queryFn: () => fetchKiosks(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: uptimeData = [], isLoading: isLoadingUptime } = useQuery<AggregatedUptimeDevice[]>({
    queryKey: ['devicesUptimeDetailed', selectedCompanyId, uptimeDays],
    queryFn: () => fetchAggregatedUptimeDetailed(selectedCompanyId!, Number(uptimeDays)),
    enabled: !!selectedCompanyId,
  });

  const kiosksWithUptime = useMemo(() => {
    const uptimeMap = new Map((uptimeData || []).map((d: any) => [d.id, d]));
    
    return kiosks.map(kiosk => {
      const uptimeInfo = uptimeMap.get(kiosk.id);
      return {
        ...kiosk,
        totalUptimePercent: uptimeInfo?.totalUptimePercent || '0.00%',
        hourlyUptime: uptimeInfo?.hourlyUptime || [] // Corrigido: Agora incluído
      } as KioskWithUptime;
    });
  }, [kiosks, uptimeData]);

  const { mutate: deleteKioskMutate, isPending: isDeleting } = useMutation({
    mutationFn: deleteKiosk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosks', selectedCompanyId] });
      setKioskToDelete(null);
    },
  });

  if (!user || (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.COMPANY_ADMIN)) return <Navigate to="/dashboard" />;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Tablet className="w-6 h-6" /> Quiosques</CardTitle>
              <CardDescription>Gira os dispositivos de emissão de senhas.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {user.role === UserRole.PLATFORM_ADMIN && (
                <Select value={selectedCompanyId} onValueChange={(id) => navigate(`/kiosks/company/${id}`)}>
                  <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {selectedCompanyId && (
                <Button asChild><Link to={`/kiosks/new?companyId=${selectedCompanyId}`}><PlusCircle className="mr-2 h-4 w-4"/> Adicionar</Link></Button>
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
                  <TableHead>Serviços</TableHead>
                  <TableHead className="text-center">Uptime</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kiosksWithUptime.map((kiosk: KioskWithUptime) => (
                  <TableRow key={kiosk.id}>
                    <TableCell className="font-medium">{kiosk.name}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{kiosk.services?.map(s => s.name).join(', ') || 'Nenhum'}</TableCell>
                    <TableCell className="text-center font-bold text-green-700">{kiosk.totalUptimePercent}</TableCell>
                    <TableCell className="text-center">
                        <div className={`w-3 h-3 mx-auto rounded-full ${kiosk.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/kiosks/edit/${kiosk.id}`} className="inline-flex mr-2 text-gray-400 hover:text-gray-600"><Edit className="h-4 w-4"/></Link>
                      <button onClick={() => setKioskToDelete(kiosk)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
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

export default KiosksListPage;