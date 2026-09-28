import { useCallback, useEffect, useState } from 'react';

// Per-device display preferences. Stored in localStorage when available; the app works without it.
const KEY = 'fincopilot.display';
export const TEXT_SIZES = [
  { id: 'normal', label: 'Normal', scale: '100%' },
  { id: 'large', label: 'Large', scale: '112.5%' },
  { id: 'xlarge', label: 'Extra large', scale: '125%' },
];
export const THEMES = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];
const DEFAULTS = { theme: 'dark', textSize: 'normal', tourDone: false };

const read = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
};

const apply = ({ theme, textSize }) => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.fontSize = (TEXT_SIZES.find((t) => t.id === textSize) || TEXT_SIZES[0]).scale;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f6f0' : '#070907');
};

// Apply saved settings before React renders, so the page never flashes the wrong theme.
apply(read());

export function useSettings() {
  const [settings, setSettings] = useState(read);

  useEffect(() => {
    apply(settings);
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Storage can be unavailable (private mode); settings then last for this visit only.
    }
  }, [settings]);

  const update = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);
  return [settings, update];
}
