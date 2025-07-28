// frontend/src/pages/Dashboard.tsx
import React from 'react';
import { UserData } from '../types/user';

interface DashboardProps {
  user: UserData;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4 text-center flex-grow flex flex-col justify-center">
      <h2 className="text-2xl font-bold text-gray-800">Bem-vindo, {user.firstName}!</h2>
      <p className="text-gray-700">Email: {user.email}</p>
      <p className="text-gray-700">Papel: {user.role}</p>
      {user.companyName && <p className="text-gray-700">Empresa: {user.companyName}</p>}
      <button
        onClick={onLogout}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Sair
      </button>
    </div>
  );
};

export default Dashboard;
