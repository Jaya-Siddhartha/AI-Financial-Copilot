import React from 'react';
import { STATUS_META } from '../../lib/format';

export function StatusChip({ status }) {
  const meta = STATUS_META[status] || STATUS_META.SAFE;
  return (
    <span className={`chip ${meta.tone}`}>
      <span className="chip-dot" />
      {meta.label}
    </span>
  );
}
