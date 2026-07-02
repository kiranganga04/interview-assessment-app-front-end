import React from 'react';

export default function SkillAssessmentTable({ title, rows, onChange, showSelfRating = true }) {
  const update = (idx, field, value) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
    onChange(next);
  };

  const addRow = () => {
    onChange([
      ...rows,
      { skillOrder: rows.length + 1, skillName: '', selfRating: '', rating: '', feedback: '' }
    ]);
  };

  const removeRow = (idx) => {
    onChange(rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, skillOrder: i + 1 })));
  };

  return (
    <div>
      <div className="section-title">{title}</div>
      <div
        className="skill-row"
        style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 600 }}
      >
        <span>Skill</span>
        {showSelfRating ? <span>Self</span> : <span />}
        <span>Rating</span>
        <span>Feedback / Remarks</span>
        <span />
      </div>
      {rows.map((row, idx) => (
        <div className="skill-row" key={idx}>
          <input
            placeholder={`Skill ${row.skillOrder}`}
            value={row.skillName || ''}
            onChange={(e) => update(idx, 'skillName', e.target.value)}
          />
          {showSelfRating ? (
            <input
              type="number" min="1" max="5" step="0.5"
              value={row.selfRating ?? ''}
              onChange={(e) => update(idx, 'selfRating', e.target.value)}
            />
          ) : <span />}
          <input
            type="number" min="1" max="5" step="0.5"
            value={row.rating ?? ''}
            onChange={(e) => update(idx, 'rating', e.target.value)}
          />
          <textarea
            rows={1}
            value={row.feedback || ''}
            onChange={(e) => update(idx, 'feedback', e.target.value)}
          />
          <button type="button" className="icon-btn" onClick={() => removeRow(idx)} title="Remove skill">×</button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>+ Add skill</button>
    </div>
  );
}
