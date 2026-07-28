import React, { useEffect, useMemo, useRef, useState } from 'react';
import { searchCandidates } from '../api/apiClient';

/**
 * People Management: a searchable candidate picker (type-ahead combobox) that replaces the
 * name-only <select> used when booking/creating an interview. Recruiters can search by
 * NAME, EMAIL, MOBILE, or ROLE and pick from rich rows, so two candidates who share a name are
 * distinguishable at a glance.
 *
 * It queries the existing, RBAC-protected, server-side search endpoint
 * (GET /api/candidates/search -> searchCandidates) so it scales past the plain
 * listCandidates() 500-row cap and never loads the whole directory into the browser.
 *
 * Controlled component:
 *   value              - selected candidateId ('' when none)
 *   onChange(id, cand) - called with the new candidateId (as a string) and the full candidate
 *                        object (or '' / null when cleared)
 *   initialCandidate   - optional candidate object used to render the selected chip on first
 *                        paint when `value` is set from outside (e.g. editing an existing record)
 *   disabled, autoFocus, placeholder - standard field props
 *   error              - when true, the input border is drawn in the danger colour
 */
export default function CandidateSearchSelect({
  value = '',
  onChange,
  initialCandidate = null,
  disabled = false,
  autoFocus = false,
  placeholder = 'Search by name, email, or mobile…',
  error = false
}) {
  const [selected, setSelected] = useState(initialCandidate);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  // Monotonic request id so a slow earlier search can't overwrite a newer one's results.
  const reqIdRef = useRef(0);

  // Keep the selected chip in sync when the parent drives `value` (cleared after creating a new
  // candidate, or an existing candidate passed in for edit). We only trust `initialCandidate` when
  // its id matches the incoming value; otherwise a falsy value clears the chip.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (initialCandidate && String(initialCandidate.candidateId) === String(value)) {
      setSelected(initialCandidate);
    }
    // If value is set but we have no object to show, the chip simply stays on whatever was last
    // selected in-component (the common case, since selection happens here).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initialCandidate]);

  // Debounced server-side search. An empty query (once focused) still fetches the first page so the
  // control doubles as a browsable list, matching the old dropdown's "open and pick" affordance.
  useEffect(() => {
    if (!open || selected) return undefined;
    const handle = setTimeout(() => {
      const myReq = ++reqIdRef.current;
      setLoading(true);
      setFailed(false);
      const params = { page: 0, size: 8, sort: 'candidateName,asc' };
      const q = query.trim();
      if (q) params.search = q;
      searchCandidates(params)
        .then((data) => {
          if (myReq !== reqIdRef.current) return; // a newer search superseded this one
          const rows = Array.isArray(data) ? data : (data?.content || []);
          setResults(rows);
          setActiveIndex(rows.length ? 0 : -1);
        })
        .catch(() => {
          if (myReq !== reqIdRef.current) return;
          setResults([]);
          setActiveIndex(-1);
          setFailed(true);
        })
        .finally(() => {
          if (myReq === reqIdRef.current) setLoading(false);
        });
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open, selected]);

  // Close the dropdown when clicking anywhere outside the control.
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // Keep the highlighted row scrolled into view during keyboard navigation.
  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIndex}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const pick = (cand) => {
    setSelected(cand);
    setOpen(false);
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
    onChange?.(String(cand.candidateId), cand);
  };

  const clear = () => {
    setSelected(null);
    setQuery('');
    onChange?.('', null);
    // Reopen the search so the recruiter can immediately pick someone else.
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) pick(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const secondary = (c) => {
    const parts = [];
    if (c.email) parts.push(c.email);
    if (c.mobileNumber) parts.push(c.mobileNumber);
    if (c.currentRole) parts.push(c.currentRole);
    return parts.join('  ·  ');
  };

  const styles = useMemo(() => ({
    wrap: { position: 'relative' },
    inputRow: { position: 'relative', display: 'flex', alignItems: 'center' },
    input: {
      width: '100%',
      paddingLeft: 34,
      borderColor: error ? 'var(--r1, #c0392b)' : undefined
    },
    icon: {
      position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
      color: 'var(--ink-muted, #6b7280)', pointerEvents: 'none', fontSize: 14, lineHeight: 1
    },
    menu: {
      position: 'absolute', zIndex: 40, top: 'calc(100% + 4px)', left: 0, right: 0,
      background: 'var(--surface, #fff)',
      border: '1px solid var(--line, #e5e7eb)', borderRadius: 10,
      boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
      maxHeight: 288, overflowY: 'auto', padding: 4
    },
    row: (active) => ({
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
      background: active ? 'var(--brand-050, rgba(99,102,241,0.10))' : 'transparent'
    }),
    rowName: { fontWeight: 600, color: 'var(--ink, #0f172a)', fontSize: 14 },
    rowSub: { fontSize: 12.5, color: 'var(--ink-muted, #6b7280)' },
    noEmail: { color: 'var(--r1, #c0392b)', fontWeight: 600 },
    state: { padding: '10px 12px', color: 'var(--ink-muted, #6b7280)', fontSize: 13 },
    chip: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '10px 12px', border: '1px solid var(--line, #e5e7eb)', borderRadius: 10,
      background: 'var(--surface, #fff)'
    },
    chipName: { fontWeight: 600, color: 'var(--ink, #0f172a)' },
    chipSub: { fontSize: 12.5, color: 'var(--ink-muted, #6b7280)', marginTop: 2 }
  }), [error]);

  if (selected) {
    return (
      <div ref={rootRef} style={styles.wrap}>
        <div style={styles.chip}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.chipName}>{selected.candidateName}</div>
            <div style={styles.chipSub}>
              {selected.email
                ? secondary(selected)
                : <span style={styles.noEmail}>No email on file — add one on the Candidates page before scheduling</span>}
            </div>
          </div>
          {!disabled && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear} style={{ flexShrink: 0 }}>
              Change
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} style={styles.wrap}>
      <div style={styles.inputRow}>
        <span style={styles.icon} aria-hidden="true">🔎</span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          style={styles.input}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && (
        <div style={styles.menu} role="listbox" ref={listRef}>
          {loading && <div style={styles.state}>Searching…</div>}
          {!loading && failed && <div style={styles.state}>Couldn’t search candidates — please try again.</div>}
          {!loading && !failed && results.length === 0 && (
            <div style={styles.state}>
              {query.trim() ? 'No candidates match your search.' : 'No candidates yet.'}
            </div>
          )}
          {!loading && !failed && results.map((c, idx) => (
            <div
              key={c.candidateId}
              data-idx={idx}
              role="option"
              aria-selected={idx === activeIndex}
              style={styles.row(idx === activeIndex)}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => { e.preventDefault(); pick(c); }}
            >
              <span style={styles.rowName}>{c.candidateName}</span>
              <span style={styles.rowSub}>
                {c.email
                  ? secondary(c)
                  : <><span style={styles.noEmail}>No email on file</span>{c.mobileNumber ? `  ·  ${c.mobileNumber}` : ''}{c.currentRole ? `  ·  ${c.currentRole}` : ''}</>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
