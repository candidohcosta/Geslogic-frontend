// frontend/src/features/settings/appearance/presets.ts
export const SIDEBAR_THEME_PRESETS = {
  classicDark: {
    background: '#0b1220',
    itemText: '#e5e7eb',
    hoverBg: 'rgba(255,255,255,0.08)',
    hoverText: '#ffffff',
    activeBg: 'rgba(255,255,255,0.12)',
    activeText: '#ffffff',
    borderColor: 'rgba(255,255,255,0.10)',
    backdropBlur: 'none' as const,
  },
  modernLight: {
    background: '#ffffff',
    itemText: '#374151',
    hoverBg: '#f3f4f6',
    hoverText: '#111827',
    activeBg: '#111827',
    activeText: '#ffffff',
    borderColor: '#e5e7eb',
    backdropBlur: 'none' as const,
  },
  glassDark: {
    background: '#0b1220cc',
    itemText: '#e5e7eb',
    hoverBg: 'rgba(255,255,255,0.10)',
    hoverText: '#ffffff',
    activeBg: 'rgba(255,255,255,0.16)',
    activeText: '#ffffff',
    borderColor: 'rgba(255,255,255,0.10)',
    backdropBlur: 'md' as const,
  },
  highContrast: {
    background: '#111111',
    itemText: '#ffffff',
    hoverBg: '#333333',
    hoverText: '#ffffff',
    activeBg: '#0070f3',
    activeText: '#ffffff',
    borderColor: '#333333',
    backdropBlur: 'none' as const,
  },
} as const;

export type PresetKey = keyof typeof SIDEBAR_THEME_PRESETS;