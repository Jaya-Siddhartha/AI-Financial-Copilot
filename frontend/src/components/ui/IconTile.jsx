import React from 'react';

export function IconTile({ icon: Icon, label, onClick }) {
  return (
    <button type="button" className="tile" onClick={onClick}>
      <span className="tile-icon">
        <Icon size={24} strokeWidth={1.8} />
      </span>
      <span>{label}</span>
    </button>
  );
}
