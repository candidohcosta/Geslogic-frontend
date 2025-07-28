// frontend/src/pages/EditProfilePage.tsx
import React from 'react';
import { UserData } from '../types/user';

interface EditProfilePageProps {
  user: UserData;
  onBack: () => void;
}

const EditProfilePage: React.FC<EditProfilePageProps> = ({ user, onBack }) => {
  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4 flex-grow flex flex-col justify-center">
      <h2 className="text-2xl font-bold text-gray-800 text-center">Editar Perfil</h2>
      <p className="text-gray-700 text-center">Aqui você pode ver e editar os seus dados pessoais.</p>

      <div className="space-y-2 text-left">
        <p><span className="font-semibold">ID:</span> {user.id}</p>
        <p><span className="font-semibold">Primeiro Nome:</span> {user.firstName}</p>
        <p><span className="font-semibold">Último Nome:</span> {user.lastName}</p>
        <p><span className="font-semibold">Email:</span> {user.email}</p>
        <p><span className="font-semibold">Papel:</span> {user.role}</p>
        <p><span className="font-semibold">Criado em:</span> {new Date(user.createdAt).toLocaleString()}</p>
        <p><span className="font-semibold">Atualizado em:</span> {new Date(user.updatedAt).toLocaleString()}</p>
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

export default EditProfilePage;
