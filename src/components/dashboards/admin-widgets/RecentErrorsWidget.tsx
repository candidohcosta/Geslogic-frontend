// src/components/dashboards/admin-widgets/RecentErrorsWidget.tsx

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Table, TableBody, TableCell, TableRow } from '../../ui/Table';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

// 1. A INTERFACE QUE DEFINE AS PROPS
interface RecentErrorLog {
  id: string;
  timestamp: string;
  message: string;
  user: string;
}

interface RecentErrorsWidgetProps {
  logs: RecentErrorLog[]; // O componente espera receber um array de 'logs'
}

const RecentErrorsWidget: React.FC<RecentErrorsWidgetProps> = ({ logs }) => {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4"> {/* Ocupa a largura toda */}
      <CardHeader>
        <CardTitle>Últimos Logs de Erro</CardTitle>
        <CardDescription>
          Os erros mais recentes registados no sistema.
          <Link to="/logs" className="text-indigo-600 hover:underline ml-2">Ver todos</Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {logs && logs.length > 0 ? (
              logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-3 flex-shrink-0" />
                      <span className="font-medium truncate">{log.message}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell>Nenhum erro recente. Tudo a funcionar!</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RecentErrorsWidget;