// Display preferences: theme and text size. Saved to the user's profile (so they follow the user
// to any device) and mirrored in localStorage so the right look shows before sign-in finishes.

export const THEMES = [
  { id: 'purple', label: 'Purple', note: 'Default', swatch: ['#5f259f', '#f2eff7'] },
  { id: 'light', label: 'Light', note: 'White and blue', swatch: ['#1a5fd0', '#ffffff'] },
  { id: 'dark', label: 'Dark', note: 'Easy at night', swatch: ['#8ab4f8', '#181b21'] },
  { id: 'doomsday', label: 'Doomsday', note: 'Black and lime', swatch: ['#9dff00', '#070907'] },
  { id: 'saffron', label: 'Saffron', note: 'Navy, saffron, green', swatch: ['#e8710a', '#1c2a5e'] },
  { id: 'ocean', label: 'Ocean', note: 'Navy and sky blue', swatch: ['#00a3e0', '#002e6e'] },
];
export const TEXT_SIZES = [
  { id: 'normal', label: 'Normal', scale: '100%' },
  { id: 'large', label: 'Large', scale: '112.5%' },
  { id: 'xlarge', label: 'Extra large', scale: '125%' },
];

const KEY = 'fincopilot.display';
const THEME_BAR = { purple: '#5f259f', light: '#ffffff', dark: '#181b21', doomsday: '#070907', saffron: '#1c2a5e', ocean: '#002e6e' };

export const readDisplay = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { theme: THEMES.some((t) => t.id === saved.theme) ? saved.theme : 'purple', textSize: saved.textSize || 'normal' };
  } catch {
    return { theme: 'purple', textSize: 'normal' };
  }
};

export const applyDisplay = ({ theme, textSize }) => {
  const id = THEMES.some((t) => t.id === theme) ? theme : 'purple';
  document.documentElement.dataset.theme = id;
  document.documentElement.style.fontSize = (TEXT_SIZES.find((t) => t.id === textSize) || TEXT_SIZES[0]).scale;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BAR[id]);
  try {
    localStorage.setItem(KEY, JSON.stringify({ theme: id, textSize }));
  } catch {
    // Storage may be blocked; the profile still keeps the choice.
  }
};

// Apply the last-used look before React renders, so the page never flashes another theme.
applyDisplay(readDisplay());
