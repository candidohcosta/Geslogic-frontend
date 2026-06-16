// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import {
  Routes, Route, Navigate, useLocation, useNavigate, BrowserRouter
} from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types/user';
import { SubdomainProvider, useSubdomain } from './context/SubdomainContext';
import { HelmetProvider } from 'react-helmet-async';
import { TelemetryService } from './lib/telemetry';

import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';

import LandingPage from './pages/LandingPage';
import LoginForm from './pages/LoginForm';
import RegisterForm from './pages/RegisterForm';
import Dashboard from './pages/Dashboard';
import EditProfilePage from './pages/EditProfilePage';
import PlatformAdminsPage from './pages/PlatformAdminsPage';
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
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import EventRegistrationsPage from './pages/EventRegistrationsPage';
import ProtectedRoute from './components/ProtectedRoute';
import LogsPage from './pages/LogsPage';
import PublicEventPage from './pages/PublicEventDetailsPage';
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
import OperatorLiveDashboard from './pages/OperatorLiveDashboard';
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
import PublicCancelPage from './pages/scheduling/PublicCancelPage';
import SchedulingCalendarPage from './pages/scheduling/SchedulingCalendarPage';

import PublicRegistrationStatusPage from './pages/PublicRegistrationStatusPage';
import CompanyPaymentSettingsPage from './pages/CompanyPaymentSettingsPage';
import PublicEventFeedbackPage from './pages/PublicEventFeedbackPage';
import EventFeedbackPage from './pages/EventFeedbackPage';

import EventStaffListPage from './pages/event-staff/EventStaffListPage';
import EditEventStaffPage from './pages/event-staff/EditEventStaffPage';
import EventCheckInPage from './pages/EventCheckInPage';

import PlatformAdminFormPage from './pages/PlatformAdminFormPage';
import BackupsPage from './pages/BackupsPage';
import AdminDbConsolePage from './pages/AdminDbConsolePage';
import AdminFileManagerPage from './pages/AdminFileManagerPage';

import { SecurityGuard } from './components/auth/SecurityGuard';
import OperatorIndexRedirect from './pages/OperatorIndexRedirect';
import { InfoModalPortal } from './components/system/InfoDialogPortal';
import { ConfirmModalPortal } from './components/system/ConfirmModalPortal';
import PlatformEmailSignaturePage from './pages/PlatformEmailSignaturePage';
import PlatformSettingsPage from './pages/platform/PlatformSettingsPage';
import { getPlatformUiTheme, getPlatformSidebarConfig } from './services/api';

import PlatformUsersListPage from './pages/PlatformUsersListPage';
import RolesListPage from './pages/RolesListPage';
import ScopedUsersListPage from './pages/ScopedUsersListPage';
import InboxPage from './features/correspondence/pages/InboxPage';
import DocumentDetailPage from './features/correspondence/pages/DocumentDetailPage';
import OutboundDetailPage from './features/correspondence/pages/OutboundDetailPage';
import CreateOutboundPage from './features/correspondence/pages/CreateOutboundPage';

import RegisterInboundPage from './features/correspondence/pages/RegisterInboundPage';
import RegisterInboundManualPage from './features/correspondence/pages/RegisterInboundManualPage';
import RegisterInboundManualWizardPage from './features/correspondence/pages/RegisterInboundManualWizardPage';
import InboxDecisionPage from './features/correspondence/pages/InboxDecisionPage';
import OutboxPage from './features/correspondence/pages/OutboxPage';
import ImportEmailPage from './features/correspondence/email-ingestion/pages/ImportEmailPage';

import CasesListPage from './features/correspondence/cases/pages/CasesListPage';
import CaseDetailPage from './features/correspondence/cases/pages/CaseDetailPage';

const queryClient = new QueryClient();

const RouteObserver = () => {
  const location = useLocation();
  React.useEffect(() => {
    TelemetryService.trackRoute(location.pathname);
  }, [location]);
  return null;
};

function AppLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { companySlug: subdomain } = useSubdomain();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // NOVO: ler o asPublic=1 da querystring (preview e página pública)
  const search = new URLSearchParams(location.search);
  const isAsPublic = search.get('asPublic') === '1';
  // ─────────────────────────────────────────────────────────────

  const isLanding =
    location.pathname === '/' &&           // é a rota da landing
    !isAuthenticated &&                    // utilizador não autenticado (é mesmo pública)
    !subdomain;

  // NOVO: estado controlado do colapso da sidebar (para re-layout do conteúdo)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('sidebar:collapsed');
      return raw === '1';
    } catch {
      return false;
    }
  });

  // Aparência Global (bg / imagem / overlay ...)
  const { data: uiTheme } = useQuery({
    queryKey: ['platform-settings', 'ui-theme'],
    queryFn: getPlatformUiTheme,
    staleTime: 30000,
  });

  // Sidebar Config (estilo + largura) — usado para gridTemplateColumns
  const { data: sidebarCfg } = useQuery({
    queryKey: ['platform-settings', 'sidebar-config'],
    queryFn: getPlatformSidebarConfig,
    staleTime: 30000,
  });
  const sidebarWidth = typeof sidebarCfg?.width === 'number' ? sidebarCfg.width : 256;
  const COLLAPSED_RAIL_PX = 64;

  // Compose background-image com overlay + imagem (se existir)
  const appBackgroundImage =
    uiTheme?.backgroundImageUrl
      ? `linear-gradient(${uiTheme?.overlayColor ?? 'rgba(0,0,0,0)'}, ${uiTheme?.overlayColor ?? 'rgba(0,0,0,0)'}), url("${uiTheme.backgroundImageUrl}")`
      : undefined;

  const appStyle: React.CSSProperties = {
    ...(uiTheme?.backgroundColor ? { backgroundColor: uiTheme.backgroundColor } : {}),
    ...(appBackgroundImage ? { backgroundImage: appBackgroundImage } : {}),
    ...(uiTheme?.backgroundRepeat ? { backgroundRepeat: uiTheme.backgroundRepeat } : {}),
    ...(uiTheme?.backgroundSize ? { backgroundSize: uiTheme.backgroundSize } : {}),
    ...(uiTheme?.backgroundPosition ? { backgroundPosition: uiTheme.backgroundPosition } : {}),
  };

  // persistência simples do estado colapsado
  React.useEffect(() => {
    try {
      localStorage.setItem('sidebar:collapsed', sidebarCollapsed ? '1' : '0');
    } catch {}
  }, [sidebarCollapsed]);

  // ❗ se asPublic=1, NUNCA mostramos sidebar (mesmo que o user esteja logado)
  const showSidebar =
    !isAsPublic && // ← ➊ força a ocultação no modo público/preview
    isAuthenticated &&
    (user?.role === UserRole.PLATFORM_ADMIN ||
      user?.role === UserRole.COMPANY_ADMIN ||
      user?.role === UserRole.OPERATOR);

  // REDIRECTS / LOGIN PROTECTIONS -----------------
  useEffect(() => {
    if (subdomain === 'kiosk' || subdomain === 'display') return;

    const publicPaths = [
      '/', '/login', '/register', '/forgot-password', '/reset-password',
      '/setup-required'
    ];

    const isPublicDynamicPath =
      location.pathname.startsWith('/events/') ||
      location.pathname.startsWith('/companies/') ||
      location.pathname.startsWith('/q/') ||
      location.pathname.startsWith('/agendar/');

    const isPublicPath =
      publicPaths.includes(location.pathname) || isPublicDynamicPath;

    if (!isLoading && !isAuthenticated && !isPublicPath) {
      navigate('/login', { replace: true });
    }

    // Se autenticado na raiz e sem subdomínio, segue para o dashboard
    if (!isLoading && isAuthenticated && location.pathname === '/' && !subdomain) {
      navigate('/dashboard', { replace: true });
    }

  }, [isLoading, isAuthenticated, navigate, location.pathname, subdomain]);

  // KIOSK / DISPLAY / Q --- (mantido)
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

  // NORMAL LAYOUT ---------------------------------------

  // NOVO: gridTemplateColumns dinâmico em desktop quando a sidebar está visível
  const gridTemplateColumnsStyle: React.CSSProperties | undefined =
    showSidebar
      ? (sidebarCollapsed
          ? { gridTemplateColumns: `${COLLAPSED_RAIL_PX}px 1fr` }
          : { gridTemplateColumns: `${sidebarWidth}px 1fr` })
      : undefined;

  return (
    <div className="h-screen overflow-hidden bg-gray-100 flex flex-col font-sans" style={appStyle}>

      {/* ➋ não renderizar o Header no modo público/preview */}
      {!isAsPublic && (
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      )}

      {/* Área de conteúdo compensada pelo header fixo (pt-16), com altura total controlada */}
      <div className={`${!isAsPublic ? 'pt-16' : ''} grid w-full h-full min-h-0 overflow-hidden`}>

        <div
          className="flex flex-col md:grid h-full min-h-0"
          // Em mobile, este wrapper é flex; o gridTemplateColumns só tem efeito em md: (desktop)
          style={gridTemplateColumnsStyle}
        >

          {showSidebar && (
            <Sidebar
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
            />
          )}

          {/* Overlay mobile */}
          {isSidebarOpen && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            ></div>
          )}

          {/* Coluna principal: scroller + footer previsível */}
          <div className="flex flex-col h-full w-full min-h-0">

            {/* wrapper scrollable CORRETO */}
            <div className="flex flex-col flex-grow overflow-y-auto min-h-0 relative">

              <main className="px-4 pb-2 md:pb-3 pt-0 flex-grow">

                <Routes>
                  {/* subdomain root */}
                  {subdomain && <Route path="/" element={<PublicCompanyPage />} />}

                  {/* PUBLIC ROUTES */}
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
                  <Route path="/companies/:companyId/mail-config" element={<CompanySmtpConfigPage />} />

                  <Route path="/agendar/:companySlug/:profileSlug" element={<PublicBookingPage />} />
                  <Route path="/agendar/cancelar" element={<PublicCancelPage />} />

                  {/* PROTECTED ROUTES */}
                  <Route element={<SecurityGuard />}>
                    <Route path="/setup-required" element={<ForceSetupPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/support" element={<SupportListPage />} />
                    <Route path="/support/new" element={<CreateSupportTicketPage />} />
                    <Route path="/support/:ticketId" element={<SupportDetailPage />} />
                    <Route path="/edit-profile" element={<EditProfilePage />} />

                    <Route path="/platform-admins" element={<PlatformAdminsPage />} />
                    <Route path="/platform-admins/create" element={<PlatformAdminFormPage />} />
                    <Route path="/platform-admins/edit/:id" element={<PlatformAdminFormPage />} />
                    <Route path="/admin/platform-email-signature" element={<PlatformEmailSignaturePage />} />
                    <Route path="/platform/settings" element={<PlatformSettingsPage />} />

                    <Route path="/users/scoped" element={<ScopedUsersListPage />} />

                    <Route path="/companies/create" element={<CreateCompanyPage />} />

                    <Route path="/change-password" element={<ChangePasswordPage />} />
                    <Route path="/events/list" element={<ListEventsPage />} />
                    <Route path="/events/preview/:eventId" element={<EventRegistrationPreviewPage />} />
                    <Route path="/events/create" element={<CreateEventPage />} />
                    <Route path="/events/edit/:eventId" element={<EditEventPage />} />
                    <Route path="/events/:eventId/registrations" element={<EventRegistrationsPage />} />
                    <Route path="/events/feedback" element={<EventFeedbackPage />} />

                    <Route path="/event-staff" element={<EventStaffListPage />} />
                    <Route path="/event-staff/company/:companyId" element={<EventStaffListPage />} />
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

                    <Route path="operator" element={<OperatorIndexRedirect />} />
                    <Route path="operator/setup" element={<OperatorSetupPage />} />
                    <Route path="operator/dashboard" element={<OperatorLiveDashboard />} />

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

                    <Route path="/admin/file-manager" element={<AdminFileManagerPage />} />
                    <Route path="/admin/db-console" element={<AdminDbConsolePage />} />
                    <Route path="/users/platform" element={<PlatformUsersListPage />} />
                    <Route path="/roles" element={<RolesListPage />} />

                    <Route path="/backups" element={<BackupsPage />} />
                    <Route path="/my-registrations" element={<MyRegistrationsPage />} />

                    <Route path="/policy-documents" element={<PolicyDocumentsPage />} />
                    <Route path="/policy-documents/new" element={<EditPolicyPage />} />
                    <Route path="/policy-documents/edit/:policyId" element={<EditPolicyPage />} />

                    <Route path="/scheduling/resources" element={<ResourcesPage />} />
                    <Route path="/scheduling/profiles" element={<ProfilesPage />} />
                    <Route path="/scheduling/book-test" element={<TestBookingPage />} />
                    <Route path="/scheduling/appointments" element={<AppointmentsListPage />} />
                    <Route path="/scheduling/calendar" element={<SchedulingCalendarPage />} />

                    <Route path="/correspondence/inbox" element={<InboxPage />} />
                    <Route path="/correspondence/inbox/company/:companyId" element={<InboxPage />} />
                    
                    <Route path="/correspondence/cases/company/:companyId/case/:caseId" element={<CaseDetailPage />} />               
                    <Route path="/correspondence/cases/company/:companyId" element={<CasesListPage />} />
                    <Route path="/correspondence/cases" element={<CasesListPage />} /> 

                    
                    <Route path="/correspondence/cases/:caseId/outbound/create" element={<CreateOutboundPage />} />
                    <Route path="/correspondence/cases/:caseId/outbound/:outboundId" element={<OutboundDetailPage />} />
                    <Route path="/correspondence/cases/:caseId/documents/:documentId" element={<DocumentDetailPage />} />
                    <Route path="/correspondence/inbound/manual" element={<RegisterInboundManualWizardPage  />} />
                    <Route path="/correspondence/inbox/:registryId" element={<InboxDecisionPage  />} />
                    <Route path="/correspondence/outbox" element={<OutboxPage />} />
                    <Route path="/correspondence/outbound/new" element={<CreateOutboundPage />} />
                    <Route path="/correspondence/outbox/company/:companyId" element={<OutboxPage />} />                
                    <Route path="/correspondence/inbox/import-email" element={<ImportEmailPage />} />

                  </Route>

                  <Route path="*" element={<p>Página não encontrada</p>} />
                </Routes>
              </main>

            </div>

            {/* Footer FORA DO SCROLL (não mostrar na LandingPage) */}
            {!isLanding && !isAsPublic &&(
              <Footer
                compactSpacing
                tone="dark"
                borderTone="brand"
              />
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

// ROOT APP (with providers) — mantido
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <OperatorSessionProvider>
            <SubdomainProvider>
              <NotificationProvider>
                <HelmetProvider>
                  <RouteObserver />
                  <AppLayout />
                  <ConfirmModalPortal />
                  <InfoModalPortal />                  
                </HelmetProvider>
              </NotificationProvider>
            </SubdomainProvider>
          </OperatorSessionProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}