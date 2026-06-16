// src/features/settings/appearance/SidebarAppearanceTab.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsSectionCard } from '../../../components/templates/SettingsSectionCard';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Loader2 } from 'lucide-react';
import {
  // Sidebar (estilo + largura)
  getPlatformSidebarConfig,
  updatePlatformSidebarConfig,
  // Sidebar theme (cores do custom)
  getPlatformSidebarTheme,
  updatePlatformSidebarTheme,
  // UI Theme (global)
  getPlatformUiTheme,
  updatePlatformUiTheme,
} from '../../../services/api';
import SingleFileUpload from '../../../components/ui/SingleFileUpload';
import { FilePurpose } from '../../../types/file';

// ==== Tipos locais ====
type SidebarStyle = 'classic' | 'modern' | 'glass' | 'compact' | 'custom';

type SidebarConfig = {
  style: SidebarStyle;
  width?: number;
  presetName?: string; // mostra nome do preset atual; 'custom' quando alterado
};

type SidebarTheme = {
  background: string;
  itemText: string;
  hoverBg: string;
  hoverText: string;
  activeBg: string;
  activeText: string;
  borderColor?: string;
  backdropBlur?: 'none' | 'sm' | 'md' | 'lg';
};

type UiTheme = {
  backgroundColor: string;
  backgroundImageUrl: string | null;
  backgroundRepeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  backgroundSize: 'cover' | 'contain' | 'auto';
  backgroundPosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
  overlayColor: string;

  headerBg: string;
  headerText: string;
  headerBorder: string;

  footerBg: string;
  footerText: string;
  footerBorder: string;

  // === NOVOS CAMPOS ===
  headerBtnHoverBg?: string;
  headerBtnHoverText?: string;
  headerPanelBg?: string;
  headerPanelText?: string;

  presetName?: string; // 'Nome do preset' | 'custom'
};

// === PRESETS SIDEBAR (Custom) ===
const PRESETS_SIDEBAR: Record<string, SidebarTheme> = {
  'Classic Dark': {
    background: '#0b1220',
    itemText: '#e5e7eb',
    hoverBg: 'rgba(255,255,255,0.08)',
    hoverText: '#ffffff',
    activeBg: 'rgba(255,255,255,0.12)',
    activeText: '#ffffff',
    borderColor: 'rgba(255,255,255,0.10)',
    backdropBlur: 'none',
  },
  'Modern Light': {
    background: '#ffffff',
    itemText: '#374151',
    hoverBg: '#f3f4f6',
    hoverText: '#111827',
    activeBg: '#111827',
    activeText: '#ffffff',
    borderColor: '#e5e7eb',
    backdropBlur: 'none',
  },
  'Glass Dark': {
    background: '#0b1220cc',
    itemText: '#e5e7eb',
    hoverBg: 'rgba(255,255,255,0.10)',
    hoverText: '#ffffff',
    activeBg: 'rgba(255,255,255,0.16)',
    activeText: '#ffffff',
    borderColor: 'rgba(255,255,255,0.10)',
    backdropBlur: 'md',
  },
  'High Contrast': {
    background: '#111111',
    itemText: '#ffffff',
    hoverBg: '#333333',
    hoverText: '#ffffff',
    activeBg: '#0070f3',
    activeText: '#ffffff',
    borderColor: '#333333',
    backdropBlur: 'none',
  },
};

