// frontend/src/pages/RegisterForm.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // 1. Importar o hook
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
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
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

    if (response.ok) {
      setMessage('Registo bem-sucedido! Será redirecionado para a página de login.');
      
      // Espera 3 segundos para o utilizador ler a mensagem e depois navega
      setTimeout(() => {
        navigate('/login');
      }, 3000); // 3000ms = 3 segundos

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
    <div className="flex-grow flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl"> {/* O nosso novo contentor principal */}
        <CardHeader>
          <CardTitle>Novo registo</CardTitle>
          {/* Podemos adicionar uma CardDescription aqui, se quisermos */}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="firstName">Primeiro Nome: <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="lastName">Último Nome: <span className="text-red-500">*</span></Label>
              <Input 
                type="text" 
                id="lastName" 
                name="lastName" 
                value={formData.lastName} 
                onChange={handleChange} 
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="email">Email: <span className="text-red-500">*</span></Label>
              <Input 
                type="email" 
                id="email"
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="o.seu@email.com"
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="password">Password: <span className="text-red-500">*</span></Label>
              <Input 
                type="password" 
                id="password"
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
              />
            </div>
            
            <div className="md:col-span-2 space-y-4 border-t pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="text-xl font-semibold text-gray-700 col-span-full">Detalhes do Participante</h3>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="participantDetails.phone">Telefone: <span className="text-red-500">*</span></Label>
                <Input 
                  type="text" 
                  name="participantDetails.phone" 
                  id="participantDetails.phone" 
                  value={formData.participantDetails.phone} 
                  onChange={handleChange} 
                  required
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="participantDetails.taxNumber">Número de Contribuinte: <span className="text-red-500">*</span></Label>
                <Input 
                  type="text" 
                  id="participantDetails.taxNumber"
                  name="participantDetails.taxNumber" 
                  value={formData.participantDetails.taxNumber} 
                  onChange={handleChange} 
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="participantDetails.dateOfBirth">Data de Nascimento (AAAA-MM-DD):</Label>
                <Input 
                  type="date" 
                  id="participantDetails.dateOfBirth" 
                  name="participantDetails.dateOfBirth" 
                  value={formData.participantDetails.dateOfBirth} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="participantDetails.citizenCardNumber">Número Cartão de Cidadão:</Label>
                <Input 
                  type="text" 
                  id="participantDetails.citizenCardNumber"
                  name="participantDetails.citizenCardNumber" 
                  value={formData.participantDetails.citizenCardNumber} 
                  onChange={handleChange} 
                  required  
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="participantDetails.addressStreet">Rua:</Label>
                <Input 
                  type="text" 
                  id="participantDetails.addressStreet" 
                  name="participantDetails.addressStreet" 
                  value={formData.participantDetails.addressStreet} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="participantDetails.addressNumber">Número da Porta:</Label>
                <Input 
                  type="text" 
                  id="participantDetails.addressNumber" 
                  name="participantDetails.addressNumber" 
                  value={formData.participantDetails.addressNumber} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="participantDetails.addressComplement">Complemento (Opcional):</Label>
                <Input 
                  type="text" 
                  id="participantDetails.addressComplement" 
                  name="participantDetails.addressComplement" 
                  value={formData.participantDetails.addressComplement} 
                  onChange={handleChange}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="participantDetails.addressPostalCode">Código Postal: <span className="text-red-500">*</span></Label>
                <Input 
                  type="text" 
                  id="participantDetails.addressPostalCode" 
                  name="participantDetails.addressPostalCode" 
                  value={formData.participantDetails.addressPostalCode} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="participantDetails.addressCity">Cidade:</Label>
                <Input 
                  type="text" 
                  id="participantDetails.addressCity" 
                  name="participantDetails.addressCity" 
                  value={formData.participantDetails.addressCity} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="participantDetails.addressCountry">País:</Label>
                <Input 
                  type="text" 
                  id="participantDetails.addressCountry"
                  name="participantDetails.addressCountry" 
                  value={formData.participantDetails.addressCountry} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'A Registar...' : 'Registar'}
              </Button>
            </div>
          </form>
          {message && (
            <p className={`text-center text-sm ${message.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}

        </CardContent>
        <CardFooter className="flex-col"> {/* Usar flex-col para empilhar os links */}
          <div className="flex justify-center">
            <p className="text-center text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Button variant="link" asChild className="p-0 h-auto">
                <Link to="/login">Faça login aqui</Link>
              </Button>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterForm;
