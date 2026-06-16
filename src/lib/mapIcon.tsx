// src/lib/mapIcon.tsx
import * as Lucide from 'lucide-react';

export function mapIcon(name?: string) {
  if (!name) return null;
  const Cmp = (Lucide as any)[name];
  if (!Cmp) return null;
  return <Cmp className="w-4 h-4" />;
}