// === PRESETS UI THEME (GLOBAL) ===
const PRESETS_UI: Record<string, Omit<UiTheme, 'presetName'>> = {
  'Classic Dark': {
    backgroundColor: '#0b1220',
    backgroundImageUrl: null,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overlayColor: 'rgba(0,0,0,0)',
    headerBg: '#0b1220',
    headerText: '#ffffff',
    headerBorder: 'rgba(255,255,255,0.10)',
    footerBg: '#0b1220',
    footerText: '#e5e7eb',
    footerBorder: 'rgba(255,255,255,0.10)',
    // novos campos (opcional ajustar ao teu gosto)
    headerBtnHoverBg: 'rgba(255,255,255,0.10)',
    headerBtnHoverText: '#ffffff',
    headerPanelBg: '#0b1220',
    headerPanelText: '#e5e7eb',
  },
  'Modern Light': {
    backgroundColor: '#f8fafc',
    backgroundImageUrl: null,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overlayColor: 'rgba(0,0,0,0)',
    headerBg: '#ffffff',
    headerText: '#111827',
    headerBorder: '#e5e7eb',
    footerBg: '#ffffff',
    footerText: '#374151',
    footerBorder: '#e5e7eb',
    headerBtnHoverBg: '#f3f4f6',
    headerBtnHoverText: '#111827',
    headerPanelBg: '#ffffff',
    headerPanelText: '#374151',
  },
  'Glass Dark': {
    backgroundColor: '#0b1220',
    backgroundImageUrl: null,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overlayColor: 'rgba(0,0,0,0.35)',
    headerBg: 'rgba(11,18,32,0.7)',
    headerText: '#e5e7eb',
    headerBorder: 'rgba(255,255,255,0.10)',
    footerBg: 'rgba(11,18,32,0.7)',
    footerText: '#e5e7eb',
    footerBorder: 'rgba(255,255,255,0.10)',
    headerBtnHoverBg: 'rgba(255,255,255,0.10)',
    headerBtnHoverText: '#ffffff',
    headerPanelBg: '#0b1220',
    headerPanelText: '#e5e7eb',
  },
  'High Contrast': {
    backgroundColor: '#111111',
    backgroundImageUrl: null,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overlayColor: 'rgba(0,0,0,0)',
    headerBg: '#000000',
    headerText: '#ffffff',
    headerBorder: '#333333',
    footerBg: '#000000',
    footerText: '#ffffff',
    footerBorder: '#333333',
    headerBtnHoverBg: '#333333',
    headerBtnHoverText: '#ffffff',
    headerPanelBg: '#111111',
    headerPanelText: '#ffffff',
  },
};

const STYLE_OPTIONS: { value: SidebarStyle; label: string }[] = [
  { value: 'classic', label: 'Clássico (atual)' },
  { value: 'modern',  label: 'Moderno (Vercel-like)' },
  { value: 'glass',   label: 'Glass (translúcido)' },
  { value: 'compact', label: 'Compacto (denso)' },
  { value: 'custom',  label: 'Custom (cores)' },
];

type Props = { onHeaderActionsChange?: (actions: React.ReactNode) => void };

const SIDEBAR_MIN_PX = 160;
const SIDEBAR_MAX_PX = 360;

function clampWidth(v: number): number {
if (!Number.isFinite(v)) return SIDEBAR_MIN_PX;
return Math.min(SIDEBAR_MAX_PX, Math.max(SIDEBAR_MIN_PX, v));
}

