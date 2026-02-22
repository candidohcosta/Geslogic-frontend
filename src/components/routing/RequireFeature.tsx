// src/components/routing/RequireFeature.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { can, type FeatureKey } from '../../lib/authz';

interface RequireFeatureProps {
  allOf?: FeatureKey[];
  anyOf?: FeatureKey[];
  redirectTo?: string;
  children: React.ReactNode;
}

const RequireFeature: React.FC<RequireFeatureProps> = ({
  allOf,
  anyOf,
  redirectTo = '/dashboard',
  children,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null; // evita flicker (podes trocar por skeleton)

  const hasAll = (allOf ?? []).every((f) => can(user as any, f));
  const hasAny = (anyOf ?? []).length ? (anyOf ?? []).some((f) => can(user as any, f)) : true;

  if (hasAll && hasAny) return <>{children}</>;

  return <Navigate to={redirectTo} replace state={{ from: location }} />;
};

export default RequireFeature;