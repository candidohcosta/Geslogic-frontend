// src/components/system/InfoModalPortal.tsx
import React from 'react';
import { InfoModal } from '../ui/InfoModal';

type InfoEvent = {
  title?: string;
  message: string;
};

export const InfoModalPortal: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<Required<InfoEvent>>({
    title: 'GesLogic — Operador',
    message: '',
  });

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<InfoEvent>).detail;
      setState({
        title: detail?.title || 'GesLogic — Operador',
        message: detail?.message || '',
      });
      setOpen(true);
    };
    window.addEventListener('app:showInfoDialog', handler as EventListener);
    return () => window.removeEventListener('app:showInfoDialog', handler as EventListener);
  }, []);

  if (!open) return null;

  return (
    <InfoModal
      title={state.title}
      message={state.message}
      onConfirm={() => setOpen(false)}
    />
  );
};