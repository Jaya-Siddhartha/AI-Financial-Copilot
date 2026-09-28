import React from 'react';
import { CircleHelp } from 'lucide-react';

// A tap-to-open explanation in plain words. Uses <details>, so it works with keyboards and
// screen readers without extra code.
export function Help({ label = 'What does this mean?', children }) {
  return (
    <details className="help">
      <summary>
        <CircleHelp size={18} aria-hidden="true" />
        {label}
      </summary>
      <div className="help-body">{children}</div>
    </details>
  );
}
