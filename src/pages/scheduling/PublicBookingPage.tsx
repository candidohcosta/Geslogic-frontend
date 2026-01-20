// frontend/src/pages/scheduling/PublicBookingPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
// Importar as funções nomeadas
import { fetchPublicProfile, createPublicAppointment } from '../../services/api'; 
import { BookingCalendar } from '../../components/scheduling/BookingCalendar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { CheckCircle2, Clock, MapPin, KeyRound, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const PublicBookingPage: React.FC = () => {
  const { companySlug, profileSlug } = useParams(); 
  const fullSlug = `${companySlug}/${profileSlug}`;

  // Estado para guardar o resultado do agendamento (que traz o código)
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Dados do Formulário
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', nif: ''
  });

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['publicProfile', fullSlug],
    queryFn: () => fetchPublicProfile(fullSlug),
    enabled: !!companySlug && !!profileSlug,
  });

  // --- LÓGICA DE LOCALIZAÇÃO ---
  const getLocations = () => {
    if (!profile?.assignableResources) return [];
    // Extrai nomes únicos, ignorando vazios
    const locs = Array.from(new Set(
        profile.assignableResources
            .map((r: any) => r.locationName)
            .filter((l: any) => l) 
    ));
    return locs as string[];
  };

  const locations = getLocations();
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(undefined);

  // Estados do Wizard: LOCATION -> CALENDAR -> FORM -> SUCCESS
  const [step, setStep] = useState<'LOCATION' | 'CALENDAR' | 'FORM' | 'SUCCESS'>('LOCATION');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Efeito para saltar o passo de localização se não for necessário
  useEffect(() => {
    if (profile && step === 'LOCATION') {
        const locs = getLocations();
        // Se só há uma ou nenhuma, seleciona automaticamente e avança
        if (locs.length <= 1) {
            setSelectedLocation(locs[0]); 
            setStep('CALENDAR');
        }
    }
  }, [profile, step]); // Dependências do efeito

  const mutation = useMutation({
    mutationFn: createPublicAppointment,
    onSuccess: (data) => {
      setBookingResult(data); 
      setStep('SUCCESS');
    },
    onError: (err: any) => alert('Erro ao agendar: ' + err.message)
  });

  const handleSlotSelect = (date: Date) => {
    setSelectedDate(date);
    setStep('FORM');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedDate) return;

    mutation.mutate({
      profileId: profile.id,
      startTime: selectedDate.toISOString(),
      guestName: formData.name,
      guestEmail: formData.email,
      guestPhone: formData.phone,
      guestNif: formData.nif
    });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">A carregar...</div>;
  if (error || !profile) return <div className="min-h-screen flex items-center justify-center text-red-500">Serviço não encontrado.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      
      <Card className="w-full max-w-4xl shadow-lg border-t-4 border-t-blue-600">
        
        {/* SUCESSO */}
        {step === 'SUCCESS' && bookingResult ? (
            <div className="p-12 text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Agendamento Confirmado!</h1>
                  <p className="text-gray-600 max-w-md mx-auto mt-2">
                      O seu agendamento para <strong>{profile.name}</strong> ficou registado para o dia <strong>{format(selectedDate!, "d 'de' MMMM 'às' HH:mm", { locale: pt })}</strong>.
                  </p>
                </div>

                {/* --- CÓDIGO DE CHECK-IN --- */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-sm mx-auto">
                    <p className="text-sm text-blue-800 font-semibold mb-2 flex items-center justify-center gap-2">
                        <KeyRound className="w-4 h-4" /> CÓDIGO DE CHECK-IN
                    </p>
                    <div className="text-4xl font-mono font-bold tracking-widest text-blue-900 bg-white py-4 rounded-lg shadow-sm border border-blue-100">
                        {bookingResult.checkInCode}
                    </div>
                    <p className="text-xs text-blue-600 mt-3">
                        Utilize este código no Quiosque quando chegar.
                    </p>
                </div>
                
                <div className="pt-6">
                    <Button onClick={() => window.location.reload()}>Agendar Outro</Button>
                </div>
            </div>
        ) : (
            <div className="flex flex-col md:flex-row min-h-[500px]">
                
                {/* COLUNA ESQUERDA: INFO */}
                <div className="md:w-1/3 bg-gray-50 p-6 border-r border-gray-100 flex flex-col justify-between">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                            <p className="text-sm text-gray-500 mt-1">{profile.description}</p>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span>{profile.durationMinutes} minutos</span>
                            </div>
                            
                            {/* Mostra a Localização se estiver selecionada */}
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <span>
                                    {selectedLocation || 'Presencial'}
                                </span> 
                            </div>
                        </div>
                    </div>

                    {/* Resumo da Data Escolhida */}
                    {selectedDate && (
                        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Data Escolhida</div>
                            <div className="text-lg font-bold text-gray-900">
                                {format(selectedDate, "d 'de' MMMM", { locale: pt })}
                            </div>
                            <div className="text-2xl text-blue-700 font-mono">
                                {format(selectedDate, "HH:mm")}
                            </div>
                            {step === 'FORM' && (
                                <Button variant="link" size="sm" className="px-0 mt-2 h-auto text-blue-600" onClick={() => setStep('CALENDAR')}>
                                    Alterar Data
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA: PASSOS */}
                <div className="flex-1 p-6">
                    
                    {/* PASSO 1: ESCOLHA DE LOCALIZAÇÃO */}
                    {step === 'LOCATION' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-semibold mb-6">Onde deseja ser atendido?</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {locations.map(loc => (
                                    <Button 
                                        key={loc} 
                                        variant="outline" 
                                        className="h-16 text-lg justify-start px-6 border-2 hover:border-blue-500 hover:bg-blue-50 transition-all"
                                        onClick={() => {
                                            setSelectedLocation(loc);
                                            setStep('CALENDAR');
                                        }}
                                    >
                                        <MapPin className="w-5 h-5 mr-3 text-blue-600" />
                                        {loc}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PASSO 2: CALENDÁRIO */}
                    {step === 'CALENDAR' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 mb-6">
                                {/* Botão Voltar (Só aparece se houver múltiplas localizações) */}
                                {locations.length > 1 && (
                                    <Button variant="ghost" size="icon" onClick={() => setStep('LOCATION')}>
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>
                                )}
                                <h3 className="text-lg font-semibold">Selecione uma Data e Hora</h3>
                            </div>
                            
                            <BookingCalendar 
                                profileId={profile.id}
                                location={selectedLocation} // <--- Passar a localização ao componente
                                onSelectSlot={handleSlotSelect} 
                            />
                        </div>
                    )}

                    {/* PASSO 3: FORMULÁRIO */}
                    {step === 'FORM' && (
                        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-semibold mb-6">Os seus dados</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label>Nome Completo</Label>
                                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Email</Label>
                                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label>Telemóvel</Label>
                                        <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>NIF (Opcional)</Label>
                                        <Input value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} />
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-3">
                                    <Button type="button" variant="outline" onClick={() => setStep('CALENDAR')} className="flex-1">
                                        Voltar
                                    </Button>
                                    <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                                        {mutation.isPending ? 'A Confirmar...' : 'Confirmar Agendamento'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        )}
      </Card>
    </div>
  );
};

export default PublicBookingPage;