// frontend/src/App.tsx (VERSÃO CORRIGIDA)

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, BrowserRouter } from 'react-router-dom'; // <--- Garante que BrowserRouter está importado
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types/user';
import { SubdomainProvider } from './context/SubdomainContext';
import { HelmetProvider } from 'react-helmet-async';
import { TelemetryService } from './lib/telemetry';

// ... (Todos os teus imports de páginas mantêm-se iguais) ...
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
import { useSubdomain } from './context/SubdomainContext';
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
import PolicyDocumentsPage from './pages/PolicyDocumentsPage';
import EditPolicyPage from './pages/EditPolicyPage';

import ServicesListPage from './pages/ServicesListPage';
import EditServicePage from './pages/EditServicePage';
import CountersListPage from './pages/CountersListPage';
import EditCounterPage from './pages/EditCounterPage';
import KiosksListPage from './pages/KiosksListPage';
import EditKioskPage from './pages/EditKioskPage'; 
import DisplaysListPage from './pages/DisplaysListPage';
import EditDisplayPage from './pages/EditDisplayPage';
import KioskPage from './pages/KioskPage';
import KioskSetupPage from './pages/KioskSetupPage';
import DisplayPage from './pages/DisplayPage';
import DisplaySetupPage from './pages/DisplaySetupPage'; 
import OperatorSetupPage from './pages/OperatorSetupPage';
import OperatorDashboard from './pages/OperatorDashboard';
import QueueDashboardPage from './pages/QueueDashboardPage';
import OperatorsListPage from './pages/OperatorsListPage';
import EditOperatorPage from './pages/EditOperatorPage';
import { OperatorSessionProvider } from './context/OperatorSessionContext';
import SchedulesListPage from './pages/SchedulesListPage';
import EditSchedulePage from './pages/EditSchedulePage';

import UserTypesListPage from './pages/UserTypesListPage';
import UserDataListPage from './pages/UserDataListPage';
import EditUserTypePage from './pages/EditUserTypePage';
import EditUserDataPage from './pages/EditUserDataPage';

import DevicesStatusPage from './pages/DevicesStatusPage';

import ActiveSessionsPage from './pages/ActiveSessionsPage';

import MobileQueuePage from './pages/MobileQueuePage';
import FeedbackAuditoryPage from './pages/FeedbackAuditoryPage';

import { NotificationProvider } from './context/NotificationContext';
import ForceSetupPage from './pages/ForceSetupPage';

import SupportListPage from './pages/support/SupportListPage';
import CreateSupportTicketPage from './pages/support/CreateSupportTicketPage';
import SupportDetailPage from './pages/support/SupportDetailPage';
import ResourcesPage from './pages/scheduling/ResourcesPage';
import ProfilesPage from './pages/scheduling/ProfilesPage';
import TestBookingPage from './pages/scheduling/TestBookingPage';
import PublicBookingPage from './pages/scheduling/PublicBookingPage';
import AppointmentsListPage from './pages/scheduling/AppointmentsListPage';
import { SecurityGuard } from './components/auth/SecurityGuard'; // Certifica-te que importas o SecurityGuard
import PublicCancelPage from './pages/scheduling/PublicCancelPage';
import SchedulingCalendarPage from './pages/scheduling/SchedulingCalendarPage';
import PublicRegistrationStatusPage from './pages/PublicRegistrationStatusPage';
import CompanyPaymentSettingsPage from './pages/CompanyPaymentSettingsPage';
import PublicEventFeedbackPage from './pages/PublicEventFeedbackPage';
import EventFeedbackPage from './pages/EventFeedbackPage';
import EventStaffListPage from './pages/event-staff/EventStaffListPage';
import EditEventStaffPage from './pages/event-staff/EditEventStaffPage';
import EventCheckInPage from './pages/EventCheckInPage';

const queryClient = new QueryClient();

// Componente Observador (tem de estar dentro do Router)
const RouteObserver = () => {
  const location = useLocation();
  React.useEffect(() => {
    TelemetryService.trackRoute(location.pathname);
  }, [location]);
  return null;
};

