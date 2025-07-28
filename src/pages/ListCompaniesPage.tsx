// frontend/src/pages/ListCompaniesPage.tsx
import React, { useState, useEffect } from 'react';
import { UserData } from '../types/user';

// Interface para os dados da empresa (simplificada para exibição)
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

interface ListCompaniesPageProps {
  user: UserData;
  onBack: () => void;
}

const ListCompaniesPage: React.FC<ListCompaniesPageProps> = ({ user, onBack }) => {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      // Apenas Platform Admins podem listar todas as empresas
      if (user.role !== 'PLATFORM_ADMIN') {
        setError('Acesso negado. Apenas administradores da plataforma podem listar empresas.');
        setLoading(false);
        return;
      }

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('Token de autenticação não encontrado.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/companies', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Falha ao carregar a lista de empresas.');
        }

        const data = await response.json();
        setCompanies(data.companies); // Assumindo que o backend retorna { message: ..., companies: [...] }
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar dados das empresas.');
        console.error('Erro ao buscar dados das empresas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [user]); // Dependência no objeto user para re-fetch se o user mudar

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md text-center flex-grow flex flex-col justify-center">
        <p className="text-gray-700">A carregar lista de empresas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md text-center flex-grow flex flex-col justify-center">
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

  return (
    <div className="p-6 max-w-full mx-auto bg-white rounded-xl shadow-md space-y-4 text-gray-800 flex-grow overflow-auto">
      <h2 className="text-2xl font-bold text-center mb-4">Listar Empresas</h2>
      <p className="text-center text-lg mb-6">Lista de todas as empresas registadas no sistema.</p>

      {companies.length === 0 ? (
        <p className="text-center text-gray-600">Nenhuma empresa encontrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NIF
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ativa
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criada Em
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {company.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.nif}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.isActive ? 'Sim' : 'Não'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Voltar ao Dashboard
      </button>
    </div>
  );
};

export default ListCompaniesPage;
