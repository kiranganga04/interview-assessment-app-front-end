import React from 'react';
import { footerGroups, optimumLogo } from '../../config/navigation';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <div className="footer-brand">
          <img src={optimumLogo} alt="Optimum Solutions" />
          <p>Founded in 1997, Optimum is a full-spectrum IT services and solutions company whose mission is to "Empower Business with Technology."</p>
          <a className="btn btn-secondary" href="https://theoptimum.net/contact-us/" target="_blank" rel="noreferrer">Contact Us</a>
        </div>

        <div className="footer-links">
          {footerGroups.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              {group.links.map((link) => <span key={link}>{link}</span>)}
            </section>
          ))}
        </div>

        <div className="footer-bottom">Copyright (c) Optimum Solutions (S) Pte. Ltd.</div>
      </div>
    </footer>
  );
}
