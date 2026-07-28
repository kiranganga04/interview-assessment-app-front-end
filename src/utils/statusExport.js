import { listInterviews, downloadInterviewsCsv } from '../api/apiClient';

/**
 * Single source of truth for the dashboard status buckets shown in the donut and used for the
 * per-status Excel export. There is EXACTLY ONE bucket per status group the summary tiles already
 * report, so a donut slice can never contradict a tile:
 *   Scheduled         -> SCHEDULED            (= "Scheduled" tile)
 *   In progress       -> IN_PROGRESS
 *   Awaiting feedback -> SUBMITTED            (= "Pending feedback" tile — feedback in, recommendation pending)
 *   Completed         -> RECOMMENDED + CLOSED (= "Completed" tile)
 *   Cancelled         -> CANCELLED            (= "Cancelled" tile)
 * Colours are the dataviz reference categorical theme, validated for colour-blind separation in
 * this exact order (green=done, red=cancelled kept non-adjacent-safe with secondary encoding).
 */
export const STATUS_BUCKETS = [
  { key: 'scheduled',  label: 'Scheduled',         color: '#2a78d6', statuses: ['SCHEDULED'] },
  { key: 'inprogress', label: 'In progress',       color: '#eda100', statuses: ['IN_PROGRESS'] },
  { key: 'awaiting',   label: 'Awaiting feedback', color: '#e87ba4', statuses: ['SUBMITTED'] },
  { key: 'completed',  label: 'Completed',         color: '#008300', statuses: ['RECOMMENDED', 'CLOSED'] },
  { key: 'cancelled',  label: 'Cancelled',         color: '#e34948', statuses: ['CANCELLED'] }
];

/**
 * Derives the bucket counts from the RBAC-scoped dashboard summary so the donut needs no extra
 * request. Each bucket equals the same field the matching tile shows, and In progress is the
 * remainder — so the five buckets always sum to totalInterviews AND agree with every tile.
 */
export function bucketCountsFromSummary(summary) {
  if (!summary) return { scheduled: 0, inprogress: 0, awaiting: 0, completed: 0, cancelled: 0 };
  const total = summary.totalInterviews || 0;
  const scheduled = summary.scheduledCount || 0;
  const awaiting = summary.submittedCount || 0;   // SUBMITTED = awaiting recommendation (the "Pending feedback" tile)
  const completed = summary.completedCount || 0;  // RECOMMENDED + CLOSED (the "Completed" tile)
  const cancelled = summary.cancelledCount || 0;
  const inprogress = Math.max(0, total - scheduled - awaiting - completed - cancelled); // IN_PROGRESS
  return { scheduled, inprogress, awaiting, completed, cancelled };
}

/**
 * Counts an interview list into the same five buckets, keyed by each interview's status. Used by the
 * Panel dashboard, which builds its donut from its own /mine/history list rather than the summary.
 */
export function bucketCountsFromInterviews(list) {
  const counts = { scheduled: 0, inprogress: 0, awaiting: 0, completed: 0, cancelled: 0 };
  const statusToKey = {};
  STATUS_BUCKETS.forEach((b) => b.statuses.forEach((s) => { statusToKey[s] = b.key; }));
  (list || []).forEach((iv) => {
    const key = statusToKey[iv.status];
    if (key) counts[key] += 1;
  });
  return counts;
}

// Column order for the exported sheet.
const HEADERS = ['Candidate', 'Role', 'Level', 'Status', 'Panel member', 'Interview date', 'Final rating', 'Recommendation'];

const toRow = (iv) => ({
  Candidate: iv.candidateName || '',
  Role: iv.currentRole || '',
  Level: iv.levelOfInterview || '',
  Status: iv.status || '',
  'Panel member': iv.panelMemberName || '',
  'Interview date': iv.interviewDate || '',
  'Final rating': iv.finalRating ?? '',
  Recommendation: iv.panelRecommendation || ''
});

