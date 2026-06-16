// frontend/src/features/settings/security/pages/SecurityBackendPage.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getPlatformSecuritySettings,
  updatePlatformSecuritySettings,
  getPlatformSecurityCatalog,
  getAllRoles,
  updatePlatformSecurityBackendRules,
} from '../../../../services/api';

import type { SecurityCatalogDto } from '../../../../services/api';
import type { SecuritySettingsDto, Rule, RuleEntry } from './types';

import SecurityBackendDefaults from './SecurityBackendDefaults';
import SecurityBackendRules from './SecurityBackendRules';
import { deepClone, recordToList } from './utils';

export default function SecurityBackendPage() {
  const qc = useQueryClient();

  // -----------------------------------------------------------
  // LOAD ROLES
  // -----------------------------------------------------------
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: getAllRoles,
    staleTime: 10000,
  });

  const rolesList = useMemo(() => {
    if (!rolesData) return [];
    return rolesData.map((r: any) => r.name);
  }, [rolesData]);

  // -----------------------------------------------------------
  // LOAD SECURITY SETTINGS
  // -----------------------------------------------------------
  const { data: loaded, isLoading } = useQuery({
    queryKey: ['platform-settings', 'security'],
    queryFn: getPlatformSecuritySettings,
    staleTime: 10000,
  });

  // -----------------------------------------------------------
  // LOAD SECURITY CATALOG
  // -----------------------------------------------------------
  const { data: catalogData } = useQuery<SecurityCatalogDto>({
    queryKey: ['platform-settings', 'security-catalog'],
    queryFn: getPlatformSecurityCatalog,
    staleTime: 10000,
  });

  const catalogGrants = useMemo(() => {
    const set = new Set<string>();
    (catalogData?.services ?? []).forEach((svc) =>
      (svc.grants ?? []).forEach((g) => set.add(g))
    );
    return Array.from(set).sort();
  }, [catalogData]);

  const catalogBackendEndpoints = useMemo(() => {
    const set = new Set<string>();
    (catalogData?.services ?? []).forEach((svc) =>
      (svc.backendEndpoints ?? []).forEach((ep) => set.add(ep))
    );
    return Array.from(set).sort();
  }, [catalogData]);

  // -----------------------------------------------------------
  // LOCAL STATE
  // -----------------------------------------------------------
  const [form, setForm] = useState<SecuritySettingsDto | null>(null);
  const [backendList, setBackendList] = useState<RuleEntry[]>([]);

  // ★ NEW: originalBackend as REAL STATE
  const [originalBackend, setOriginalBackend] = useState<Record<string, Rule>>({});

  // -----------------------------------------------------------
  // WHEN LOADED, SYNC FORM + backendList + originalBackend
  // -----------------------------------------------------------
  useEffect(() => {
    if (!isLoading && loaded) {
      const cloned = deepClone(loaded);

      setForm(cloned);

      // backendList comes from recordToList()
      const list = recordToList(cloned.backend);
      setBackendList(list);

      // ★ VERY IMPORTANT: store ORIGINAL BACKEND as baseline
      setOriginalBackend(cloned.backend ?? {});
    }
  }, [isLoading, loaded]);

  // -----------------------------------------------------------
  // MUTATIONS
  // -----------------------------------------------------------
  const saveDefaultsMut = useMutation({
    mutationFn: async (payload: Pick<SecuritySettingsDto, 'defaults' | 'roles'>) =>
      updatePlatformSecuritySettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings', 'security'] }),
  });

  const saveBackendMut = useMutation({
    mutationFn: async (payload: { backend: Record<string, Rule> }) =>
      updatePlatformSecurityBackendRules(payload.backend),

    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ['platform-settings', 'security'],
      }),
  });

  if (!form) {
    return <p className="p-4">A carregar…</p>;
  }

  // -----------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------
  return (
    <>
      <SecurityBackendDefaults
        form={form}
        setForm={setForm}
        rolesList={rolesList}
        saveDefaultsMut={saveDefaultsMut}
      />

      <SecurityBackendRules
        form={form}
        setForm={setForm}
        backendList={backendList}
        setBackendList={setBackendList}
        rolesList={rolesList}
        catalogBackendEndpoints={catalogBackendEndpoints}
        catalogGrants={catalogGrants}
        saveBackendMut={saveBackendMut}

        // ★ PASSAR ESTADO E SETTER REAL
        originalBackend={originalBackend}
        setOriginalBackend={setOriginalBackend}
      />
    </>
  );
}