// frontend/src/pages/LoginForm.tsx
import React, { useState } from 'react';
import { UserData } from '../types/user';

interface LoginFormProps {
  onLoginSuccess: (accessToken: string, user: UserData) => void;
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Login bem-sucedido!');
        onLoginSuccess(data.accessToken, data.user);
      } else {
        setMessage(data.message || 'Erro no login.');
      }
    } catch (error) {
      setMessage('Erro de rede ou servidor.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md space-y-4 flex-grow flex flex-col justify-center">
      <h2 className="text-2xl font-bold text-center text-gray-800">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'A Entrar...' : 'Entrar'}
        </button>
      </form>
      {message && (
        <p className={`text-center text-sm ${message.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
      <p className="text-center text-sm text-gray-600">
        Não tem uma conta?{' '}
        <button
          onClick={onSwitchToRegister}
          className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
        >
          Registe-se aqui
        </button>
      </p>
    </div>
  );
};

export default LoginForm;
