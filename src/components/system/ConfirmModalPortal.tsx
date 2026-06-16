// src/components/system/ConfirmModalPortal.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { ConfirmModal } from '../ui/ConfirmModal';

type Payload = {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  resolve: (v: boolean) => void;
};

export const ConfirmModalPortal: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [payload, setPayload] = React.useState<Payload | null>(null);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as Payload;
      setPayload(d);
      setOpen(true);
    };
    window.addEventListener('app:showConfirmDialog' as any, handler as EventListener);
    return () => window.removeEventListener('app:showConfirmDialog' as any, handler as EventListener);
  }, []);

  if (!open || !payload) return null;

  const handle = (result: boolean) => {
    payload.resolve(result);
    setOpen(false);
    setPayload(null);
  };

  const modal = (
    <ConfirmModal
      title={payload.title}
      message={payload.message}
      confirmText={payload.confirmText}
      cancelText={payload.cancelText}
      onConfirm={() => handle(true)}
      onCancel={() => handle(false)}
    />
  );

  return ReactDOM.createPortal(
    modal,
    document.getElementById('global-modal-root') as HTMLElement
  );

};