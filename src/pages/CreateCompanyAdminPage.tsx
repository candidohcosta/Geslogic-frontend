// frontend/src/pages/CreateCompanyAdminPage.tsx
import React from 'react';
import { UserData } from '../types/user';

interface CreateCompanyAdminPageProps {
  user: UserData;
  onBack: () => void;
}

const CreateCompanyAdminPage: React.FC<CreateCompanyAdminPageProps> = ({ user, onBack }) => {
  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md space-y-4 text-gray-800 flex-grow flex flex-col justify-center">
      <h2 className="text-2xl font-bold text-center mb-4">Criar Novo Administrador de Empresa</h2>
      <p className="text-center text-lg">Esta é a página para criar um novo administrador de empresa.</p>
      <p className="text-center text-gray-600">Apenas administradores da plataforma podem aceder a esta funcionalidade.</p>
      <button
        onClick={onBack}
        className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Voltar ao Dashboard
      </button>
    </div>
  );
};

export default CreateCompanyAdminPage;
