// src/pages/event-staff/EventStaffListPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEventStaff, updateEventStaff, fetchUserById, fetchEvents } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Checkbox } from '../../components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { EventStaffRole } from '../../types/user';

const EditEventStaffPage: React.FC = () => {
  const navigate = useNavigate();
  const { staffId } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();

  const urlCompanyId = new URLSearchParams(location.search).get('companyId');

  const isEditing = !!staffId;

  // Estados
  const [formData, setFormData] = useState({ 
      firstName: '', 
      lastName: '', 
      email: '', 
      password: '', 
      isActive: true 
  });
  
  // Estado para o Papel (Default: Checkin)
  const [staffRole, setStaffRole] = useState<EventStaffRole>(EventStaffRole.CHECKIN);
  const [assignedEventId, setAssignedEventId] = useState<string>('NONE'); // <--- NOVO
  const [companyId, setCompanyId] = useState<string | null>(urlCompanyId || null);

  const { data: staffData } = useQuery({
    queryKey: ['staff', staffId],
    queryFn: () => fetchUserById(staffId!),
    enabled: isEditing
  });

  // Precisamos do companyId. Se for edição, vem do staffData. Se for novo, vem do URL.
  const { data: events = [] } = useQuery({
    queryKey: ['events', companyId],
    queryFn: () => fetchEvents(companyId!),
    enabled: !!companyId
  });

  useEffect(() => {
    if (staffData) {
        setFormData({
            firstName: staffData.firstName,
            lastName: staffData.lastName,
            email: staffData.email,
            password: '',
            isActive: staffData.isActive
        });

        if (staffData.eventStaffDetails) {
            setStaffRole(staffData.eventStaffDetails.staffRole as EventStaffRole);
            setCompanyId(staffData.eventStaffDetails.company?.id); // Define a empresa para carregar os eventos
            
            // Carregar evento atribuído
            if (staffData.eventStaffDetails.assignedEvent) {
                setAssignedEventId(staffData.eventStaffDetails.assignedEvent.id);
            }
        }
    }
  }, [staffData]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
        const payload = {
            ...data,
            companyId,
            staffRole,
            // Só envia o evento se for CHECKIN e tiver escolhido um
            assignedEventId: (staffRole === EventStaffRole.CHECKIN && assignedEventId !== 'NONE') ? assignedEventId : null
        };
        
        return isEditing 
            ? updateEventStaff(staffId!, payload) 
            : createEventStaff(payload);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['eventStaff'] });
        navigate(-1);
    },
    onError: (err: any) => alert(err.message)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (staffRole === EventStaffRole.CHECKIN && assignedEventId === 'NONE') {
        alert("Por favor selecione um evento para este porteiro.");
        return;
    }
    mutation.mutate(formData);
  };


  return (
    <div className="p-6 max-w-2xl mx-auto">
        <Card>
            <CardHeader><CardTitle>{isEditing ? 'Editar Staff' : 'Novo Staff de Evento'}</CardTitle></CardHeader>
            <CardContent>
                <form id="staff-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label>Nome</Label><Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required /></div>
                        <div className="space-y-1"><Label>Apelido</Label><Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required /></div>
                    </div>
                    <div className="space-y-1"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required disabled={isEditing} /></div>
                    <div className="space-y-1"><Label>{isEditing ? 'Nova Password (Opcional)' : 'Password'}</Label><Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!isEditing} minLength={10} /></div>
                    
                    {/* FUNÇÃO */}
                    <div className="space-y-1 pt-2">
                        <Label>Função / Permissões</Label>
                        <Select value={staffRole} onValueChange={(v) => setStaffRole(v as EventStaffRole)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={EventStaffRole.CHECKIN}>Portaria (Apenas Check-in App)</SelectItem>
                                <SelectItem value={EventStaffRole.MANAGEMENT}>Gestão (Backoffice - Inscrições)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* EVENTO (Só aparece se for CHECKIN) */}
                    {staffRole === EventStaffRole.CHECKIN && (
                        <div className="space-y-1 bg-blue-50 p-3 rounded border border-blue-100 animate-in fade-in">
                            <Label className="text-blue-900">Evento Atribuído</Label>
                            <Select value={assignedEventId} onValueChange={setAssignedEventId}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o evento..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">-- Selecione --</SelectItem>
                                    {events.map((ev: any) => (
                                        <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-blue-600">Este utilizador será redirecionado automaticamente para a página de validação deste evento.</p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 pt-2"><Checkbox id="active" checked={formData.isActive} onCheckedChange={c => setFormData({...formData, isActive: Boolean(c)})} /><Label htmlFor="active">Ativo</Label></div>
                </form>
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
                <Button form="staff-form" type="submit" disabled={mutation.isPending}>Guardar</Button>
            </CardFooter>
        </Card>
    </div>
  );
};

export default EditEventStaffPage;