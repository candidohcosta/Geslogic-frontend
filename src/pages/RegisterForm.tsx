// frontend/src/pages/RegisterForm.tsx
import React, { useState } from 'react';
import { UserData } from '../types/user'; // Importar UserData

interface RegisterFormProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'PARTICIPANT', // Hardcoded to PARTICIPANT
    participantDetails: {
      phone: '',
      taxNumber: '',
      dateOfBirth: '',
      citizenCardNumber: '',
      addressStreet: '',
      addressNumber: '',
      addressComplement: '',
      addressPostalCode: '',
      addressCity: '',
      addressCountry: '',
    },
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('participantDetails.')) {
      const detailField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        participantDetails: {
          ...prev.participantDetails,
          [detailField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    const payload: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      role: 'PARTICIPANT', // Always send PARTICIPANT role
      participantDetails: formData.participantDetails, // Always send participant details
    };

    try {
      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Registo bem-sucedido! Por favor, verifique o seu email para ativar a sua conta.');
        onRegisterSuccess();
      } else {
        setMessage(data.message || 'Erro no registo.');
      }
    } catch (error) {
      setMessage('Erro de rede ou servidor.');
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md space-y-4 flex-grow flex flex-col justify-center">
      <h2 className="text-2xl font-bold text-center text-gray-800">Registo</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Primeiro Nome:</label>
          <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Último Nome:</label>
          <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password:</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        
        <div className="md:col-span-2 space-y-4 border-t pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="text-xl font-semibold text-gray-700 col-span-full">Detalhes do Participante</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone:</label>
            <input type="text" name="participantDetails.phone" value={formData.participantDetails.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Número de Contribuinte:</label>
            <input type="text" name="participantDetails.taxNumber" value={formData.participantDetails.taxNumber} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Nascimento (AAAA-MM-DD):</label>
            <input type="date" name="participantDetails.dateOfBirth" value={formData.participantDetails.dateOfBirth} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Número Cartão de Cidadão:</label>
            <input type="text" name="participantDetails.citizenCardNumber" value={formData.participantDetails.citizenCardNumber} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-sm shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Rua:</label>
            <input type="text" name="participantDetails.addressStreet" value={formData.participantDetails.addressStreet} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Número da Porta:</label>
            <input type="text" name="participantDetails.addressNumber" value={formData.participantDetails.addressNumber} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Complemento (Opcional):</label>
            <input type="text" name="participantDetails.addressComplement" value={formData.participantDetails.addressComplement} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Código Postal:</label>
            <input type="text" name="participantDetails.addressPostalCode" value={formData.participantDetails.addressPostalCode} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cidade:</label>
            <input type="text" name="participantDetails.addressCity" value={formData.participantDetails.addressCity} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">País:</label>
            <input type="text" name="participantDetails.addressCountry" value={formData.participantDetails.addressCountry} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? 'A Registar...' : 'Registar'}
          </button>
        </div>
      </form>
      {message && (
        <p className={`text-center text-sm ${message.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
      <p className="text-center text-sm text-gray-600">
        Já tem uma conta?{' '}
        <button
          onClick={onSwitchToLogin}
          className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
        >
          Entrar aqui
        </button>
      </p>
    </div>
  );
};

export default RegisterForm;
