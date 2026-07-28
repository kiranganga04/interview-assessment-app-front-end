import React from 'react';

const MONTH_LABEL = (key) => {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
};

/**
 * Monthly interviews bar chart, shared by the Recruiter and Admin dashboards. Each bar is a real
 * button: clicking a month calls onSelect({ month, count }) — the dashboards wire that to a
 * per-month .xlsx download of the interviews scheduled in that month. `busyMonth` is the month key
 * currently exporting (shows a spinner glyph and disables that bar).
 */
export default function MonthlyBarChart({ monthly, onSelect, busyMonth }) {
  const max = Math.max(1, ...monthly.map((m) => m.count));

  return (
    <>
      <div className="bar-chart" role="group" aria-label="Interviews per month — click a month to download its interviews">
        {monthly.length === 0 && <div className="empty-state">No data yet.</div>}
        {monthly.map((m) => (
          <button
            type="button"
            className="bar-chart-col bar-chart-col-btn"
            key={m.month}
            onClick={() => onSelect(m)}
            disabled={busyMonth === m.month || m.count === 0}
            title={m.count ? `Download ${MONTH_LABEL(m.month)} interviews (${m.count})` : `No interviews in ${MONTH_LABEL(m.month)}`}
          >
            <span className="bar-chart-count">{busyMonth === m.month ? '…' : m.count}</span>
            <div className="bar-chart-bar" style={{ height: `${Math.max(4, (m.count / max) * 120)}px` }} />
            <span>{MONTH_LABEL(m.month)}</span>
          </button>
        ))}
      </div>
      <p className="status-donut-hint" style={{ textAlign: 'center', marginTop: 12 }}>
        Click a month to download its interviews as an Excel sheet.
      </p>
    </>
  );
}
