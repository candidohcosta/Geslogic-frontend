// frontend/src/components/devices/UptimeModal.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Monitor, Tv, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

interface UptimeDataHour {
    hour: number;
    percent: string; 
    scheduled: boolean;
}

interface UptimeModalProps {
    deviceName: string;
    deviceType: 'KIOSK' | 'DISPLAY';
    uptimePercent: string;
    hourlyData: UptimeDataHour[];
    days: number;
    onClose: () => void;
}

const UptimeModal: React.FC<UptimeModalProps> = ({ deviceName, deviceType, uptimePercent, hourlyData, days, onClose }) => {
    // 1. Verificação de segurança para não crashar se os dados falharem
    if (!hourlyData || !Array.isArray(hourlyData) || hourlyData.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
                 <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                    <CardContent className="p-8 text-center">
                        <h3 className="text-xl font-bold mb-2 text-gray-800">Sem Dados de Uptime</h3>
                        <p className="text-gray-500">Não existem logs de conexão suficientes para este período.</p>
                        <Button onClick={onClose} className="mt-4">Fechar</Button>
                    </CardContent>
                 </Card>
            </div>
        );
    }

    const periodLabel = days === 1 
        ? "Últimas 24 Horas" 
        : `Últimos ${days} Dias (Média horária)`;

    // 2. Preparar dados garantindo que são NÚMEROS (evita o erro .toFixed)
    const chartData = hourlyData.map(d => {
        const numericPercent = parseFloat(d.percent) || 0;
        return {
            hora: `${d.hour.toString().padStart(2, '0')}:00`,
            uptime: numericPercent,
            isScheduled: d.scheduled
        };
    });

    // 3. Cores
    const colorScheduled = '#10b981'; // Verde (Emerald 500)
    const colorUnscheduled = '#94a3b8'; // Cinza (Slate 400)

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <Card className="w-full max-w-4xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            {deviceType === 'KIOSK' ? <Monitor className="text-blue-600" /> : <Tv className="text-purple-600" />}
                            Relatório de Disponibilidade: {deviceName}
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>✕</Button>
                    </div>
                    <div className="flex items-center gap-6 mt-2">
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Uptime Total</p>
                            <p className="text-2xl font-mono font-bold text-green-600">{uptimePercent}</p>
                        </div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-semibold">Período de Análise</p>
                            <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                <Clock className="w-4 h-4" /> {periodLabel}
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="py-6">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="hora" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                />
                                <YAxis 
                                    domain={[0, 100]} 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickFormatter={(val) => `${val}%`}
                                />
                                {/* CORREÇÃO DO TOOLTIP: Verificação de tipo antes do toFixed */}
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    formatter={(value: any) => {
                                        const val = typeof value === 'number' ? value : parseFloat(value);
                                        return [`${val.toFixed(2)}%`, 'Disponibilidade'];
                                    }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="uptime" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.isScheduled ? colorScheduled : colorUnscheduled} 
                                            fillOpacity={entry.isScheduled ? 1 : 0.4}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorScheduled }} />
                            Horário Agendado
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="w-3 h-3 rounded-sm opacity-40" style={{ backgroundColor: colorUnscheduled }} />
                            Fora de Horário
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UptimeModal;