// Layout e Rotas
function AppLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { companySlug: subdomain } = useSubdomain();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const showSidebar = isAuthenticated && (user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.COMPANY_ADMIN || user?.role === UserRole.OPERATOR);

  useEffect(() => {
    if (subdomain === 'kiosk' || subdomain === 'display') return;

    const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/setup-required'];
    
    const isPublicDynamicPath = 
      location.pathname.startsWith('/events/') || 
      location.pathname.startsWith('/companies/') ||
      location.pathname.startsWith('/q/') ||
      location.pathname.startsWith('/agendar/'); // ADICIONAR ESTA EXCEPÇÃO
      
    const isPublicPath = publicPaths.includes(location.pathname) || isPublicDynamicPath;

    if (!isLoading && !isAuthenticated && !isPublicPath) {
      console.warn("Sessão expirada. Redirecionando para login.");
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname, subdomain]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><p>A carregar sessão...</p></div>;
  }

  if (subdomain === 'kiosk') {
    return (
      <Routes>
        <Route path="/setup/:deviceSecret" element={<KioskSetupPage />} />
        <Route path="/run" element={<KioskPage />} />
        <Route path="*" element={<Navigate to="/run" replace />} />
      </Routes>
    );
  }
  if (subdomain === 'display') {
    return (
      <Routes>
        <Route path="/setup/:deviceSecret" element={<DisplaySetupPage />} />
        <Route path="/run" element={<DisplayPage />} />
        <Route path="*" element={<Navigate to="/run" replace />} />
      </Routes>
    );
  }
  if (location.pathname.startsWith('/q/')) {
     return (
       <Routes>
         <Route path="/q/:slug" element={<MobileQueuePage />} />
       </Routes>
     );
  }  

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} /> 
      
      <div className="flex-grow pt-16 grid w-full" style={{ minHeight: 'calc(100vh - 4rem)' }}>
        <div className={`flex flex-col md:grid ${showSidebar ? 'md:grid-cols-[256px_1fr]' : 'md:grid-cols-1'} h-full`}>
            
            {showSidebar && (
              <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            )}

            {isSidebarOpen && (
              <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden" aria-hidden="true" />
            )}
            
            <div className="flex flex-col overflow-y-auto h-full w-full">
              <main className="p-4 flex-grow">
                <Routes>
                    {subdomain && <Route path="/" element={<PublicCompanyPage />} />}
                    
                    {/* ROTAS PÚBLICAS GERAIS */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={!isAuthenticated ? <LoginForm /> : <Navigate to="/dashboard" />} />
                    <Route path="/register" element={!isAuthenticated ? <RegisterForm /> : <Navigate to="/dashboard" />} />
                    <Route path="/events/:eventId" element={<PublicEventDetailsPage />} />
                    <Route path="/companies/:slug" element={<PublicCompanyPage />} />
                    <Route path="/events/:eventId" element={<PublicEventPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/minha-inscricao/:registrationId" element={<PublicRegistrationStatusPage />} />
                    <Route path="/feedback-evento/:registrationId" element={<PublicEventFeedbackPage />} />
                    
                    {/* ROTA PÚBLICA DE AGENDAMENTO (IMPORTANTE: FORA DO SECURITY GUARD) */}
                    <Route path="/agendar/:companySlug/:profileSlug" element={<PublicBookingPage />} />
                    <Route path="/agendar/cancelar" element={<PublicCancelPage />} />

                    {/* ROTAS PROTEGIDAS */}
                    <Route element={<SecurityGuard />}>
                        <Route path="/setup-required" element={<ForceSetupPage />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/support" element={<SupportListPage />} />
                        <Route path="/support/new" element={<CreateSupportTicketPage />} />
                        <Route path="/support/:ticketId" element={<SupportDetailPage />} />
                        <Route path="/edit-profile" element={<EditProfilePage />} />
                        <Route path="/change-password" element={<ChangePasswordPage />} />
                        <Route path="/events/list" element={<ListEventsPage />} />
                        <Route path="/events/preview/:eventId" element={<EventRegistrationPreviewPage />} />
                        <Route path="/events/create" element={<CreateEventPage />} />
                        <Route path="/events/edit/:eventId" element={<EditEventPage />} />
                        <Route path="/events/:eventId/registrations" element={<EventRegistrationsPage />} />
                        <Route path="/events/feedback" element={<EventFeedbackPage />} />
{/* ROTA GENÉRICA (Onde o Platform Admin aterra ou o Company Admin entra) */}
<Route path="/event-staff" element={<EventStaffListPage />} />

{/* ROTA ESPECÍFICA (Para deep-linking ou quando se seleciona uma empresa) */}
<Route path="/event-staff/company/:companyId" element={<EventStaffListPage />} />

{/* Rotas de Edição/Criação mantêm-se */}
<Route path="/event-staff/new" element={<EditEventStaffPage />} />
<Route path="/event-staff/edit/:staffId" element={<EditEventStaffPage />} />

<Route path="/event-checkin" element={<EventCheckInPage />} />
                        <Route path="operators" element={<OperatorsListPage />} />
                        <Route path="operators/company/:companyId" element={<OperatorsListPage />} />
                        <Route path="operators/new" element={<EditOperatorPage />} />
                        <Route path="operators/edit/:operatorId" element={<EditOperatorPage />} />
                        <Route path="/schedules" element={<SchedulesListPage />} />
                        <Route path="/schedules/company/:companyId" element={<SchedulesListPage />} />
                        <Route path="/schedules/new" element={<EditSchedulePage />} />
                        <Route path="/schedules/edit/:scheduleId" element={<EditSchedulePage />} />                    
                        <Route path="services" element={<ServicesListPage />} />
                        <Route path="services/company/:companyId" element={<ServicesListPage />} />
                        <Route path="services/new" element={<EditServicePage />} />
                        <Route path="services/edit/:serviceId" element={<EditServicePage />} />
                        <Route path="user-types" element={<UserTypesListPage />} />
                        <Route path="user-types/company/:companyId" element={<UserTypesListPage />} />
                        <Route path="user-types/new" element={<EditUserTypePage />} />
                        <Route path="user-types/edit/:userTypeId" element={<EditUserTypePage />} />
                        <Route path="user-data/new" element={<EditUserDataPage />} />
                        <Route path="user-data/edit/:userDataId" element={<EditUserDataPage />} />
                        <Route path="user-data/:userTypeId" element={<UserDataListPage />} />
                        <Route path="user-data/by-type/:userTypeId" element={<UserDataListPage />} />
                        <Route path="counters" element={<CountersListPage />} />
                        <Route path="counters/company/:companyId" element={<CountersListPage />} />
                        <Route path="counters/new" element={<EditCounterPage />} />
                        <Route path="counters/edit/:counterId" element={<EditCounterPage />} />
                        <Route path="kiosks" element={<KiosksListPage />} />
                        <Route path="kiosks/company/:companyId" element={<KiosksListPage />} />
                        <Route path="kiosks/new" element={<EditKioskPage />} />
                        <Route path="kiosks/edit/:kioskId" element={<EditKioskPage />} />
                        <Route path="displays" element={<DisplaysListPage />} />
                        <Route path="displays/company/:companyId" element={<DisplaysListPage />} />
                        <Route path="displays/new" element={<EditDisplayPage />} />
                        <Route path="displays/edit/:displayId" element={<EditDisplayPage />} />
                        <Route path="operator/setup" element={<OperatorSetupPage />} />
                        <Route path="operator/dashboard" element={<OperatorDashboard />} />
                        <Route path="/operator-sessions" element={<ActiveSessionsPage />} />
                        <Route path="/devices-monitor" element={<DevicesStatusPage />} />
                        <Route path="/dashboard/queues" element={<QueueDashboardPage />} />
                        <Route path="/dashboard/queues/:companyId" element={<QueueDashboardPage />} />
                        <Route path="/feedback-auditory" element={<FeedbackAuditoryPage />} />
                        <Route path="/companies/list" element={<ListCompaniesPage />} />
                        <Route path="/companies/create" element={<CreateCompanyPage />} />
                        <Route path="/companies/edit/:companyId" element={<CompanyEditPage />} />
                        <Route path="/companies/homepage/edit/:companyId" element={<CompanyHomepageEditPage />} />
                        <Route path="/company-admins/list" element={<ListCompanyAdminsPage />} />
                        <Route path="/company-admins/list/:companyId" element={<ListCompanyAdminsPage />} />
                        <Route path="/company-admins/create" element={<CreateCompanyAdminPage />} />
                        <Route path="/company-admins/edit/:adminId" element={<EditCompanyAdminPage />} />
                        <Route path="/companies/smtp-config/:companyId" element={<CompanySmtpConfigPage />} />
                        <Route path="/company-details" element={<CompanyEditPage />} />
                        <Route path="/companies/payment-config/:companyId" element={<CompanyPaymentSettingsPage />} />
                        <Route path="/company-payments" element={<CompanyPaymentSettingsPage />} />
                        <Route path="/email-templates" element={<EmailTemplatesPage />} />
                        <Route path="/email-templates/new" element={<EditTemplatePage />} />
                        <Route path="/email-templates/edit/:templateId" element={<EditTemplatePage />} />
                        <Route path="/logs" element={<LogsPage />} />
                        <Route path="/sent-emails-log" element={<SentEmailsLogPage />} />
                        <Route path="/system-health" element={<SystemHealthPage />} />
                        <Route path="/my-registrations" element={<MyRegistrationsPage />} />
                        <Route path="/policy-documents" element={<PolicyDocumentsPage />} />
                        <Route path="/policy-documents/new" element={<EditPolicyPage />} />
                        <Route path="/policy-documents/edit/:policyId" element={<EditPolicyPage />} />
                        <Route path="/scheduling/resources" element={<ResourcesPage />} />
                        <Route path="/scheduling/profiles" element={<ProfilesPage />} />
                        <Route path="/scheduling/book-test" element={<TestBookingPage />} />
                        <Route path="/scheduling/appointments" element={<AppointmentsListPage />} />
                        <Route path="/scheduling/calendar" element={<SchedulingCalendarPage />} />
                    </Route>

                    <Route path="*" element={<p>Página não encontrada</p>} />
                </Routes>
              </main>
              <Footer />
            </div>
        </div>
      </div>
    </div>
  );
}

// O componente App "pai"
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      
      {/* 
        MUDANÇA CRÍTICA: O Router sobe para envolver os Providers.
        Assim, qualquer provider que use 'useNavigate' (como Notification ou Auth) vai funcionar.
      */}
      <BrowserRouter>
        <AuthProvider>
          <OperatorSessionProvider>
            <SubdomainProvider>
              <NotificationProvider>
                <HelmetProvider>
                  <RouteObserver /> 
                  <AppLayout />
                </HelmetProvider>
              </NotificationProvider>
            </SubdomainProvider>
          </OperatorSessionProvider>
        </AuthProvider>
      </BrowserRouter>

    </QueryClientProvider>
  );
}