export default function SidebarAppearanceTab({ onHeaderActionsChange }: Props) {
  const qc = useQueryClient();

  // ===== Queries =====
  const { data: cfgData, isLoading: loadingCfg } = useQuery({
    queryKey: ['platform-settings', 'sidebar-config'],
    queryFn: getPlatformSidebarConfig,
  });
  const { data: sidebarThemeData, isLoading: loadingSidebarTheme } = useQuery({
    queryKey: ['platform-settings', 'sidebar-theme'],
    queryFn: getPlatformSidebarTheme,
  });
  const { data: uiThemeData, isLoading: loadingUiTheme } = useQuery({
    queryKey: ['platform-settings', 'ui-theme'],
    queryFn: getPlatformUiTheme,
  });

  // ===== Estado =====
  const cfgInitial: SidebarConfig = useMemo(
    () => ({
      style: (cfgData?.style ?? 'classic') as SidebarStyle,
      width: cfgData?.width ?? 256,
      presetName:
        cfgData?.presetName ??
        ((cfgData?.style === 'custom') ? 'custom' : (cfgData?.style ?? 'classic')),
    }),
    [cfgData]
  );
  const [cfg, setCfg] = useState<SidebarConfig>(cfgInitial);

// Estado local do input (string) para permitir escrita livre
const [widthStr, setWidthStr] = useState<string>(String(cfgInitial.width ?? 256));

// Sempre que a config inicial muda (ex.: carregada do servidor), sincroniza o input
useEffect(() => {
  setWidthStr(String(cfg.width ?? cfgInitial.width ?? 256));
}, [cfgInitial.width, cfg.width]);

  const sidebarThemeInitial: SidebarTheme = useMemo(
    () => ({
      background: sidebarThemeData?.background ?? '#0b1220cc',
      itemText: sidebarThemeData?.itemText ?? '#e5e7eb',
      hoverBg: sidebarThemeData?.hoverBg ?? 'rgba(255,255,255,0.08)',
      hoverText: sidebarThemeData?.hoverText ?? '#ffffff',
      activeBg: sidebarThemeData?.activeBg ?? 'rgba(255,255,255,0.12)',
      activeText: sidebarThemeData?.activeText ?? '#ffffff',
      borderColor: sidebarThemeData?.borderColor ?? 'rgba(255,255,255,0.10)',
      backdropBlur: sidebarThemeData?.backdropBlur ?? 'md',
    }),
    [sidebarThemeData]
  );
  const [sidebarTheme, setSidebarTheme] = useState<SidebarTheme>(sidebarThemeInitial);

  const uiThemeInitial: UiTheme = useMemo(
    () => ({
      backgroundColor: uiThemeData?.backgroundColor ?? '#f8fafc',
      backgroundImageUrl: uiThemeData?.backgroundImageUrl ?? null,
      backgroundRepeat: uiThemeData?.backgroundRepeat ?? 'no-repeat',
      backgroundSize: uiThemeData?.backgroundSize ?? 'cover',
      backgroundPosition: uiThemeData?.backgroundPosition ?? 'center',
      overlayColor: uiThemeData?.overlayColor ?? 'rgba(0,0,0,0)',
      headerBg: uiThemeData?.headerBg ?? '#0b1220',
      headerText: uiThemeData?.headerText ?? '#ffffff',
      headerBorder: uiThemeData?.headerBorder ?? 'rgba(255,255,255,0.10)',
      footerBg: uiThemeData?.footerBg ?? '#0b1220',
      footerText: uiThemeData?.footerText ?? '#e5e7eb',
      footerBorder: uiThemeData?.footerBorder ?? 'rgba(255,255,255,0.10)',
      headerBtnHoverBg: uiThemeData?.headerBtnHoverBg ?? '#f3f4f6',
      headerBtnHoverText: uiThemeData?.headerBtnHoverText ?? '#111827',
      headerPanelBg: uiThemeData?.headerPanelBg ?? '#ffffff',
      headerPanelText: uiThemeData?.headerPanelText ?? '#374151',
      presetName: uiThemeData?.presetName ?? 'Modern Light',
    }),
    [uiThemeData]
  );
  const [uiTheme, setUiTheme] = useState<UiTheme>(uiThemeInitial);

  useEffect(() => { if (!loadingCfg) setCfg(cfgInitial); }, [loadingCfg, cfgInitial]);
  useEffect(() => { if (!loadingSidebarTheme) setSidebarTheme(sidebarThemeInitial); }, [loadingSidebarTheme, sidebarThemeInitial]);
  useEffect(() => { if (!loadingUiTheme) setUiTheme(uiThemeInitial); }, [loadingUiTheme, uiThemeInitial]);

  const loading = loadingCfg || loadingSidebarTheme || loadingUiTheme;

  // Dirty flags
  const cfgDirty = JSON.stringify(cfg) !== JSON.stringify(cfgInitial);
  const sidebarThemeDirty = JSON.stringify(sidebarTheme) !== JSON.stringify(sidebarThemeInitial);
  const uiThemeDirty = JSON.stringify(uiTheme) !== JSON.stringify(uiThemeInitial);
  const anythingDirty = cfgDirty || (cfg.style === 'custom' && sidebarThemeDirty) || uiThemeDirty;

  // ===== Mutations =====
  const saveCfg = useMutation({
    mutationFn: async () => updatePlatformSidebarConfig({
      style: cfg.style,
      width: cfg.width,
      presetName: cfg.presetName,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings', 'sidebar-config'] }),
  });
  const saveSidebarTheme = useMutation({
    mutationFn: async () => updatePlatformSidebarTheme(sidebarTheme),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings', 'sidebar-theme'] }),
  });
  const saveUiTheme = useMutation({
    mutationFn: async () => updatePlatformUiTheme(uiTheme),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings', 'ui-theme'] }),
  });

  const saving = saveCfg.isPending || saveSidebarTheme.isPending || saveUiTheme.isPending;

  const onSaveAll = async () => {
  // Clamp defensivo para garantir 160–360 mesmo se o utilizador não saiu do input
  setCfg((c) => ({ ...c, width: clampWidth(c.width ?? 256) }));

  await saveCfg.mutateAsync();
  if (cfg.style === 'custom') {
    await saveSidebarTheme.mutateAsync();
  }
  await saveUiTheme.mutateAsync();
  };

  const onResetAll = () => {
    setCfg(cfgInitial);
    setSidebarTheme(sidebarThemeInitial);
    setUiTheme(uiThemeInitial);
  };

  // Header/Footer actions desta Tab
  useEffect(() => {
    onHeaderActionsChange?.(
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onResetAll} disabled={!anythingDirty || saving}>
          Repor
        </Button>
        <Button onClick={onSaveAll} disabled={!anythingDirty || saving}>
          {saving ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> A guardar…</>) : 'Guardar'}
        </Button>
      </div>
    );
  }, [anythingDirty, saving, cfg, sidebarTheme, uiTheme]);

  // ===== Helpers: auto-custom =====
  function setSidebarThemeField<K extends keyof SidebarTheme>(key: K, value: SidebarTheme[K]) {
    setSidebarTheme((prev) => ({ ...prev, [key]: value }));
    setCfg((prev) => (prev.style === 'custom' && prev.presetName === 'custom'
      ? prev
      : { ...prev, style: 'custom', presetName: 'custom' }
    ));
  }
  function setUiThemeField<K extends keyof UiTheme>(key: K, value: UiTheme[K]) {
    setUiTheme((prev) => ({ ...prev, [key]: value, presetName: 'custom' }));
  }

  // ===== UI helpers =====
  const ColorFieldControlled = ({
    label, value, onChange, placeholder,
  }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-12 rounded border"
          value={toHexColor(value)}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'HEX (#RRGGBB) ou rgba(r,g,b,a)'}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <SettingsSectionCard accent title="Aparência" description="Define o estilo da sidebar e a aparência global (com suporte 'custom').">
        <div className="text-sm text-gray-500">A carregar…</div>
      </SettingsSectionCard>
    );
  }

  return (
    <div className="p-0 space-y-6">
      {/* A) Sidebar — Estilo e Largura */}
      <SettingsSectionCard
        accent
        title="Sidebar — Estilo e Largura"
        description="Escolhe o estilo visual da sidebar e a largura em pixéis. Em modo colapsado mantém-se o rail padrão."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Estilo da Sidebar */}
          <div className="space-y-1">
            <Label>Estilo (Sidebar)</Label>
            <select
              className="h-9 rounded border px-2"
              value={cfg.style}
              onChange={(e) => {
                const nextStyle = e.target.value as SidebarStyle;
                setCfg((c) => ({
                  ...c,
                  style: nextStyle,
                  presetName: nextStyle === 'custom'
                    ? (c.presetName ?? 'custom')
                    : nextStyle, // quando não custom, exibe nome do estilo
                }));
              }}
            >
              {STYLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {cfg.presetName ? `Preset atual (Sidebar): ${cfg.presetName}` : 'Preset atual (Sidebar): —'}
            </p>
          </div>

{/* Largura (px) com edição livre + dirty imediato + clamp no blur/guardar */}
<div className="space-y-1">
  <Label>Largura (px)</Label>
  <Input
    type="number"
    inputMode="numeric"
    pattern="[0-9]*"
    min={SIDEBAR_MIN_PX}
    max={SIDEBAR_MAX_PX}
    step={1}
    value={widthStr}
    onChange={(e) => {
      const raw = e.target.value;
      setWidthStr(raw);

      // Se o que está a ser escrito é um número inteiro válido, refletimos em cfg.width
      // para ativar o dirty imediatamente (mesmo sem blur)
      if (/^\d+$/.test(raw)) {
        const numeric = Number(raw);
        // NÃO clampamos aqui para não "saltar" o cursor enquanto escreves;
        // apenas refletimos o número (pode estar fora do intervalo temporariamente)
        setCfg((c) => ({ ...c, width: numeric }));
      }
      // Se estiver vazio ou não-numérico (ex. apagar tudo), não mexemos em cfg.width.
      // O clamp/normalização acontecerá no onBlur/guardar.
    }}
    onBlur={(e) => {
      // Normalizar ao sair: vazio → min; numérico → clamp
      const raw = e.target.value.trim();
      const parsed = raw === '' ? SIDEBAR_MIN_PX : Number(raw);
      const next = clampWidth(parsed);

      // Atualiza input e cfg com o valor normalizado
      setWidthStr(String(next));
      setCfg((c) => ({ ...c, width: next }));
    }}
  />
  <p className="text-xs text-gray-500">
    Intervalo permitido: {SIDEBAR_MIN_PX}–{SIDEBAR_MAX_PX}px. Aplica‑se apenas em desktop quando a sidebar está expandida.
  </p>
</div>

        </div>
      </SettingsSectionCard>

      {/* B) Sidebar (Custom) — Cores (inclui selector de preset) */}
      {cfg.style === 'custom' && (
        <SettingsSectionCard
          accent
          title="Sidebar (Custom) — Cores"
          description="Escolhe um preset e/ou ajusta as cores. Ao alterar qualquer campo, o preset fica como 'custom'."
        >
          {/* Preset selector agora DENTRO desta secção */}
          <div className="space-y-2">
            <Label>Preset (Sidebar - Custom)</Label>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded border px-2"
                value={cfg.presetName === 'custom' ? '' : (cfg.presetName ?? '')}
                onChange={(e) => {
                  const name = e.target.value;
                  const preset = PRESETS_SIDEBAR[name];
                  if (preset) {
                    setSidebarTheme(preset);
                    setCfg({ ...cfg, style: 'custom', presetName: name });
                  }
                }}
              >
                <option value="" disabled>Selecionar preset…</option>
                {Object.keys(PRESETS_SIDEBAR).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500">
                {cfg.presetName ? `Preset atual: ${cfg.presetName}` : 'Preset atual: —'}
              </span>
            </div>
          </div>

          {/* Campos de cores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <ColorFieldControlled label="Background"  value={sidebarTheme.background}  onChange={(v) => setSidebarThemeField('background', v)} />
            <ColorFieldControlled label="Texto dos itens" value={sidebarTheme.itemText} onChange={(v) => setSidebarThemeField('itemText', v)} />
            <ColorFieldControlled label="Borda do contentor" value={sidebarTheme.borderColor ?? ''} onChange={(v) => setSidebarThemeField('borderColor', v)} />
            <ColorFieldControlled label="Hover — Background" value={sidebarTheme.hoverBg} onChange={(v) => setSidebarThemeField('hoverBg', v)} />
            <ColorFieldControlled label="Hover — Texto" value={sidebarTheme.hoverText} onChange={(v) => setSidebarThemeField('hoverText', v)} />
            <ColorFieldControlled label="Selecionado — Background" value={sidebarTheme.activeBg} onChange={(v) => setSidebarThemeField('activeBg', v)} />
            <ColorFieldControlled label="Selecionado — Texto" value={sidebarTheme.activeText} onChange={(v) => setSidebarThemeField('activeText', v)} />
          </div>

          <div className="mt-4 space-y-1">
            <Label>Blur (efeito vidro na sidebar)</Label>
            <select
              className="h-9 rounded border px-2"
              value={sidebarTheme.backdropBlur ?? 'none'}
              onChange={(e) => setSidebarThemeField('backdropBlur', e.target.value as SidebarTheme['backdropBlur'])}
            >
              <option value="none">Sem blur</option>
              <option value="sm">Blur pequeno</option>
              <option value="md">Blur médio</option>
              <option value="lg">Blur forte</option>
            </select>
          </div>
        </SettingsSectionCard>
      )}

      {/* C) Aparência Global — Estilo */}
      <SettingsSectionCard
        accent
        title="Aparência Global — Estilo"
        description="Aplica-se ao fundo da aplicação (fora da sidebar) e às cores do header e footer."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Estilo global (equivalente a presets) */}
          <div className="space-y-1">
            <Label>Estilo (Global)</Label>
            <select
              className="h-9 rounded border px-2"
              value={uiTheme.presetName === 'custom' ? 'custom' : (uiTheme.presetName ?? 'Modern Light')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                  setUiTheme({ ...uiTheme, presetName: 'custom' });
                } else {
                  const preset = PRESETS_UI[val];
                  if (preset) {
                    setUiTheme({
                      ...preset,
                      backgroundImageUrl: preset.backgroundImageUrl ?? uiTheme.backgroundImageUrl ?? null,
                      presetName: val,
                    });
                  }
                }
              }}
            >
              <option value="Modern Light">Modern Light</option>
              <option value="Classic Dark">Classic Dark</option>
              <option value="Glass Dark">Glass Dark</option>
              <option value="High Contrast">High Contrast</option>
              <option value="custom">Custom (cores)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {uiTheme.presetName ? `Preset atual (Global): ${uiTheme.presetName}` : 'Preset atual (Global): —'}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Dica</Label>
            <p className="text-xs text-gray-500">
              Escolhe um preset para um arranque rápido. Se ajustares qualquer campo abaixo, o estilo passa para “custom”.
            </p>
          </div>
        </div>
      </SettingsSectionCard>

      {/* D) Aparência Global (Custom) — Cores (só quando custom) */}
      {uiTheme.presetName === 'custom' && (
        <SettingsSectionCard
          accent
          title="Aparência Global (Custom) — Cores"
          description="Controlo total do fundo, header, footer e interações do header."
        >
          <div className="grid grid-cols-1 gap-6">
            {/* Fundo Global */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Fundo (background) do conteúdo</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ColorFieldControlled label="Background (cor)"
                    value={uiTheme.backgroundColor}
                    onChange={(v) => setUiThemeField('backgroundColor', v)}
                  />
                  <ColorFieldControlled label="Overlay (véu opcional)"
                    value={uiTheme.overlayColor}
                    onChange={(v) => setUiThemeField('overlayColor', v)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Repeat</Label>
                    <select
                      className="h-9 rounded border px-2"
                      value={uiTheme.backgroundRepeat}
                      onChange={(e) => setUiThemeField('backgroundRepeat', e.target.value as UiTheme['backgroundRepeat'])}
                    >
                      <option value="no-repeat">no-repeat</option>
                      <option value="repeat">repeat</option>
                      <option value="repeat-x">repeat-x</option>
                      <option value="repeat-y">repeat-y</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Size</Label>
                    <select
                      className="h-9 rounded border px-2"
                      value={uiTheme.backgroundSize}
                      onChange={(e) => setUiThemeField('backgroundSize', e.target.value as UiTheme['backgroundSize'])}
                    >
                      <option value="cover">cover</option>
                      <option value="contain">contain</option>
                      <option value="auto">auto</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Position</Label>
                    <select
                      className="h-9 rounded border px-2"
                      value={uiTheme.backgroundPosition}
                      onChange={(e) => setUiThemeField('backgroundPosition', e.target.value as UiTheme['backgroundPosition'])}
                    >
                      <option value="center">center</option>
                      <option value="top">top</option>
                      <option value="bottom">bottom</option>
                      <option value="left">left</option>
                      <option value="right">right</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Imagem de fundo (opcional)</h4>
                <SingleFileUpload
                  ownerType="PLATFORM"
                  ownerId="singleton"
                  purpose={FilePurpose.PLATFORM_BACKGROUND_IMAGE}
                  currentFileUrl={uiTheme.backgroundImageUrl ?? undefined}
                  currentFileName={uiTheme.backgroundImageUrl ? uiTheme.backgroundImageUrl.split('/').pop() ?? null : null}
                  accept="image/*"
                  onUploadSuccess={(file) => {
                    if (file?.publicUrl) {
                      setUiThemeField('backgroundImageUrl', file.publicUrl);
                    }
                  }}
                  onFileClear={() => setUiThemeField('backgroundImageUrl', null)}
                />
              </div>
            </div>

            {/* Header */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Header</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorFieldControlled label="Background"
                  value={uiTheme.headerBg}
                  onChange={(v) => setUiThemeField('headerBg', v)}
                />
                <ColorFieldControlled label="Texto"
                  value={uiTheme.headerText}
                  onChange={(v) => setUiThemeField('headerText', v)}
                />
                <ColorFieldControlled label="Borda inferior"
                  value={uiTheme.headerBorder}
                  onChange={(v) => setUiThemeField('headerBorder', v)}
                />
              </div>

              {/* NOVO: Interações do header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <ColorFieldControlled label="Hover — Background (botões do header)"
                  value={uiTheme.headerBtnHoverBg ?? '#f3f4f6'}
                  onChange={(v) => setUiThemeField('headerBtnHoverBg', v)}
                />
                <ColorFieldControlled label="Hover — Texto (botões do header)"
                  value={uiTheme.headerBtnHoverText ?? '#111827'}
                  onChange={(v) => setUiThemeField('headerBtnHoverText', v)}
                />
              </div>

              {/* NOVO: Cores dos painéis (dropdowns) do header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <ColorFieldControlled label="Painel — Background (dropdown)"
                  value={uiTheme.headerPanelBg ?? '#ffffff'}
                  onChange={(v) => setUiThemeField('headerPanelBg', v)}
                />
                <ColorFieldControlled label="Painel — Texto (dropdown)"
                  value={uiTheme.headerPanelText ?? '#374151'}
                  onChange={(v) => setUiThemeField('headerPanelText', v)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Footer</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorFieldControlled label="Background"
                  value={uiTheme.footerBg}
                  onChange={(v) => setUiThemeField('footerBg', v)}
                />
                <ColorFieldControlled label="Texto"
                  value={uiTheme.footerText}
                  onChange={(v) => setUiThemeField('footerText', v)}
                />
                <ColorFieldControlled label="Borda superior"
                  value={uiTheme.footerBorder}
                  onChange={(v) => setUiThemeField('footerBorder', v)}
                />
              </div>
            </div>
          </div>
        </SettingsSectionCard>
      )}
    </div>
  );
}

/** Normaliza para HEX #RRGGBB (input[type=color] não suporta alpha) */
function toHexColor(value?: string): string {
  if (!value) return '#000000';
  const hex = String(value).trim();

  if (/^#([0-9a-f]{3})$/i.test(hex)) return expandShortHex(hex);
  if (/^#([0-9a-f]{6})$/i.test(hex)) return hex;
  if (/^#([0-9a-f]{8})$/i.test(hex)) return hex.slice(0, 7); // remove alpha

  const m = hex.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
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