// src/hooks/useDrawerState.ts
import { useState, useCallback } from 'react';

export function useDrawerState<T = undefined>() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<T | undefined>(undefined);

  const openWith = useCallback((data?: T) => {
    setPayload(data);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPayload(undefined);
  }, []);

  return { open, payload, openWith, close, setOpen, setPayload };
}