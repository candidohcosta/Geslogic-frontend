// frontend/src/features/settings/appearance/SidebarColorsTab.tsx
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Button } from '../../../components/ui/Button';
import { Label } from '../../../components/ui/Label';
import { Input } from '../../../components/ui/Input';
import { Loader2 } from 'lucide-react';
import {
  getPlatformSidebarTheme,
  updatePlatformSidebarTheme,
  SidebarTheme,
} from '../../../services/api';
import { SIDEBAR_THEME_PRESETS, PresetKey } from './presets';

type Props = { onHeaderActionsChange?: (actions: React.ReactNode) => void };

export default function SidebarColorsTab({ onHeaderActionsChange }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['platform-settings', 'sidebar-theme'],
    queryFn: getPlatformSidebarTheme,
  });

  const original: SidebarTheme | undefined = data;
  const [theme, setTheme] = useState<SidebarTheme>({
    background: '#0b1220cc',
    itemText: '#e5e7eb',
    hoverBg: 'rgba(255,255,255,0.08)',
    hoverText: '#ffffff',
    activeBg: 'rgba(255,255,255,0.12)',
    activeText: '#ffffff',
    borderColor: 'rgba(255,255,255,0.10)',
    backdropBlur: 'md',
  });

  useEffect(() => {
    if (!isLoading && original) setTheme(original);
  }, [isLoading, original]);

  const dirty = JSON.stringify(theme) !== JSON.stringify(original);
  const { mutate: save, isPending } = useMutation({
    mutationFn: () => updatePlatformSidebarTheme(theme),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings', 'sidebar-theme'] }),
  });

  useEffect(() => {
    onHeaderActionsChange?.(
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => original && setTheme(original)} disabled={!dirty || isPending}>
          Repor
        </Button>
        <Button onClick={() => save()} disabled={!dirty || isPending}>
          {isPending ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> A guardar…</>) : 'Guardar'}
        </Button>
      </div>
    );
  }, [dirty, isPending, original, theme]);

  const applyPreset = (key: PresetKey) => {
    setTheme(prev => ({ ...prev, ...SIDEBAR_THEME_PRESETS[key] }));
  };

  const colorInput = (
    id: keyof SidebarTheme,
    label: string,
    type: 'color' | 'text' = 'text',
    placeholder?: string,
  ) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      {type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-9 w-12 rounded border"
            value={toHexColor(theme[id] ?? '#000000')}
            onChange={(e) => setTheme({ ...theme, [id]: e.target.value })}
          />
          <Input
            value={theme[id] ?? ''}
            onChange={(e) => setTheme({ ...theme, [id]: e.target.value })}
            placeholder={placeholder}
          />
        </div>
      ) : (
        <Input
          value={theme[id] ?? ''}
          onChange={(e) => setTheme({ ...theme, [id]: e.target.value })}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  if (isLoading) {
    return (
      <SettingsSectionCard accent title="Cores da Sidebar" description="Defina as cores base e dos estados (hover/ativo).">
        <div className="text-sm text-gray-500">A carregar…</div>
      </SettingsSectionCard>
    );
  }

  return (
    <>
      <SettingsSectionCard accent title="Presets" description="Escolha um ponto de partida e depois afine.">
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded border px-2"
            onChange={(e) => {
              const k = e.target.value as PresetKey;
              if (k) applyPreset(k);
            }}
            defaultValue=""
          >
            <option value="" disabled>Selecionar preset…</option>
            <option value="classicDark">Classic Dark</option>
            <option value="modernLight">Modern Light</option>
            <option value="glassDark">Glass Dark</option>
            <option value="highContrast">High Contrast</option>
          </select>
          <Button variant="outline" onClick={() => original && setTheme(original)}>
            Repor para guardado
          </Button>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard accent title="Cores base" description="Aplicadas ao contentor e ao texto dos itens.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {colorInput('background', 'Background', 'color', 'HEX/RGB(A)')}
          {colorInput('itemText', 'Texto dos itens', 'color')}
          {colorInput('borderColor', 'Cor da borda', 'color')}
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard accent title="Estados (Hover / Ativo)" description="Cores aplicadas a interações dos itens.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {colorInput('hoverBg', 'Hover — Background', 'color')}
          {colorInput('hoverText', 'Hover — Texto', 'color')}
          {colorInput('activeBg', 'Selecionado — Background', 'color')}
          {colorInput('activeText', 'Selecionado — Texto', 'color')}
        </div>
        <div className="mt-4 space-y-1">
          <Label>Blur (para efeito glass)</Label>
          <select
            className="h-9 rounded border px-2"
            value={theme.backdropBlur ?? 'none'}
            onChange={(e) => setTheme({ ...theme, backdropBlur: e.target.value as SidebarTheme['backdropBlur'] })}
          >
            <option value="none">Sem blur</option>
            <option value="sm">Blur pequeno</option>
            <option value="md">Blur médio</option>
            <option value="lg">Blur forte</option>
          </select>
        </div>
      </SettingsSectionCard>
    </>
  );
}

function toHexColor(value?: string): string {
  if (!value) return '#000000';
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) {
    if (value.length === 9) return value.slice(0, 7);
    return value.length === 4 ? expandShortHex(value) : value;
  }
  const m = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (m) {
    const [r, g, b] = m.slice(1, 4).map((n) => Math.max(0, Math.min(255, parseInt(n, 10))));
    return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
  }
  return '#000000';
}
function expandShortHex(hex: string): string {
  const r = hex[1], g = hex[2], b = hex[3];
  return `#${r}${r}${g}${g}${b}${b}`;
}