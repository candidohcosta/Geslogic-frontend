// frontend/src/pages/LoginForm.tsx (VERSÃO FINAL COM useAuth)

import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // 1. Importar o nosso hook
import { UserRole } from '../types/user';
import { loginUser } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';


// 2. A interface de props agora está VAZIA!
const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // 3. Usar o hook para obter a função 'login'

  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setMessage('');
  setLoading(true);

  try {
    const data = await loginUser(email, password);
    
    // 1. CHAMA A FUNÇÃO 'login' CORRIGIDA (só com um argumento)
    login(data.user);
    
    const loggedInUser = data.user;

    // 2. LÓGICA DE REDIRECIONAMENTO (a tua lógica, preservada e limpa)
    if (loggedInUser.role === UserRole.COMPANY_ADMIN && loggedInUser.companySlug) {
      const { protocol, port } = window.location;
      const mainDomain = process.env.REACT_APP_MAIN_DOMAIN || 'localhost';
      const newUrl = `${protocol}//${loggedInUser.companySlug}.${mainDomain}:${port}/dashboard`;
      window.location.href = newUrl;
      // Não precisamos de 'return' aqui porque o recarregamento da página termina o script
    } else {
      // Para PlatformAdmin e Participant, usamos navigate
      navigate('/dashboard', { replace: true });
    }
  } catch (error: any) {
    setMessage(error.message || 'Erro de rede ou servidor.');
    setPassword('');
  } finally {
    // 3. GARANTE QUE O LOADING TERMINA, especialmente se o login falhar
    setLoading(false);
  }
}; 

/* const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setMessage('');
  setLoading(true);

  try {
    const data = await loginUser(email, password);
    const loggedInUser = data.user;

    // A MUDANÇA CRUCIAL:
    // Nós guardamos a informação de que o login foi bem-sucedido
    // NUM LOCAL QUE "SOBREVIVE" AO RECARREGAMENTO DA PÁGINA.
    localStorage.setItem('post_login_user', JSON.stringify(loggedInUser));

    // AGORA, fazemos o redirecionamento
    if (loggedInUser.role === UserRole.COMPANY_ADMIN && loggedInUser.companySlug) {
      const { protocol, port } = window.location;
      const mainDomain = process.env.REACT_APP_MAIN_DOMAIN || 'localhost';
      const newUrl = `${protocol}//${loggedInUser.companySlug}.${mainDomain}:${port}/dashboard`;
      window.location.href = newUrl;
    } else {
      // Para o Platform Admin, não há recarregamento, por isso o login direto funciona.
      login(loggedInUser); // Atualiza o AuthContext
      navigate('/dashboard', { replace: true });
    }
  } catch (error: any) {
    setMessage(error.message);
    setPassword('');
    setLoading(false);
  }
}; */



  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <Card className="w-full max-w-sm"> {/* O nosso novo contentor principal */}
        <CardHeader>
          <CardTitle>Login</CardTitle>
          {/* Podemos adicionar uma CardDescription aqui, se quisermos */}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5"> {/* Estrutura recomendada */}
              <Label htmlFor="email">Email:</Label>
              <Input
                type="email"
                id="email" // Boa prática adicionar 'id' para o 'htmlFor' da label
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="o.seu@email.com" // Exemplo de como passar outras props normais de input
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="password">Password:</Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} >
              {loading ? 'A Entrar...' : 'Entrar'}
            </Button>
          </form>
          {message && <p className="text-center text-sm text-red-600">{message}</p>}
          <div className="text-center text-sm text-gray-600 mt-4">
            <p className="mb-1"> {/* Parágrafo para o primeiro link com uma margem inferior */}
              <span>Esqueceu-se da password? </span>
              <Button variant="link" asChild className="p-0 h-auto align-baseline">
                <Link to="/forgot-password">Recupere a password</Link>
              </Button>
            </p>
            <p> {/* Parágrafo para o segundo link */}
              <span>Não tem uma conta? </span>
              <Button variant="link" asChild className="p-0 h-auto align-baseline">
                <Link to="/register">Registe-se aqui</Link>
              </Button>
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex-col"> {/* Usar flex-col para empilhar os links */}
          <div className="text-center ...">
            {/* ... (os teus links de "recuperar password" e "registar") ... */}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginForm;
