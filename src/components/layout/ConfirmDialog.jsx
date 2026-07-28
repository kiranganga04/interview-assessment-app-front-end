import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

/**
 * App-wide in-app confirmation dialog, replacing native window.confirm() calls across the app
 * (candidate/interview/interviewer removal, interview/slot cancellation, etc.). A native confirm()
 * blocks the JS thread, can't be styled or keyboard-tested consistently, and gives destructive
 * actions no visual weight of their own -- exactly what the redesign brief called out.
 *
 * Usage: const confirm = useConfirm(); const ok = await confirm({ title, message, tone: 'danger' });
 * Resolves true/false; only one dialog is ever open at a time (a second call replaces the first).
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);
  const triggerRef = useRef(null);

  const confirm = useCallback((options) => {
    triggerRef.current = document.activeElement;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: options?.title || 'Are you sure?',
        message: options?.message || '',
        confirmLabel: options?.confirmLabel || 'Confirm',
        cancelLabel: options?.cancelLabel || 'Cancel',
        tone: options?.tone || 'danger'
      });
    });
  }, []);

  const settle = useCallback((result) => {
    setState(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
    // Return focus to whatever opened the dialog (the row's Remove/Cancel button, etc.)
    // so keyboard users aren't dropped back at the top of the page.
    triggerRef.current?.focus?.();
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') settle(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-backdrop" onMouseDown={() => settle(false)}>
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby={state.message ? 'confirm-dialog-message' : undefined}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            ref={(el) => el?.querySelector('button')?.focus()}
          >
            <h2 id="confirm-dialog-title" className={`confirm-dialog-title${state.tone === 'danger' ? ' is-danger' : ''}`}>
              {state.tone === 'danger' && <span className="confirm-dialog-icon" aria-hidden="true">!</span>}
              {state.title}
            </h2>
            {state.message && <p id="confirm-dialog-message" className="confirm-dialog-message">{state.message}</p>}
            <div className="confirm-dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => settle(false)}>
                {state.cancelLabel}
              </button>
              <button
                type="button"
                className={`btn ${state.tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`}
                onClick={() => settle(true)}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
