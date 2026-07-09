import React from 'react';
import { footerGroups, productName } from '../../config/navigation';

/**
 * `compact` renders a slim single-row footer (brand + copyright only) instead of the full
 * multi-column link farm -- used on signed-out/auth screens where a full sitemap-style footer
 * doesn't apply yet (nothing links anywhere useful before you've signed in) and where keeping
 * the page short matters so sign in/up doesn't require scrolling on ordinary screens.
 */
export default function SiteFooter({ compact = false }) {
  if (compact) {
    return (
      <footer className="site-footer site-footer-compact">
        <div className="footer-shell footer-shell-compact">
          <div className="footer-mark">
            <span className="mark">IA</span>
            <strong>{productName}</strong>
          </div>
          <div className="footer-bottom">{productName} — internal hiring tool.</div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <div className="footer-brand">
          <div className="footer-mark">
            <span className="mark">IA</span>
            <strong>{productName}</strong>
          </div>
          <p>
            A focused workspace for recruiters and interview panels to capture candidate
            evaluations, skill ratings, coding-round outcomes and hiring recommendations
            in one consistent record.
          </p>
        </div>

        <div className="footer-links">
          {footerGroups.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              {group.links.map((link) => <span key={link}>{link}</span>)}
            </section>
          ))}
        </div>

        <div className="footer-bottom">{productName} — internal hiring tool.</div>
      </div>
    </footer>
  );
}
