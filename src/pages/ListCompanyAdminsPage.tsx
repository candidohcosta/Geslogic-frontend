// frontend/src/pages/ListCompanyAdminsPage.tsx
import React, { useState, useEffect } from 'react';
import { UserData } from '../types/user';

// Interface para os dados do Company Admin (simplificada para exibição)
interface CompanyAdminData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string; // Deve ser 'COMPANY_ADMIN'
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company?: { // A empresa associada (opcional, pois pode não vir em todos os cenários)
    id: string;
    name: string;
    slug: string;
  };
}

interface ListCompanyAdminsPageProps {
  user: UserData;
  onBack: () => void;
}

const ListCompanyAdminsPage: React.FC<ListCompanyAdminsPageProps> = ({ user, onBack }) => {
  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyAdmins = async () => {
      // Apenas Platform Admins podem listar todos os Company Admins
      if (user.role !== 'PLATFORM_ADMIN') {
        setError('Acesso negado. Apenas administradores da plataforma podem listar administradores de empresa.');
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
        const response = await fetch('http://localhost:3000/company-admin-users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Falha ao carregar a lista de administradores de empresa.');
        }

        const data = await response.json();
        setCompanyAdmins(data); // Assumindo que o backend retorna diretamente o array de Company Admins
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar dados dos administradores de empresa.');
        console.error('Erro ao buscar dados dos administradores de empresa:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyAdmins();
  }, [user]); // Dependência no objeto user para re-fetch se o user mudar

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md text-center flex-grow flex flex-col justify-center">
        <p className="text-gray-700">A carregar lista de administradores de empresa...</p>
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
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full mx-auto bg-white rounded-xl shadow-md space-y-4 text-gray-800 flex-grow overflow-auto">
      <h2 className="text-2xl font-bold text-center mb-4">Listar Administradores de Empresa</h2>
      <p className="text-center text-lg mb-6">Lista de todos os administradores de empresa registados no sistema.</p>

      {companyAdmins.length === 0 ? (
        <p className="text-center text-gray-600">Nenhum administrador de empresa encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empresa
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ativo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado Em
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companyAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {admin.firstName} {admin.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {admin.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {admin.company ? admin.company.name : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {admin.isActive ? 'Sim' : 'Não'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(admin.createdAt).toLocaleDateString()}
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

export default ListCompanyAdminsPage;
