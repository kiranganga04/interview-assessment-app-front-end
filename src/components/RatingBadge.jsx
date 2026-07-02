import React from 'react';

const LABELS = { 5: 'Exceptional', 4: 'Good', 3: 'Average', 2: 'Below Avg', 1: 'Poor' };

export default function RatingBadge({ value, showLabel = false }) {
  if (value === null || value === undefined || value === '') {
    return <span className="rating-badge rating-na"><span className="dot" />N/A</span>;
  }
  const rounded = Math.round(Number(value));
  const cls = `rating-${Math.min(5, Math.max(1, rounded))}`;
  return (
    <span className={`rating-badge ${cls}`}>
      <span className="dot" />
      {Number(value).toFixed(1)}
      {showLabel && ` · ${LABELS[rounded] || ''}`}
    </span>
  );
}
