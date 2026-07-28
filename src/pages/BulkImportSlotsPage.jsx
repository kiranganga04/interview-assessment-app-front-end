import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bulkImportInterviewSlots } from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';
import { CardHeader } from '../components/DashboardUI';

const TEMPLATE_CSV = 'Interviewer Email,Date,Start Time,End Time,Mode,Technology\n'
  + 'priya.sharma@example.com,2026-07-15,09:00,10:00,Online,Java\n'
  + 'rahul.patel@example.com,2026-07-15,11:00,12:00,In-Person,React\n';

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'interview-slots-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Interview Management: upload a CSV to create many interview slots at once instead of
 * adding them one by one on the Interview Slots page. Parsing/validation happens server-side
 * (InterviewSlotService.bulkImportFromCsv) -- this page just reads the file as text, posts it,
 * and renders the per-row created/error summary the backend returns. Matches the "import the
 * good rows, report the bad ones" behavior: a typo in one row never blocks the rest of the file.
 */
export default function BulkImportSlotsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [fileName, setFileName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setResult(null);
    setError('');
    if (!file) {
      setFileName('');
      setCsvContent('');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvContent(String(reader.result || ''));
    reader.onerror = () => setError('Could not read that file -- please try again.');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      setError('Choose a CSV file first.');
      return;
    }
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const data = await bulkImportInterviewSlots(csvContent);
      setResult(data);
      if (data.createdCount > 0) {
        toast.success(`${data.createdCount} slot${data.createdCount !== 1 ? 's' : ''} created.`);
      }
      if (data.errorCount > 0) {
        toast.error(`${data.errorCount} row${data.errorCount !== 1 ? 's' : ''} could not be imported -- see details below.`);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to import the file.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page dash-b">
      <div className="page-header">
        <div>
          <div className="eyebrow">Interview Management</div>
          <h1>Bulk Import Interview Slots</h1>
          <p>Upload a CSV to create many availability slots at once, instead of adding them one by one.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <CardHeader icon="upload" tone="indigo" title="Bulk import" subtitle="Two steps: download the template, then upload your filled-in copy." />
        <div className="card-body">
          <div className="section-title" style={{ marginTop: 0 }}>1 · Download the template</div>
          <p style={{ marginBottom: 12, color: 'var(--ink-muted)' }}>
            Columns: <strong>Interviewer Email, Date, Start Time, End Time, Mode, Technology</strong>.
            Date accepts YYYY-MM-DD (e.g. 2026-07-10) or DD-MM-YYYY (e.g. 10-07-2026), times use 24-hour HH:MM, and Mode accepts Online / In-Person / Telephonic.
            Technology is optional. The first row is always treated as a header and skipped.
            Up to 500 rows per file.
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
            Download CSV template
          </button>

          <div className="section-title">2 · Upload your file</div>
          <label className="sr-only" htmlFor="bulk-import-file">CSV file to import</label>
          <input id="bulk-import-file" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          {fileName && <p style={{ marginTop: 8, color: 'var(--ink-muted)' }}>Selected: {fileName}</p>}

          {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}

          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-primary" disabled={importing || !csvContent.trim()} onClick={handleImport}>
              {importing ? 'Importing...' : 'Import'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/interview-slots')}>
              Back to Interview Slots
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="card data-card">
          <CardHeader
            icon={result.errorCount > 0 ? 'alert' : 'hygiene'}
            tone={result.errorCount > 0 ? 'amber' : 'green'}
            title="Import results"
            subtitle={`${result.totalRows} row${result.totalRows !== 1 ? 's' : ''} processed · ${result.createdCount} created · ${result.errorCount} failed`}
          />

          {result.createdCount > 0 && (
            <div className="card-body" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="eyebrow">Created slot codes</div>
              <p>{result.createdSlotCodes.join(', ')}</p>
            </div>
          )}

          {result.errorCount > 0 && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Row</th><th>Reason</th></tr></thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td>{e.row}</td>
                      <td>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.createdCount > 0 && (
            <div className="card-body" style={{ borderTop: '1px solid var(--line)' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/interview-slots')}>
                View Interview Slots
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
