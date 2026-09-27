import React from 'react';
import { AlertTriangle, CircleAlert, Info } from 'lucide-react';

const ICONS = { red: CircleAlert, amber: AlertTriangle, brand: Info, green: Info };

export function Alert({ tone = 'red', children }) {
  const Icon = ICONS[tone];
  return (
    <div className={`alert ${tone}`} role={tone === 'red' ? 'alert' : undefined}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}