// Fetches every interview for one status, following pagination (the list endpoint is RBAC-scoped).
async function fetchAllForStatus(status) {
  const size = 200;
  let page = 0;
  const out = [];
  // Guard against a runaway loop; an internal tool won't exceed a few thousand rows.
  for (let guard = 0; guard < 100; guard += 1) {
    const data = await listInterviews({ page, size, status });
    const content = data.content || [];
    out.push(...content);
    const totalPages = data.totalPages ?? 1;
    page += 1;
    if (page >= totalPages || content.length === 0) break;
  }
  return out;
}

/**
 * Builds and triggers a real .xlsx download for a status bucket. SheetJS is imported dynamically
 * so it stays out of the main bundle and only loads when a user actually exports.
 * Returns the number of rows written. Throws on failure so the caller can toast.
 */
export async function downloadStatusExcel(bucket) {
  const XLSX = await import('xlsx');

  // Fetch each underlying status (Completed spans three) and merge, de-duplicating by id.
  const results = await Promise.all(bucket.statuses.map((s) => fetchAllForStatus(s)));
  const seen = new Set();
  const rows = [];
  results.flat().forEach((iv) => {
    if (!seen.has(iv.interviewId)) {
      seen.add(iv.interviewId);
      rows.push(toRow(iv));
    }
  });

  const worksheet = rows.length
    ? XLSX.utils.json_to_sheet(rows, { header: HEADERS })
    : XLSX.utils.aoa_to_sheet([HEADERS]); // header-only sheet when the bucket is empty
  worksheet['!cols'] = HEADERS.map((h) => ({ wch: h === 'Candidate' || h === 'Panel member' ? 22 : 16 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, bucket.label.slice(0, 31)); // sheet name max 31 chars
  XLSX.writeFile(workbook, `${bucket.label}-interviews.xlsx`);
  return rows.length;
}

/**
 * Builds and triggers a real .xlsx download for a status bucket FROM AN IN-MEMORY LIST, without any
 * network call. Used by the Panel dashboard, whose donut is drawn from the panelist's own
 * `/interviews/mine/history` list rather than the pipeline-wide (ADMIN/RECRUITER-only) list
 * endpoint that `downloadStatusExcel` relies on. Filters `interviews` to the bucket's statuses,
 * de-duplicates by id, and writes the exact same sheet shape as the recruiter/admin export — so the
 * file always matches the slice the panelist clicked. Returns the number of rows written.
 */
export async function downloadStatusExcelFromList(bucket, interviews) {
  const XLSX = await import('xlsx');

  const statuses = new Set(bucket.statuses);
  const seen = new Set();
  const rows = [];
  (interviews || []).forEach((iv) => {
    if (statuses.has(iv.status) && !seen.has(iv.interviewId)) {
      seen.add(iv.interviewId);
      rows.push(toRow(iv));
    }
  });

  const worksheet = rows.length
    ? XLSX.utils.json_to_sheet(rows, { header: HEADERS })
    : XLSX.utils.aoa_to_sheet([HEADERS]); // header-only sheet when the bucket is empty
  worksheet['!cols'] = HEADERS.map((h) => ({ wch: h === 'Candidate' || h === 'Panel member' ? 22 : 16 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, bucket.label.slice(0, 31)); // sheet name max 31 chars
  XLSX.writeFile(workbook, `${bucket.label}-interviews.xlsx`);
  return rows.length;
}

/**
 * Builds and triggers a real .xlsx download for a single month (key "YYYY-MM"). It reuses the
 * RBAC-scoped, scheduled_at-filtered backend export (`/reports/export?month=`) — the exact same
 * definition the Monthly chart bars are built from — and converts that CSV to .xlsx client-side so
 * the file matches the status downloads. Returns the row count (excluding the header).
 */
export async function downloadMonthExcel(monthKey) {
  const XLSX = await import('xlsx');
  const blob = await downloadInterviewsCsv(monthKey);
  const csv = await blob.text();

  const parsed = XLSX.read(csv, { type: 'string' });
  const worksheet = parsed.Sheets[parsed.SheetNames[0]];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, monthKey); // "YYYY-MM" is a valid sheet name
  XLSX.writeFile(workbook, `interviews-${monthKey}.xlsx`);

  const rows = XLSX.utils.sheet_to_json(worksheet);
  return rows.length;
}
