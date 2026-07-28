import React from 'react';

// Geometry for the SVG donut.
const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 108;
const R_INNER = 62;
const PAD_DEG = 2; // gap between slices (surface shows through) — the 2px spacer rule

const polar = (r, angleDeg) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};

// Donut wedge between two angles (degrees, clockwise from 12 o'clock).
const wedgePath = (startAngle, endAngle) => {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const [x1, y1] = polar(R_OUTER, startAngle);
  const [x2, y2] = polar(R_OUTER, endAngle);
  const [x3, y3] = polar(R_INNER, endAngle);
  const [x4, y4] = polar(R_INNER, startAngle);
  return `M ${x1} ${y1} A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${x2} ${y2} `
       + `L ${x3} ${y3} A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${x4} ${y4} Z`;
};

/**
 * Status donut. `buckets` = [{ key, label, color, count }].
 *
 * interactive=true (default): slices/legend are buttons; clicking calls onSelect(bucket) — the
 * recruiter/admin dashboards wire that to a per-status .xlsx download.
 * interactive=false: display-only (used by the Panel dashboard, which can't list interviews by
 * status) — the legend renders as plain rows and nothing is clickable.
 */
export default function StatusDonut({ buckets, onSelect, busyKey, interactive = true }) {
  const total = buckets.reduce((sum, b) => sum + (b.count || 0), 0);
  const active = buckets.filter((b) => (b.count || 0) > 0);

  let cursor = 0;
  const slices = active.map((b) => {
    const sweep = (b.count / total) * 360;
    const start = cursor;
    const end = cursor + sweep;
    cursor = end;
    const pad = active.length > 1 ? PAD_DEG / 2 : 0;
    const s = start + pad;
    const e = end - pad;
    const mid = (start + end) / 2;
    const [lx, ly] = polar((R_OUTER + R_INNER) / 2, mid);
    const pct = Math.round((b.count / total) * 100);
    const full = active.length === 1;
    const d = full
      ? `${wedgePath(0, 179.99)} ${wedgePath(180, 359.99)}`
      : wedgePath(s, e);
    return { bucket: b, d, lx, ly, pct, showLabel: sweep >= 24 || full };
  });

  return (
    <div className={`status-donut${interactive ? '' : ' status-donut--static'}`}>
      <div className="status-donut-figure">
        {total === 0 ? (
          <div className="status-donut-empty">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label="No interviews yet">
              <circle cx={CX} cy={CY} r={(R_OUTER + R_INNER) / 2} fill="none" stroke="var(--line)" strokeWidth={R_OUTER - R_INNER} />
            </svg>
            <span className="muted-cell">No interviews yet</span>
          </div>
        ) : (
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true">
            {slices.map(({ bucket, d, lx, ly, pct, showLabel }) => (
              <g key={bucket.key} className="donut-slice" onClick={interactive ? () => onSelect(bucket) : undefined}>
                <path d={d} fill={bucket.color}>
                  <title>{interactive ? `${bucket.label}: ${bucket.count} — click to download Excel` : `${bucket.label}: ${bucket.count}`}</title>
                </path>
                {showLabel && (
                  <text x={lx} y={ly} className="donut-slice-label" textAnchor="middle" dominantBaseline="central">{pct}%</text>
                )}
              </g>
            ))}
            <circle cx={CX} cy={CY} r={R_INNER - 2} fill="var(--surface)" />
            <text x={CX} y={CY - 6} textAnchor="middle" className="donut-center-value">{total}</text>
            <text x={CX} y={CY + 14} textAnchor="middle" className="donut-center-label">interviews</text>
          </svg>
        )}
      </div>

      <div className="status-legend" role="group" aria-label="Interview statuses">
        {buckets.map((b) => (
          interactive ? (
            <button
              key={b.key}
              type="button"
              className="status-legend-chip"
              onClick={() => onSelect(b)}
              disabled={busyKey === b.key}
              title={`Download ${b.label} interviews as Excel`}
            >
              <span className="status-legend-dot" style={{ background: b.color }} />
              <span className="status-legend-label">{b.label}</span>
              <span className="status-legend-count">{busyKey === b.key ? '…' : b.count}</span>
            </button>
          ) : (
            <div key={b.key} className="status-legend-chip status-legend-static">
              <span className="status-legend-dot" style={{ background: b.color }} />
              <span className="status-legend-label">{b.label}</span>
              <span className="status-legend-count">{b.count}</span>
            </div>
          )
        ))}
      </div>
      {interactive && <p className="status-donut-hint">Click a status to download its interviews as an Excel sheet.</p>}
    </div>
  );
}
