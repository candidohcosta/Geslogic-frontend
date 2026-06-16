// frontend/src/features/settings/security/SecurityIndex.tsx
import React, { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import SecurityBackendPage from './pages/SecurityBackendPage';
import SecurityFrontendPage from './pages/SecurityFrontendPage';
import SecurityCatalogPage from './pages/SecurityCatalogPage';
import SecurityMatrixPage from './pages/SecurityMatrixPage';
import SecurityPolicyPage from './pages/SecurityPolicyPage';
import SecurityCoveragePage from './pages/SecurityCoverageReportPage';
import SecurityServicesRegistryPage from './pages/SecurityServicesRegistryPage';
import SecurityDebugLogsPage from './pages/SecurityDebugLogsPage';
import SecurityTesterPage from './pages/SecurityTesterPage';
import SecurityLogsViewerPage from './pages/SecurityLogsViewerPage';

type Subtab = 'services' |'backend' | 'frontend' | 'policy' | 'catalog' | 'matrix' | 'coverage' | 'debug' | 'tester' | 'security-logs';

export default function SecurityIndex() {
  const [activeSubtab, setActiveSubtab] = useState<Subtab>('backend');

  // Preservar hash (como fazias antes)
  useEffect(() => {
    const h = window.location.hash.replace('#', '') as Subtab;
    if (h && ['services','backend','frontend','policy','catalog','matrix','coverage','debug','tester', 'security-logs'].includes(h)) {
      setActiveSubtab(h);
    }
  }, []);
  useEffect(() => {
    window.location.hash = activeSubtab;
  }, [activeSubtab]);

  return (
    <div className="min-w-0 w-full">
      {/* NAV (mesma aparência que tinhas) */}
      <div className="mb-3 flex items-center gap-2 min-w-0">        
        <Button variant={activeSubtab === 'services' ? 'default' : 'outline'} onClick={() => setActiveSubtab('services')}>
          Serviços
        </Button>
        <Button variant={activeSubtab === 'backend' ? 'default' : 'outline'} onClick={() => setActiveSubtab('backend')}>
          Backend
        </Button>
        <Button variant={activeSubtab === 'frontend' ? 'default' : 'outline'} onClick={() => setActiveSubtab('frontend')}>
          Frontend
        </Button>
        <Button variant={activeSubtab === 'policy' ? 'default' : 'outline'} onClick={() => setActiveSubtab('policy')}>
          Política Global
        </Button>
        <Button variant={activeSubtab === 'catalog' ? 'default' : 'outline'} onClick={() => setActiveSubtab('catalog')}>
          Catálogo
        </Button>
        <Button variant={activeSubtab === 'matrix' ? 'default' : 'outline'} onClick={() => setActiveSubtab('matrix')}>
          Matriz
        </Button>
        <Button variant={activeSubtab === 'coverage' ? 'default' : 'outline'} onClick={() => setActiveSubtab('coverage')}>
          Cobertura
        </Button>
        <Button variant={activeSubtab === 'debug' ? 'default' : 'outline'} onClick={() => setActiveSubtab('debug')}>
          Debug
        </Button>
        <Button variant={activeSubtab === 'tester' ? 'default' : 'outline'} onClick={() => setActiveSubtab('tester')}>
          Live Tester
        </Button>
        <Button variant={activeSubtab === 'security-logs' ? 'default' : 'outline'} onClick={() => setActiveSubtab('security-logs')}>
          Logs
        </Button>

      </div>

      {/* RENDER (mantém o aspeto das tuas subtabs) */}
      {activeSubtab === 'services' && <SecurityServicesRegistryPage />}
      {activeSubtab === 'backend' && <SecurityBackendPage />}
      {activeSubtab === 'frontend' && <SecurityFrontendPage />}
      {activeSubtab === 'policy' && <SecurityPolicyPage />}
      {activeSubtab === 'catalog' && <SecurityCatalogPage />}
      {activeSubtab === 'matrix' && <SecurityMatrixPage />}
      {activeSubtab === 'coverage' && <SecurityCoveragePage />}
      {activeSubtab === 'debug' && <SecurityDebugLogsPage />}
      {activeSubtab === 'tester' && <SecurityTesterPage />}
      {activeSubtab === 'security-logs' && <SecurityLogsViewerPage />}
    </div>
  );
}