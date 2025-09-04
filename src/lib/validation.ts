// src/lib/validation.ts

export const passwordRequirements = [
  { label: 'Pelo menos 10 caracteres', regex: /.{10,}/ },
  { label: 'Pelo menos uma letra maiúscula', regex: /[A-Z]/ },
  { label: 'Pelo menos uma letra minúscula', regex: /[a-z]/ },
  { label: 'Pelo menos um algarismo', regex: /\d/ },
  { label: 'Pelo menos um caracter especial', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~` ]/ },
];

export const validatePassword = (password: string): { label: string; valid: boolean }[] => {
  return passwordRequirements.map(req => ({
    label: req.label,
    valid: req.regex.test(password),
  }));
};