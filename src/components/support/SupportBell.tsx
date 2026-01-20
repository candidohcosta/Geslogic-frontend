//  frontend/src/components/support/SupportBell.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { checkSupportAttention } from '../../services/api';
import { LifeBuoy } from 'lucide-react';

const SupportBell: React.FC = () => {
  // Faz polling a cada 60s para não sobrecarregar, ou usa socket se quisermos (polling é ok aqui)
  const { data: hasAttention } = useQuery({
    queryKey: ['supportAttention'],
    queryFn: checkSupportAttention,
    refetchInterval: 30000, // Verifica a cada 30s
    retry: false,
  });

  return (
    <Link to="/support" className="relative p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors" title="Apoio ao Cliente">
      <LifeBuoy className={`h-6 w-6 ${hasAttention ? 'text-red-500 animate-pulse' : 'text-gray-600'}`} />
      
      {hasAttention && (
        <span className="absolute top-1 right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
    </Link>
  );
};

export default SupportBell;