// src/services/entitySourcesApi.ts
import { apiFetch, apiPost } from './api';

// GET all entity sources
export const fetchEntitySources = async () => {
  const res = await apiFetch('/platform-settings/entity-sources');
  return res.entitySources || {};
};

// PUT full entitySources object
export const saveEntitySources = async (entitySources: any) => {
  return apiFetch('/platform-settings/entity-sources', {
    method: 'PUT',
    body: JSON.stringify({ entitySources }),
    headers: { 'Content-Type': 'application/json' },
  });
};

// Test a single entity source
export const testEntitySource = async (entity: string) => {
  return apiFetch(`/platform-settings/entity-sources/test?entity=${entity}`);
};