// frontend/src/features/settings/security/pages/SecurityFrontendPage.tsx
import React from 'react';
import SecurityRolesMatrixPane from '../SecurityRolesMatrixPane';

export default function SecurityMatrixPage() {
  return (
    <div className="min-w-0 w-full">
      <SecurityRolesMatrixPane />
    </div>
  );
}