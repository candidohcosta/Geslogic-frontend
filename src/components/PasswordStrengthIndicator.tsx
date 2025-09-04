// src/components/PasswordStrengthIndicator.tsx

import React from 'react';
import { validatePassword } from '../lib/validation';

interface PasswordStrengthIndicatorProps {
  password?: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password = '' }) => {
  const results = validatePassword(password);

  return (
    <div className="mt-2 text-xs text-gray-600 space-y-1">
      {results.map((result, index) => (
        <p key={index} className={result.valid ? 'text-green-600' : 'text-red-600'}>
          {result.valid ? '✓' : '✗'} {result.label}
        </p>
      ))}
    </div>
  );
};

export default PasswordStrengthIndicator;