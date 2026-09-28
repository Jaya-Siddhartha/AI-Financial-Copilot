import React, { useEffect, useRef } from 'react';
import { ArrowLeft, X } from 'lucide-react';

// Bottom sheet on phones, centred dialog on larger screens.
// `locked` keeps it open while a payment is being processed.
export function Sheet({ title, onClose, onBack, footer, locked = false, children }) {
  const panelRef = useRef(null);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const close = () => {
    if (!lockedRef.current) onClose();
  };

  // Move focus into the sheet when it opens and back to where it was when it closes.
  useEffect(() => {
    const previous = document.activeElement;
    // Leave focus alone if a field inside already took it (autoFocus).
    if (panelRef.current && !panelRef.current.contains(document.activeElement)) panelRef.current.focus();
    return () => {
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      // Keep Tab inside the sheet.
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  });

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={panelRef} tabIndex={-1}>
        <div className="sheet-head">
          {onBack && (
            <button type="button" className="icon-btn" onClick={onBack} aria-label="Back" disabled={locked}>
              <ArrowLeft size={22} />
            </button>
          )}
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Close" disabled={locked}>
            <X size={22} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
