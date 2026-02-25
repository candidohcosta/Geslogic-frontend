// src/pages/platform/PlatformSettingsPage.tsx
import React, { useEffect, useState } from 'react';
import { SettingsContextTemplate, TabDef } from '../../components/templates/SettingsContextTemplate';
import { FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { UserRole } from '../../types/user';
import EmailSignatureTab from '../../features/settings/email/EmailSignatureTab';
import UploadsTab from '../../features/settings/uploads/UploadsTab';
import SecurityTab from '../../features/settings/security/SecurityTab';
import NotificationsTab from '../../features/settings/notifications/NotificationsTab';

export default function PlatformSettingsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('email');
  const [actionsEmail, setActionsEmail] = useState<React.ReactNode>(null);
  const [actionsUploads, setActionsUploads] = useState<React.ReactNode>(null);
  const [actionsSecurity, setActionsSecurity] = useState<React.ReactNode>(null);
  const [actionsNotifications, setActionsNotifications] = useState<React.ReactNode>(null);

  useEffect(() => {
    const h = window.location.hash.replace('#', '');
    if (h) setActiveTab(h);
  }, []);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  const tabs: TabDef[] = [
    {
      id: 'email',
      label: 'E‑mail',
      content: <EmailSignatureTab onHeaderActionsChange={setActionsEmail} />,
      headerActions: actionsEmail,
    },
    {
      id: 'uploads',
      label: 'Uploads',
      content: <UploadsTab onHeaderActionsChange={setActionsUploads} />,
      headerActions: actionsUploads,
    },
    {
      id: 'security',
      label: 'Segurança',
      content: <SecurityTab onHeaderActionsChange={setActionsSecurity} />,
      headerActions: actionsSecurity,
    },
    {
      id: 'notifications',
      label: 'Notificações',
      content: <NotificationsTab onHeaderActionsChange={setActionsNotifications} />,
      headerActions: actionsNotifications,
    },
  ];

  const footer =
    activeTab === 'email' ? actionsEmail :
    activeTab === 'uploads' ? actionsUploads :
    activeTab === 'security' ? actionsSecurity :
    actionsNotifications;

 if (!user || user.role !== UserRole.PLATFORM_ADMIN) return <Navigate to="/dashboard" />;

  return (
    <SettingsContextTemplate
      icon={FileText}
      title="Configurações da Plataforma"
      subtitle="Defina regras globais de e‑mail, uploads, segurança e notificações."
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={setActiveTab}
      footerActions={footer}
    />
  );
}