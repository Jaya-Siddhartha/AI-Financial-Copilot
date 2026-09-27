import React from 'react';
import { avatarColor, initials } from '../../lib/format';

export function Avatar({ name, size = 40 }) {
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}
