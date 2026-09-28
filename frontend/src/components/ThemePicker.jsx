import React from 'react';
import { Check } from 'lucide-react';
import { applyDisplay, readDisplay, THEMES } from '../lib/settings';

// Grid of theme cards. With `preview`, choosing a card also applies it immediately.
export function ThemePicker({ value, onChange, preview = false }) {
  return (
    <div className="theme-grid" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          className={`theme-card ${value === t.id ? 'active' : ''}`}
          onClick={() => {
            if (preview) applyDisplay({ ...readDisplay(), theme: t.id });
            onChange(t.id);
          }}
        >
          <span className="theme-swatch" style={{ background: t.swatch[1] }} aria-hidden="true">
            <span style={{ background: t.swatch[0] }} />
          </span>
          <span className="theme-name">{t.label}</span>
          <span className="theme-note">{t.note}</span>
          {value === t.id && <Check size={18} className="theme-check" />}
        </button>
      ))}
    </div>
  );
}
