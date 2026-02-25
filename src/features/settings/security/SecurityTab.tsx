// src/features/settings/security/SecurityTab.tsx
import React, { useEffect, useState } from 'react';
import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';

// Futuro: integrar com platform_settings
// const { data, isLoading } = useQuery(...)
// const { mutate: save } = useMutation(...)

type Props = {
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
};

export default function SecurityTab({ onHeaderActionsChange }: Props) {
  // -------- PASSWORD POLICY ------------------
  const [minLength, setMinLength] = useState(8);
  const [requireUpper, setRequireUpper] = useState(true);
  const [requireNumber, setRequireNumber] = useState(true);
  const [requireSymbol, setRequireSymbol] = useState(false);
  const [expireDays, setExpireDays] = useState<number | null>(null);
  const [prohibitReuse, setProhibitReuse] = useState(5);

  // -------- SESSION ---------------------------
  const [sessionTTL, setSessionTTL] = useState(60);
  const [idleTimeout, setIdleTimeout] = useState(true);
  const [forceLogoutOnPasswordChange, setForceLogoutOnPasswordChange] = useState(true);

  // -------- 2FA -------------------------------
  const [twoFAAll, setTwoFAAll] = useState(false);
  const [twoFAPlatformAdmin, setTwoFAPlatformAdmin] = useState(true);
  const [twoFASupportL2, setTwoFASupportL2] = useState(true);

  // -------- PER-PAGE SECURITY RULES -----------
  const pages = [
    '/support/tickets',
    '/support/chat',
    '/admin/companies',
    '/admin/users',
    '/files',
  ];

  const [selectedPage, setSelectedPage] = useState<string>(pages[0]);
  const [pageRequireAuth, setPageRequireAuth] = useState(true);
  const [pageRequire2FA, setPageRequire2FA] = useState(false);
  const [pageRateLimit, setPageRateLimit] = useState(false);
  const [pageLogRequests, setPageLogRequests] = useState(true);

  const [allowedRoles, setAllowedRoles] = useState<string[]>([
    'PLATFORM_ADMIN',
    'SUPPORT_L2',
  ]);

  // Futuro: guardar
  const onSave = () => {
    alert('Guardar segurança (exemplo). No futuro: enviar para /platform-settings/security');
  };

  const onReset = () => {
    alert('Repor valores default (exemplo).');
  };

  // Ações no header & footer
  useEffect(() => {
    onHeaderActionsChange?.(
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onReset}>
          Repor
        </Button>
        <Button onClick={onSave}>Guardar</Button>
      </div>
    );
  }, [onHeaderActionsChange]);

  // -------------------------------------------------------
  //  UI
  // -------------------------------------------------------
  return (
    <>
      {/* PASSWORD POLICY */}
      <SettingsSectionCard
        accent
        title="Políticas de Password"
        description="Regras aplicadas a todos os utilizadores."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Mínimo de caracteres</Label>
            <Input
              type="number"
              min={4}
              value={minLength}
              onChange={e => setMinLength(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Switch checked={requireUpper} onCheckedChange={setRequireUpper} />
            <Label>Requer maiúsculas</Label>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Switch checked={requireNumber} onCheckedChange={setRequireNumber} />
            <Label>Requer número</Label>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Switch checked={requireSymbol} onCheckedChange={setRequireSymbol} />
            <Label>Requer símbolo</Label>
          </div>

          <div>
            <Label>Expira em (dias)</Label>
            <Input
              type="number"
              min={0}
              value={expireDays ?? ''}
              placeholder="0 = Nunca"
              onChange={e =>
                setExpireDays(e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>

          <div>
            <Label>Proibir reutilização das últimas X passwords</Label>
            <Input
              type="number"
              min={0}
              value={prohibitReuse}
              onChange={e => setProhibitReuse(Number(e.target.value))}
            />
          </div>
        </div>
      </SettingsSectionCard>

      {/* SESSION */}
      <SettingsSectionCard
        accent
        title="Sessão"
        description="Definições globais da sessão de autenticação."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Duração (minutos)</Label>
            <Input
              type="number"
              min={5}
              value={sessionTTL}
              onChange={e => setSessionTTL(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Switch checked={idleTimeout} onCheckedChange={setIdleTimeout} />
            <Label>Terminar após inatividade</Label>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Switch
              checked={forceLogoutOnPasswordChange}
              onCheckedChange={setForceLogoutOnPasswordChange}
            />
            <Label>Logout ao alterar password</Label>
          </div>
        </div>
      </SettingsSectionCard>

      {/* 2FA */}
      <SettingsSectionCard
        accent
        title="Autenticação de 2 Fatores (2FA)"
        description="Regras aplicadas por tipo de utilizador."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Switch checked={twoFAAll} onCheckedChange={setTwoFAAll} />
            <Label>Obrigatório para todos os utilizadores</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={twoFAPlatformAdmin} onCheckedChange={setTwoFAPlatformAdmin} />
            <Label>Obrigatório para Platform Admin</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={twoFASupportL2} onCheckedChange={setTwoFASupportL2} />
            <Label>Obrigatório para Support L2</Label>
          </div>
        </div>
      </SettingsSectionCard>

      {/* PAGE RULES */}
      <SettingsSectionCard
        accent
        title="Regras por Página/Endpoint"
        description="Configura segurança por rota importante."
      >
        {/* Select página */}
        <Label>Escolher página</Label>
        <select
          className="border rounded-md h-9 px-2 mb-4"
          value={selectedPage}
          onChange={e => setSelectedPage(e.target.value)}
        >
          {pages.map(p => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Switch checked={pageRequireAuth} onCheckedChange={setPageRequireAuth} />
            <Label>Requer autenticação</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={pageRequire2FA} onCheckedChange={setPageRequire2FA} />
            <Label>Requer 2FA</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={pageRateLimit} onCheckedChange={setPageRateLimit} />
            <Label>Rate Limit</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={pageLogRequests} onCheckedChange={setPageLogRequests} />
            <Label>Log Requests</Label>
          </div>
        </div>

        {/* ROLES PERMITIDOS */}
        <div className="mt-4">
          <Label>Roles Permitidos</Label>
          <select
            multiple
            className="border rounded-md w-full h-32 p-2"
            value={allowedRoles}
            onChange={e =>
              setAllowedRoles(Array.from(e.target.selectedOptions).map(o => o.value))
            }
          >
            <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
            <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
            <option value="SUPPORT_L2">SUPPORT_L2</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="USER">USER</option>
          </select>
        </div>
      </SettingsSectionCard>
    </>
  );
}