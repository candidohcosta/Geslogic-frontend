// src/pages/platform/PlatformSettingsPage.tsx

import React, { useEffect, useState } from 'react';
import { SettingsContextTemplate, TabDef } from '../../components/templates/SettingsContextTemplate';
import { FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { UserRole } from '../../types/user';

// Tabs já existentes
import EmailSignatureTab from '../../features/settings/email/EmailSignatureTab';
import UploadsTab from '../../features/settings/uploads/UploadsTab';
import SecurityTab from '../../features/settings/security/SecurityTab';
import NotificationsTab from '../../features/settings/notifications/NotificationsTab';
import MenuTab from '../../features/settings/menus/MenuTab';
import SidebarAppearanceTab from '../../features/settings/appearance/SidebarAppearanceTab';

import CompanyDefaultsTab from '../../features/settings/company/CompanyDefaultsTab';
import CompanyOptionsTab from '../../features/settings/company/CompanyOptionsTab';

// ✅ Nova TAB: Entity Sources
import EntitySourcesTab from '../../features/settings/entity-sources/EntitySourcesTab';

import { exportSecurityBackup } from '../../services/api';
import { Button } from '../../components/ui/Button';

export default function PlatformSettingsPage() {
  const { user } = useAuth();

  // Estado das tabs
  const [activeTab, setActiveTab] = useState('email');

  const [actionsEmail, setActionsEmail] = useState<React.ReactNode>(null);
  const [actionsUploads, setActionsUploads] = useState<React.ReactNode>(null);
  const [actionsSecurity, setActionsSecurity] = useState<React.ReactNode>(null);
  const [actionsNotifications, setActionsNotifications] = useState<React.ReactNode>(null);
  const [actionsMenus, setActionsMenus] = useState<React.ReactNode>(null);
  const [actionsAppearance, setActionsAppearance] = useState<React.ReactNode>(null);
  const [actionsCompanyDefaults, setActionsCompanyDefaults] = useState<React.ReactNode>(null);
  const [actionsCompanyOptions, setActionsCompanyOptions] = useState<React.ReactNode>(null);

  // ✅ Novo estado: Entity Sources
  const [actionsEntitySources, setActionsEntitySources] = useState<React.ReactNode>(null);

  const onBackup = async () => {
    try {
      await exportSecurityBackup();
    } catch (e: any) {
      alert(e?.message ?? 'Falha ao gerar backup.');
    }
  };

  // Ler tab no hash
  useEffect(() => {
    const h = window.location.hash.replace('#', '');
    if (h) setActiveTab(h);
  }, []);

  // Atualizar hash ao mudar tab
  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  // ✅ Tab Definitions
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
    { 
      id: 'menus',
      label: 'Menus',
      content: <MenuTab onHeaderActionsChange={setActionsMenus} />,
      headerActions: actionsMenus,
    },
    {
      id: 'appearance',
      label: 'Aparência',
      content: <SidebarAppearanceTab onHeaderActionsChange={setActionsAppearance} />,
      headerActions: actionsAppearance,
    },
    {
      id: 'company-defaults',
      label: 'Defaults (Empresas)',
      content: <CompanyDefaultsTab onHeaderActionsChange={setActionsCompanyDefaults} />,
      headerActions: actionsCompanyDefaults,
    },
    {
      id: 'company-options',
      label: 'Opções (Empresas)',
      content: <CompanyOptionsTab onHeaderActionsChange={setActionsCompanyOptions} />,
      headerActions: actionsCompanyOptions,
    },

    // ✅ NOVA TAB – ENTITY SOURCES
    {
      id: 'entity-sources',
      label: 'Entity Sources',
      content: <EntitySourcesTab onHeaderActionsChange={setActionsEntitySources} />,
      headerActions: actionsEntitySources,
    },
  ];

  // ✅ Footer Actions (por tab)
  const footer =
    activeTab === 'email' ? actionsEmail :
    activeTab === 'uploads' ? actionsUploads :
    activeTab === 'security' ? actionsSecurity :
    activeTab === 'notifications' ? actionsNotifications :
    activeTab === 'menus' ? actionsMenus :
    activeTab === 'appearance' ? actionsAppearance :
    activeTab === 'company-defaults' ? actionsCompanyDefaults :
    activeTab === 'company-options' ? actionsCompanyOptions :

    // ✅ Footer da nova tab
    activeTab === 'entity-sources' ? actionsEntitySources :

    // fallback
    actionsAppearance;

  // Permissões
  if (!user || user.role !== UserRole.PLATFORM_ADMIN) return <Navigate to="/dashboard" />;

  return (
    <div
      className={[
        '[&_.pb-20]:!pb-0',
        '[&_.py-20]:!py-0',
        '[&_.pt-20]:!pt-0',
        '[&_.mt-20]:!mt-0',
      ].join(' ')}
    >
      <SettingsContextTemplate
        icon={FileText}
        title="Configurações da Plataforma"
        subtitle="Defina regras globais de e‑mail, uploads, segurança e módulos dinâmicos."
        tabs={tabs}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        footerActions={footer}
      />
    </div>
  );
}