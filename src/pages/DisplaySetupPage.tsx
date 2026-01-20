// src/pages/DisplaySetupPage.tsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const DisplaySetupPage: React.FC = () => {
  const { deviceSecret } = useParams<{ deviceSecret: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (deviceSecret) {
      console.log(`Configurando Display com a chave: ${deviceSecret}`);
      localStorage.setItem('displayDeviceSecret', deviceSecret);
      // Redireciona para a página de operação
      navigate('/run', { replace: true });
    }
  }, [deviceSecret, navigate]);

  return <div className="p-6 text-center">A configurar dispositivo...</div>;
};

export default DisplaySetupPage;