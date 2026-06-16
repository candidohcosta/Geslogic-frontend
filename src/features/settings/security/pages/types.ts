// frontend/src/features/settings/security/pages/types.ts
export type Rule = {
  scope?: 'platform' | 'company';
  requiredRoles?: string[];
  requiredGrants?: string[];
  requiredFeatures?: string[];
  requireSubscribedService?: 'EVENTS' | 'QUEUES' | 'SCHEDULING';
  deny?: string[];
};

export type ScopeRules = {
  platform?: Rule;
  company?: Rule;
  subscriptions?: { requireSubscribedService?: boolean };
};

export type SecurityFlags = {
  usePolicyEngine?: boolean;
  debugSecurity?: {
    match?: boolean;
    rules?: boolean;
    grants?: boolean;
    deny?: boolean;
    defaults?: boolean;
    scope?: boolean;
    service?: boolean;
    finalDecision?: boolean;
  };
};

export type SecuritySettingsDto = {
  version?: number;

  defaults: {
    allowIfNotMatched: boolean;
  };

  roles?: Record<string, { allowIfNotMatched?: boolean }>;

  frontend?: Record<string, Rule>;
  backend?: Record<string, Rule>;

  flags?: SecurityFlags;

  policy?: {
    scopeRules?: ScopeRules;
  };

  overrides?: Record<string, Partial<SecuritySettingsDto>>;

  grantsMatrix?: Record<string, string[]>;
};

export type RuleEntry = {
  id: string;
  key: string;
  rule: Rule;
  __collapsed?: boolean;
  __isNew?: boolean;
};

export type DebugFlags = {
  match: boolean;
  rules: boolean;
  grants: boolean;
  deny: boolean;
  defaults: boolean;
  scope: boolean;
  service: boolean;
  finalDecision: boolean;
};