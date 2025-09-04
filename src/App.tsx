// frontend/src/App.tsx (VERSÃO FINAL E CORRIGIDA)

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types/user';
import { CompanyProvider } from './context/CompanyContext';
import { HelmetProvider } from 'react-helmet-async';

// Importar Componentes e Páginas
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginForm from './pages/LoginForm';
import RegisterForm from './pages/RegisterForm';
import Dashboard from './pages/Dashboard';
import EditProfilePage from './pages/EditProfilePage';
import CompanyEditPage from './pages/CompanyEditPage';
import ListCompaniesPage from './pages/ListCompaniesPage';
import ListCompanyAdminsPage from './pages/ListCompanyAdminsPage';
import CreateCompanyPage from './pages/CreateCompanyPage';
import CreateCompanyAdminPage from './pages/CreateCompanyAdminPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import EditCompanyAdminPage from './pages/EditCompanyAdminPage';
import CreateEventPage from './pages/CreateEventPage';
import ListEventsPage from './pages/ListEventsPage';
import EventRegistrationPreviewPage from './pages/EventRegistrationPreviewPage';
import EditEventPage from './pages/EditEventPage';
import CompanySmtpConfigPage from './pages/CompanySmtpConfigPage';
import PublicEventDetailsPage from './pages/PublicEventDetailsPage';
import PublicCompanyPage from './pages/PublicCompanyPage';
import { useCompany } from './context/CompanyContext';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import EventRegistrationsPage from './pages/EventRegistrationsPage';
import ProtectedRoute from './components/ProtectedRoute';
import LogsPage from './pages/LogsPage';
import PublicEventPage from './pages/PublicEventDetailsPage'
import EmailTemplatesPage from './pages/EmailTemplatesPage';
import EditTemplatePage from './pages/EditTemplatePage';
import SentEmailsLogPage from './pages/SentEmailsLogPage';
import CompanyHomepageEditPage from './pages/CompanyHomepageEditPage';
import MyRegistrationsPage from './pages/MyRegistrationsPage';
import SystemHealthPage from './pages/SystemHealthPage';

// Cria o cliente do TanStack Query FORA do componente
const queryClient = new QueryClient();

// Este é o nosso componente principal de layout e rotas.
// Ele só é renderizado DEPOIS de o AuthProvider ter a informação de autenticação.
function AppLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { companySlug } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const showSidebar = isAuthenticated && (user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.COMPANY_ADMIN);


  // 2. ADICIONA ESTE useEffect
   useEffect(() => {
    // Só executa esta lógica DEPOIS de a verificação inicial ter terminado
    if (!isLoading && !isAuthenticated) {
      // Lista de caminhos que são considerados "públicos" e seguros
      const publicPaths = [
        '/',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
      ];
      
      const isPublicDynamicPath = 
        location.pathname.startsWith('/events/') || 
        location.pathname.startsWith('/companies/');

      // Se estamos num caminho que NÃO É público, redirecionamos para o login
      if (!publicPaths.includes(location.pathname) && !isPublicDynamicPath) {
        navigate('/login', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname]); 


  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>A carregar sessão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <Header onMenuClick={() => setIsSidebarOpen(true)} /> {/* Passar uma função para o Header */}
      
       <div className={`flex-grow pt-16 grid ${showSidebar ? 'md:grid-cols-[256px_1fr]' : 'grid-cols-1'}`}>
        {/* SOBREPOSIÇÃO PARA ECRÃS PEQUENOS */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            aria-hidden="true"
          />
        )}

        {/* SIDEBAR */}
        {isAuthenticated && (user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.COMPANY_ADMIN) && (
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        )}
        
        <main className="flex-grow p-4 w-full overflow-y-auto">
          <Routes>
            {/* ROTA ESPECIAL PARA A RAIZ DE UM SUBDOMÍNIO */}
            {companySlug && <Route path="/" element={<PublicCompanyPage />} />}
            
            {/* ROTAS PÚBLICAS GERAIS */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={!isAuthenticated ? <LoginForm /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!isAuthenticated ? <RegisterForm /> : <Navigate to="/dashboard" />} />
            <Route path="/events/:eventId" element={<PublicEventDetailsPage />} />
            <Route path="/companies/:slug" element={<PublicCompanyPage />} />
<Route path="/events/:eventId" element={<PublicEventPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ROTAS PROTEGIDAS */}
            <Route element={<ProtectedRoute />}>
              <>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/edit-profile" element={<EditProfilePage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/events/list" element={<ListEventsPage />} />
                <Route path="/events/preview/:eventId" element={<EventRegistrationPreviewPage />} />


                    <Route path="/events/create" element={<CreateEventPage />} />
                    <Route path="/events/edit/:eventId" element={<EditEventPage />} />
                    <Route path="/events/:eventId/registrations" element={<EventRegistrationsPage />} />


                    <Route path="/companies/list" element={<ListCompaniesPage />} />
                    <Route path="/companies/create" element={<CreateCompanyPage />} />
                    <Route path="/companies/edit/:companyId" element={<CompanyEditPage />} />
                    <Route path="/companies/edit/:companyId" element={<CompanyEditPage />} />
                    <Route path="/companies/homepage/edit/:companyId" element={<CompanyHomepageEditPage />} />
                    
                    <Route path="/company-admins/list" element={<ListCompanyAdminsPage />} />
                    <Route path="/company-admins/list/:companyId" element={<ListCompanyAdminsPage />} />
                    <Route path="/company-admins/create" element={<CreateCompanyAdminPage />} />
                    <Route path="/company-admins/edit/:adminId" element={<EditCompanyAdminPage />} />
                    <Route path="/companies/smtp-config/:companyId" element={<CompanySmtpConfigPage />} />

                

                    <Route path="/company-details" element={<CompanyEditPage />} />
                    <Route path="/company-admins/list" element={<ListCompanyAdminsPage />} />

                    <Route path="/email-templates" element={<EmailTemplatesPage />} />
                    <Route path="/email-templates/new" element={<EditTemplatePage />} />
                    <Route path="/email-templates/edit/:templateId" element={<EditTemplatePage />} />


                    <Route path="/logs" element={<LogsPage />} />
                    <Route path="/sent-emails-log" element={<SentEmailsLogPage />} />
                    <Route path="/app/system-health" element={<SystemHealthPage />} />

                    <Route path="/my-registrations" element={<MyRegistrationsPage />} />
              </>
      </Route>

      <Route path="*" element={<p>Página não encontrada</p>} />
    </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
}
// O componente App "pai" que apenas fornece os contextos
export default function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <QueryClientProvider client={queryClient}>
          <HelmetProvider>
            <AppLayout />
          </HelmetProvider>
        </QueryClientProvider>
    </CompanyProvider>
    </AuthProvider>
  );
}
