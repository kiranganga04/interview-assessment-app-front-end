import React from 'react';

export default function CodingRoundTable({ rows, onChange }) {
  const update = (idx, field, value) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
    onChange(next);
  };

  const addRow = () =>
    onChange([...rows, { skill: '', noOfQuestions: '', timeTakenMins: '', testComplexity: 'MEDIUM', codingStatus: 'COMPLETED', remarks: '' }]);

  const removeRow = (idx) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="section-title">Coding Details</div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Skill</th>
              <th># Questions</th>
              <th>Time (mins)</th>
              <th>Complexity</th>
              <th>Status</th>
              <th>Remarks</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No coding rounds added yet.</td></tr>
            )}
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td><input value={row.skill || ''} onChange={(e) => update(idx, 'skill', e.target.value)} /></td>
                <td><input type="number" min="0" value={row.noOfQuestions ?? ''} onChange={(e) => update(idx, 'noOfQuestions', e.target.value)} /></td>
                <td><input type="number" min="0" value={row.timeTakenMins ?? ''} onChange={(e) => update(idx, 'timeTakenMins', e.target.value)} /></td>
                <td>
                  <select value={row.testComplexity || 'MEDIUM'} onChange={(e) => update(idx, 'testComplexity', e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </td>
                <td>
                  <select value={row.codingStatus || 'COMPLETED'} onChange={(e) => update(idx, 'codingStatus', e.target.value)}>
                    <option value="COMPLETED">Completed</option>
                    <option value="NOT_COMPLETED">Not completed</option>
                  </select>
                </td>
                <td><input value={row.remarks || ''} onChange={(e) => update(idx, 'remarks', e.target.value)} /></td>
                <td><button type="button" className="icon-btn" onClick={() => removeRow(idx)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>+ Add coding round</button>
      </div>
    </div>
  );
}
