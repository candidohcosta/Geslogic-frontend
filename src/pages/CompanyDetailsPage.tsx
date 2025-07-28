// frontend/src/pages/CompanyDetailsPage.tsx
import React, { useState, useEffect } from 'react';
import { UserData } from '../types/user';

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  email: string;
  nif: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CompanyDetailsPageProps {
  user: UserData;
  onBack: () => void;
}

const CompanyDetailsPage: React.FC<CompanyDetailsPageProps> = ({ user, onBack }) => {
  const [companyDetails, setCompanyDetails] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (user.role !== 'COMPANY_ADMIN') {
        setError('Acesso negado. Apenas administradores de empresa podem ver esta página.');
        setLoading(false);
        return;
      }

      if (!user.companyId) {
        setError('Nenhum ID de empresa associado a este utilizador.');
        setLoading(false);
        return;
      }

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('Token de autenticação não encontrado.');
        setLoading(false);
        return;
      }

      // REMOVIDO: user.companySlug não é mais estritamente necessário para esta rota,
      // pois o backend usa user.companyId do token.
      // if (!user.companySlug) {
      //   setError('Slug da empresa não encontrado para o utilizador logado.');
      //   setLoading(false);
      //   return;
      // }

      try {
        const response = await fetch(`http://localhost:3000/companies/my-details`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            // REMOVIDO: O cabeçalho 'X-Company-Slug' não é mais necessário para este endpoint
            // 'X-Company-Slug': user.companySlug,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Falha ao carregar os dados da empresa.');
        }

        const data = await response.json();
        setCompanyDetails(data.company);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados da empresa.');
        console.error('Erro ao buscar dados da empresa:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md text-center flex-grow flex flex-col justify-center">
        <p className="text-gray-700">A carregar dados da empresa...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md text-center flex-grow flex flex-col justify-center">
        <p className="text-red-600">Erro: {error}</p>
        <button
          onClick={onBack}
          className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!companyDetails) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md text-center flex-grow flex flex-col justify-center">
        <p className="text-gray-700">Nenhum dado de empresa disponível.</p>
        <button
          onClick={onBack}
          className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4 flex-grow flex flex-col justify-center">
      <h2 className="text-2xl font-bold text-gray-800 text-center">Dados da Empresa</h2>
      <p className="text-gray-700 text-center">Informações detalhadas sobre a sua empresa.</p>

      <div className="space-y-2 text-left">
        <p><span className="font-semibold">ID:</span> {companyDetails.id}</p>
        <p><span className="font-semibold">Nome:</span> {companyDetails.name}</p>
        <p><span className="font-semibold">Slug:</span> {companyDetails.slug}</p>
        <p><span className="font-semibold">Email:</span> {companyDetails.email}</p>
        <p><span className="font-semibold">NIF:</span> {companyDetails.nif}</p>
        <p><span className="font-semibold">Ativa:</span> {companyDetails.isActive ? 'Sim' : 'Não'}</p>
        <p><span className="font-semibold">Criada em:</span> {new Date(companyDetails.createdAt).toLocaleString()}</p>
        <p><span className="font-semibold">Atualizada em:</span> {new Date(companyDetails.updatedAt).toLocaleString()}</p>
      </div>
      
      <div className="mt-6">
        <button
          onClick={onBack}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Voltar
        </button>
      </div>
    </div>
  );
};

export default CompanyDetailsPage;
