// src/components/ui/InfoModal.tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';
import { Button } from './Button';

interface InfoModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ title, message, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent><p>{message}</p></CardContent>
        <CardFooter className="justify-end">
          <Button onClick={onConfirm}>OK</Button>
        </CardFooter>
      </Card>
    </div>
  );
};