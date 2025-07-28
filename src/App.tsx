// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';

// --- Importar Interfaces ---
import { UserData } from './types/user';

// --- Importar Componentes ---
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginForm from './pages/LoginForm';
import RegisterForm from './pages/RegisterForm';
import Dashboard from './pages/Dashboard';
import EditProfilePage from './pages/EditProfilePage';
import CompanyDetailsPage from './pages/CompanyDetailsPage';
import ListCompaniesPage from './pages/ListCompaniesPage';
import ListCompanyAdminsPage from './pages/ListCompanyAdminsPage';

// --- Componente Principal da Aplicação ---
export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'register' | 'dashboard' | 'editProfile' | 'companyDetails' | 'listCompanies' | 'listCompanyAdmins'>('landing');
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Função para atualizar o URL do frontend (apenas o caminho)
  const updateUrl = (view: string) => {
    let newPath = '/';
    if (view === 'dashboard') {
      newPath = '/dashboard';
    } else if (view === 'editProfile') {
      newPath = '/edit-profile';
    } else if (view === 'companyDetails') {
      newPath = '/company-details';
    } else if (view === 'listCompanies') {
      newPath = '/companies';
    } else if (view === 'listCompanyAdmins') {
      newPath = '/company-admins';
    } else if (view === 'login') {
      newPath = '/login';
    } else if (view === 'register') {
      newPath = '/register';
    }
    window.history.pushState({ path: newPath }, '', newPath);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser: UserData = JSON.parse(storedUser);
        
        if (!user || user.id !== parsedUser.id) {
          setUser(parsedUser);
          console.log('User loaded from localStorage in useEffect:', parsedUser);
        }

        const path = window.location.pathname;
        let initialView: typeof currentView = 'landing';

        if (path.includes('/dashboard')) {
          initialView = 'dashboard';
        } else if (path.includes('/edit-profile')) {
          initialView = 'editProfile';
        } else if (path.includes('/company-details')) {
          initialView = 'companyDetails';
        } else if (path.includes('/companies')) {
          initialView = 'listCompanies';
        } else if (path.includes('/company-admins')) {
          initialView = 'listCompanyAdmins';
        } else if (path.includes('/login')) {
          initialView = 'login';
        } else if (path.includes('/register')) {
          initialView = 'register';
        } else {
          initialView = 'dashboard';
        }
        
        if (currentView !== initialView) {
          setCurrentView(initialView);
        }
        
      } catch (e) {
        console.error('Falha ao analisar o utilizador do localStorage', e);
        localStorage.clear();
        setUser(null);
        setCurrentView('landing');
        updateUrl('landing');
      }
    } else {
      if (user !== null) {
        setUser(null);
      }
      if (currentView !== 'landing') {
        setCurrentView('landing');
      }
      updateUrl('landing');
    }
    setIsAuthChecked(true);

    const handlePopState = () => {
      const path = window.location.pathname;
      let newView: typeof currentView = 'landing';

      if (path.includes('/dashboard')) {
        newView = 'dashboard';
      } else if (path.includes('/edit-profile')) {
        newView = 'editProfile';
      } else if (path.includes('/company-details')) {
        newView = 'companyDetails';
      } else if (path.includes('/companies')) {
        newView = 'listCompanies';
      } else if (path.includes('/company-admins')) {
        newView = 'listCompanyAdmins';
      } else if (path.includes('/login')) {
        newView = 'login';
      } else if (path.includes('/register')) {
        newView = 'register';
      } else {
        newView = 'landing';
      }
      setCurrentView(newView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname;
    let expectedPath = '/';
    if (currentView === 'dashboard') {
      expectedPath = '/dashboard';
    } else if (currentView === 'editProfile') {
      expectedPath = '/edit-profile';
    } else if (currentView === 'companyDetails') {
      expectedPath = '/company-details';
    } else if (currentView === 'listCompanies') {
      expectedPath = '/companies';
    } else if (currentView === 'listCompanyAdmins') {
      expectedPath = '/company-admins';
    } else if (currentView === 'login') {
      expectedPath = '/login';
    } else if (currentView === 'register') {
      expectedPath = '/register';
    }

    if (currentPath !== expectedPath) {
      updateUrl(currentView);
    }
  }, [currentView]);


  const handleLoginSuccess = (token: string, userData: UserData) => {
    setUser(userData);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('User logged in (handleLoginSuccess):', userData);

    setCurrentView('dashboard');
  };

  const handleRegisterSuccess = () => {
    setCurrentView('login');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
    setCurrentView('landing');
  };

  const handleNavigateToEditProfile = () => {
    setCurrentView('editProfile');
  };

  const handleNavigateToCompanyDetails = () => {
    setCurrentView('companyDetails');
  };

  // Funções de navegação para a Sidebar
  const handleNavigateToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleNavigateToCreateCompany = () => {
    console.log('Navegar para Criar Empresa');
  };

  const handleNavigateToCreateCompanyAdmin = () => {
    console.log('Navegar para Criar Company Admin');
  };

  const handleNavigateToListCompanies = () => {
    setCurrentView('listCompanies');
  };

  const handleNavigateToListCompanyAdmins = () => {
    setCurrentView('listCompanyAdmins');
  };

  // Renderiza o conteúdo apenas quando a verificação de autenticação inicial estiver concluída
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-700">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Cabeçalho fixo no topo */}
      <Header
        user={user}
        onLogout={handleLogout}
        onSwitchToLogin={() => { setCurrentView('login'); }}
        onSwitchToRegister={() => { setCurrentView('register'); }}
        onNavigateToLanding={() => { setCurrentView('landing'); }}
        onNavigateToEditProfile={handleNavigateToEditProfile}
        onNavigateToCompanyDetails={handleNavigateToCompanyDetails}
      />

      {/* Conteúdo principal e Sidebar - Este div agora é o container flex para a sidebar e o conteúdo principal */}
      {/* O pt-16 empurra este container para baixo do header fixo */}
      <div className="flex flex-grow pt-16">
        {user && user.role === 'PLATFORM_ADMIN' && (
          <Sidebar
            user={user}
            currentView={currentView}
            onNavigateToDashboard={handleNavigateToDashboard}
            onNavigateToCreateCompany={handleNavigateToCreateCompany}
            onNavigateToCreateCompanyAdmin={handleNavigateToCreateCompanyAdmin}
            onNavigateToListCompanies={handleNavigateToListCompanies}
            onNavigateToListCompanyAdmins={handleNavigateToListCompanyAdmins}
            isSidebarOpen={true}
          />
        )}
        {/* O main content precisa de flex-grow para ocupar o espaço restante. REMOVIDO: ml-64, items-center e justify-center */}
        <main className={`flex-grow flex flex-col p-4 pb-20 ${user && user.role === 'PLATFORM_ADMIN' ? '' : ''}`}>
          {currentView === 'landing' && <LandingPage />}
          {currentView === 'login' && (
            <LoginForm
              onLoginSuccess={handleLoginSuccess}
              onSwitchToRegister={() => { setCurrentView('register'); }}
            />
          )}
          {currentView === 'register' && (
            <RegisterForm
              onRegisterSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => { setCurrentView('login'); }}
            />
          )}
          {currentView === 'dashboard' && user && (
            <Dashboard user={user} onLogout={handleLogout} />
          )}
          {currentView === 'editProfile' && user && (
            <EditProfilePage user={user} onBack={() => setCurrentView('dashboard')} />
          )}
          {currentView === 'companyDetails' && user && user.companyId && (
            <CompanyDetailsPage user={user} onBack={() => setCurrentView('dashboard')} />
          )}
          {currentView === 'listCompanies' && user && user.role === 'PLATFORM_ADMIN' && (
            <ListCompaniesPage user={user} onBack={() => setCurrentView('dashboard')} />
          )}
          {currentView === 'listCompanyAdmins' && user && user.role === 'PLATFORM_ADMIN' && (
            <ListCompanyAdminsPage user={user} onBack={() => setCurrentView('dashboard')} />
          )}
        </main>
      </div>

      {/* Rodapé fixo na parte inferior */}
      <Footer />
    </div>
  );
}
