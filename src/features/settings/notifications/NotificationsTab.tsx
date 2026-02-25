// src/features/settings/notifications/NotificationsTab.tsx
import React, { useEffect, useState } from 'react';
import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Switch } from '../../../components/ui/Switch';
import { Label } from '../../../components/ui/Label';

type Props = {
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
};

export default function NotificationsTab({ onHeaderActionsChange }: Props) {
  // ------ GLOBAL ------
  const [supportEmail, setSupportEmail] = useState('support@geslogic.pt');
  const [replyTo, setReplyTo] = useState('no-reply@geslogic.pt');
  const [includeSignature, setIncludeSignature] = useState(true);

  // ------ EVENTOS ------
  const [notifyNewTicket, setNotifyNewTicket] = useState(true);
  const [notifyTicketMessage, setNotifyTicketMessage] = useState(true);
  const [notifyTicketClosed, setNotifyTicketClosed] = useState(false);

  // ------ ACTIONS ------
  const onSave = () => {
    alert('Guardar notificações (exemplo).');
  };

  const onReset = () => {
    setSupportEmail('support@geslogic.pt');
    setReplyTo('no-reply@geslogic.pt');
    setIncludeSignature(true);
    setNotifyNewTicket(true);
    setNotifyTicketMessage(true);
    setNotifyTicketClosed(false);
  };

  useEffect(() => {
    onHeaderActionsChange?.(
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onReset}>Repor</Button>
        <Button onClick={onSave}>Guardar</Button>
      </div>
    );
  }, [onHeaderActionsChange]);

  // -----------------------------------------------------
  return (
    <>
      {/* Globais */}
      <SettingsSectionCard
        accent
        title="Configurações Globais"
        description="Definições gerais das notificações da plataforma."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Email de suporte</Label>
            <Input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
          </div>

          <div>
            <Label>Reply-To padrão</Label>
            <Input value={replyTo} onChange={e => setReplyTo(e.target.value)} />
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Switch checked={includeSignature} onCheckedChange={setIncludeSignature} />
            <Label>Incluir assinatura nos emails</Label>
          </div>
        </div>
      </SettingsSectionCard>

      {/* EVENTOS */}
      <SettingsSectionCard
        accent
        title="Notificações por Evento"
        description="Escolha que eventos devem gerar uma notificação."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={notifyNewTicket} onCheckedChange={setNotifyNewTicket} />
            <Label>Novo ticket criado</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={notifyTicketMessage} onCheckedChange={setNotifyTicketMessage} />
            <Label>Nova mensagem no ticket</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={notifyTicketClosed} onCheckedChange={setNotifyTicketClosed} />
            <Label>Ticket fechado</Label>
          </div>
        </div>
      </SettingsSectionCard>

      {/* TEMPLATES */}
      <SettingsSectionCard
        accent
        title="Templates de Notificação"
        description="Ir para o editor dos templates."
      >
        <div className="flex gap-3">
          <Button onClick={() => alert('Ir para Template: Novo Ticket')}>
            Template: Novo Ticket
          </Button>

          <Button onClick={() => alert('Ir para Template: Password Reset')}>
            Template: Password Reset
          </Button>
        </div>
      </SettingsSectionCard>
    </>
  );
}