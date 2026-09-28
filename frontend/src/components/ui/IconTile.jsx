import React from 'react';

export function IconTile({ icon: Icon, label, onClick, primary = false }) {
  return (
    <button type="button" className={`tile ${primary ? 'primary' : ''}`} onClick={onClick}>
      <span className="tile-icon">
        <Icon size={26} strokeWidth={1.8} />
      </span>
      <span className="tile-label">{label}</span>
    </button>
  );
}
