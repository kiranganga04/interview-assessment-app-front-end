import React, { useEffect, useRef, useState } from 'react';
import { fetchAttachmentBlob, downloadAttachment } from '../api/apiClient';

/**
 * In-app preview for a candidate resume attachment. Because the app authenticates with a bearer
 * token (a plain <a href="/api/files/{id}"> is 401) and browsers can't render Word documents
 * inline, we fetch the file through the axios client and render it ourselves:
 *   - .doc / .docx -> rendered to HTML in-browser with docx-preview (dynamically imported so the
 *                     library only loads when someone actually opens a Word resume).
 *   - .pdf         -> shown in an <iframe> via an object URL (re-typed to application/pdf).
 *   - images       -> shown in an <img>.
 *   - anything else-> a friendly note + a Download button (browser can't display it).
 *
 * `attachment` = { attachmentId, originalFilename } or null (closed). `onClose` closes the modal.
 * Closes on backdrop click and Esc. All object URLs are revoked on cleanup.
 */
const extOf = (name) => String(name || '').split('.').pop().toLowerCase();
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

export default function ResumePreview({ attachment, onClose }) {
  const docxRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | docx | pdf | image | unsupported | error
  const [objectUrl, setObjectUrl] = useState('');

  const filename = attachment?.originalFilename || 'resume';
  const ext = extOf(attachment?.originalFilename);
  // docx-preview renders OOXML (.docx) ONLY. Legacy binary .doc (application/msword) is a different
  // format it cannot parse, so we must not send it there — it would throw and surface a scary error.
  const isDocx = ext === 'docx';
  const isLegacyDoc = ext === 'doc';
  const isPdf = ext === 'pdf';
  const isImage = IMAGE_EXTS.includes(ext);

  // Esc to close.
  useEffect(() => {
    if (!attachment) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attachment, onClose]);

  // Fetch + render whenever the target attachment changes.
  useEffect(() => {
    if (!attachment) return undefined;
    let cancelled = false;
    let createdUrl = '';
    setStatus('loading');
    setObjectUrl('');

    fetchAttachmentBlob(attachment.attachmentId)
      .then(async (blob) => {
        if (cancelled) return;
        if (isDocx) {
          // docx-preview needs an ArrayBuffer (validated against the real file); render into the
          // container ref, which is mounted while the modal is open. If the file isn't valid OOXML
          // (e.g. a mislabelled or corrupt .docx), fall back to the download-only state instead of a
          // generic error so the user still has a clear way to open it.
          try {
            const buffer = await blob.arrayBuffer();
            if (cancelled || !docxRef.current) return;
            const { renderAsync } = await import('docx-preview');
            if (cancelled || !docxRef.current) return;
            docxRef.current.innerHTML = '';
            await renderAsync(buffer, docxRef.current, undefined, {
              inWrapper: true,
              ignoreLastRenderedPageBreak: true
            });
            if (!cancelled) setStatus('docx');
          } catch {
            if (!cancelled) setStatus('unsupported');
          }
        } else if (isPdf) {
          createdUrl = URL.createObjectURL(blob.slice(0, blob.size, 'application/pdf'));
          if (cancelled) return;
          setObjectUrl(createdUrl);
          setStatus('pdf');
        } else if (isImage) {
          createdUrl = URL.createObjectURL(blob);
          if (cancelled) return;
          setObjectUrl(createdUrl);
          setStatus('image');
        } else {
          setStatus('unsupported');
        }
      })
      .catch(() => { if (!cancelled) setStatus('error'); });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment]);

  if (!attachment) return null;

  const backdrop = {
    position: 'fixed', inset: 0, background: 'rgba(15,17,26,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24
  };
  const panel = {
    background: '#fff', width: 'min(920px, 96vw)', height: 'min(90vh, 1000px)',
    borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', display: 'flex',
    flexDirection: 'column', overflow: 'hidden'
  };
  const header = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: '1px solid #e6e6ef', gap: 12, flex: '0 0 auto'
  };
  const body = { flex: '1 1 auto', overflow: 'auto', background: '#f3f4f8' };

  return (
    <div style={backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label={`Resume preview: ${filename}`}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={filename}>
            {filename}
          </strong>
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => downloadAttachment(attachment.attachmentId, attachment.originalFilename)}
            >
              Download
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close preview">✕</button>
          </span>
        </div>

        <div style={body}>
          {status === 'loading' && (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading preview…</div>
          )}
          {status === 'error' && (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              Couldn't load this file. Use Download to open it locally.
            </div>
          )}
          {status === 'unsupported' && (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', lineHeight: 1.6 }}>
              {isLegacyDoc ? (
                <>
                  This is a legacy <strong>.doc</strong> file, which browsers can't preview inline.
                  Use <strong>Download</strong> to open it in Word — or ask the candidate for a
                  <strong> PDF</strong> or <strong>.docx</strong>, which preview here directly.
                </>
              ) : (
                <>This file type can't be previewed in the browser. Use Download to open it.</>
              )}
            </div>
          )}
          {/* docx container is always mounted (even while loading) so the render target exists. */}
          <div
            ref={docxRef}
            style={{ display: isDocx && status !== 'loading' && status !== 'error' ? 'block' : 'none' }}
          />
          {status === 'pdf' && objectUrl && (
            <iframe title={filename} src={objectUrl} style={{ width: '100%', height: '100%', border: 0 }} />
          )}
          {status === 'image' && objectUrl && (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <img src={objectUrl} alt={filename} style={{ maxWidth: '100%', height: 'auto' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
