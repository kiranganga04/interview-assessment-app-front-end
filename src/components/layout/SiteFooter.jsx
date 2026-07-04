import React from 'react';
import { footerGroups, productName } from '../../config/navigation';

export default function SiteFooter() {
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
