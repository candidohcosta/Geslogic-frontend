// frontend/src/features/settings/security/pages/SecurityTesterPage.tsx
import React, { useState } from "react";
import { SettingsSectionCard } from "../../../../components/templates/SettingsSectionCard";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { Label } from "../../../../components/ui/Label";
import { Switch } from "../../../../components/ui/Switch";
import { useMutation } from "@tanstack/react-query";
import ChipsInput from '../../../../components/ui/ChipsInputModern';

import { useQuery } from "@tanstack/react-query";
import { getAllRoles, getPlatformSecuritySettings } from "../../../../services/api";


async function testSecurity(body: any) {
  const res = await fetch("/api/security/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function SecurityTesterPage() {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/logs");

  const [role, setRole] = useState("OPERATOR");



  const { data: rolesDb } = useQuery({
    queryKey: ['roles'],
    queryFn: getAllRoles,
    staleTime: 10_000,
  });

  const roleOptions = rolesDb?.map(r => r.name) ?? [];



  const [grants, setGrants] = useState<string[]>([]);
  const [subs, setSubs] = useState<string[]>([]);

  const [result, setResult] = useState<any>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const r = await testSecurity({
        method,
        path,
        effectiveRole: role,
        grants,
        subscribedServices: subs,
      });
      setResult(r);
      return r;
    }
  });

  const toggleSub = (svc: string) =>
    setSubs((prev) =>
      prev.includes(svc) ? prev.filter((x) => x !== svc) : [...prev, svc]
    );

  return (
    <SettingsSectionCard
      accent
      title="Security Live Tester"
      description="Simula decisões do motor de segurança (SecurityEngine)."
    >
      <div className="space-y-4">

        {/* INPUTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Método</Label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="border rounded h-9 px-2 w-full"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Label>Path</Label>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/logs"
            />
          </div>
        </div>

        {/* ROLE */}
        <div>
        <Label>effectiveRole</Label>

        {/* fetch roles from settings.grantsMatrix */}
<select
  className="border rounded h-9 px-2 w-full"
  value={role}
  onChange={(e) => setRole(e.target.value)}
>
  {roleOptions.map((r) => (
    <option key={r} value={r}>
      {r}
    </option>
  ))}
</select>

{roleOptions.length === 0 && (
  <p className="text-xs text-gray-500 mt-1">
    Sem roles definidos na base de dados.
  </p>
)}
        </div>

        {/* GRANTS */}
        <ChipsInput
          label="Grants"
          values={grants}
          onChange={(vals) => setGrants(vals)}
          suggestions={[]}
          placeholder="queues:admin, logs:view"
        />

        {/* SUBSCRIÇÕES */}
        <div className="space-y-2">
          <Label>Subscrições</Label>
          {["EVENTS", "QUEUES", "SCHEDULING"].map((svc) => (
            <label key={svc} className="flex items-center gap-2 text-sm">
              <Switch
                checked={subs.includes(svc)}
                onCheckedChange={() => toggleSub(svc)}
              />
              {svc}
            </label>
          ))}
        </div>

        {/* BOTÃO */}
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "A testar…" : "Testar"}
        </Button>

        {/* RESULTADO */}
        {result && (
          <div className="mt-6 border rounded p-4 bg-gray-50">
            <div className="text-lg font-bold">
              {result.allow ? (
                <span className="text-emerald-600">ALLOW</span>
              ) : (
                <span className="text-rose-600">DENY</span>
              )}
            </div>

            <pre className="mt-3 text-xs bg-black text-green-300 p-3 rounded overflow-auto">
{JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </SettingsSectionCard>
  );
}