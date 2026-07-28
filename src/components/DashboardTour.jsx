import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * DashboardTour — an in-app narrated "explainer video" for the overview dashboards.
 *
 * Instead of a static MP4, this is a live, guided walkthrough: a dimmed backdrop with a spotlight
 * cut around the section being described, a caption card with the narration text, and playback
 * controls. Narration is spoken with the browser's built-in Web Speech API (speechSynthesis) so
 * there are no media files, no servers, and the tour always matches the *live* UI — if the data
 * changes, the tour describes the current screen.
 *
 * Props:
 *   open   — boolean, whether the tour is showing
 *   steps  — [{ target: 'data-tour-id' | null, title, text }]
 *   title  — overall tour title (shown in the caption chrome)
 *   onClose — called when the user closes/finishes the tour
 *
 * A step whose `target` matches no element on screen (or is null) is narrated with the caption
 * centered and the whole screen dimmed — used for the intro/outro and as a graceful fallback.
 */

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Presenter avatar styles, scoped to the tour so the shared index.css isn't touched. The avatar
// "talks" (mouth + halo + live dot animate) only while the tour is playing; `prefers-reduced-motion`
// disables the motion but keeps the avatar visible.
const TOUR_PRESENTER_CSS = `
.tour-presenter{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.tour-avatar{position:relative;width:56px;height:56px;border-radius:15px;flex:0 0 auto;
  background:linear-gradient(135deg,#4f46e5,#7c3aed);box-shadow:0 8px 20px rgba(79,70,229,.35)}
.tour-avatar svg{position:absolute;inset:0;width:100%;height:100%}
.tour-halo{position:absolute;inset:-5px;border-radius:19px;border:2px solid rgba(124,58,237,.5);opacity:0}
.tour-avatar.is-speaking .tour-halo{animation:tourHalo 1.7s infinite ease-out}
.tour-mouth{transform-box:fill-box;transform-origin:center}
.tour-avatar.is-speaking .tour-mouth{animation:tourTalk .34s infinite alternate ease-in-out}
.tour-presenter-meta{display:flex;flex-direction:column;line-height:1.25}
.tour-presenter-name{font-weight:700;font-size:13px;color:#111}
.tour-presenter-sub{display:flex;align-items:center;gap:6px;font-size:11px;color:#6b7280}
.tour-live-dot{width:7px;height:7px;border-radius:50%;background:#c7cad6;display:inline-block}
.tour-live-dot.on{background:#16a34a}
.tour-avatar.is-speaking ~ .tour-presenter-meta .tour-live-dot.on{animation:tourBlink 1.1s infinite ease-in-out}
@keyframes tourHalo{0%{transform:scale(1);opacity:.65}100%{transform:scale(1.2);opacity:0}}
@keyframes tourTalk{from{transform:scaleY(.4)}to{transform:scaleY(1.2)}}
@keyframes tourBlink{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion: reduce){
  .tour-avatar.is-speaking .tour-halo,
  .tour-avatar.is-speaking .tour-mouth,
  .tour-live-dot.on{animation:none}
}
`;

// Rough fallback duration when speech synthesis is unavailable: ~380ms per word, floored at 3.6s.
const fallbackDurationMs = (text) => Math.max(3600, (text || '').split(/\s+/).filter(Boolean).length * 380);

export default function DashboardTour({ open, steps, title = 'Overview tour', onClose }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [rect, setRect] = useState(null); // spotlight rect (viewport coords) or null = centered/full dim
  const [speechOn, setSpeechOn] = useState(true); // user can mute the voice but keep captions

  const genRef = useRef(0); // increments on every step change; guards stale speech `onend` callbacks
  const fallbackTimer = useRef(null);
  const measureTimer = useRef(null);

  const total = steps.length;
  const step = steps[index] || null;

  const speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';

  const clearTimers = () => {
    if (fallbackTimer.current) { clearTimeout(fallbackTimer.current); fallbackTimer.current = null; }
    if (measureTimer.current) { clearTimeout(measureTimer.current); measureTimer.current = null; }
  };

  const stopSpeaking = useCallback(() => {
    if (speechSupported) {
      try { window.speechSynthesis.cancel(); } catch (_) { /* no-op */ }
    }
  }, [speechSupported]);

  const goTo = useCallback((next) => {
    setIndex((cur) => {
      const clamped = Math.max(0, Math.min(total - 1, next));
      return clamped;
    });
  }, [total]);

  const handleNext = useCallback(() => {
    if (index >= total - 1) { onClose(); return; }
    goTo(index + 1);
  }, [index, total, goTo, onClose]);

  const handlePrev = useCallback(() => goTo(index - 1), [index, goTo]);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  // Pick an Indian-English voice when the device has one (voices load async in some browsers).
  // Order of preference: an en-IN locale voice → a known Indian voice by name → British English
  // (closest common accent) → any English voice → whatever is first.
  const pickVoice = useCallback(() => {
    if (!speechSupported) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    return (
      voices.find((v) => /en[-_]IN/i.test(v.lang)) ||
      voices.find((v) => /(india|heera|ravi|priya|neerja|aditi|kajal|hemant|prabhat|isha|rishi)/i.test(v.name || '')) ||
      voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      voices[0]
    );
  }, [speechSupported]);

  // Measure the current target and position the spotlight. Runs after scroll settles and on resize.
  const measure = useCallback(() => {
    if (!step || !step.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    // If the element is essentially off-screen or zero-sized, fall back to a centered caption.
    if (r.width < 2 || r.height < 2) { setRect(null); return; }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // On each step: scroll target into view, (re)measure, and narrate.
  useEffect(() => {
    if (!open || !step) return undefined;
    genRef.current += 1;
    const gen = genRef.current;
    clearTimers();

    const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
    if (el) {
      try {
        el.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
      } catch (_) {
        el.scrollIntoView();
      }
    }

    // Measure after the smooth scroll has had time to settle, then once more on the next frame.
    measureTimer.current = setTimeout(() => {
      measure();
      requestAnimationFrame(measure);
    }, REDUCED_MOTION ? 60 : 420);

    // Narrate.
    const advanceIfPlaying = () => {
      if (gen !== genRef.current) return; // a newer step already started
      if (!playing) return;
      handleNextRef.current();
    };

    if (playing && speechOn && speechSupported && step.text) {
      const utter = new window.SpeechSynthesisUtterance(step.text);
      const voice = pickVoice();
      if (voice) utter.voice = voice;
      utter.rate = 0.96; // a touch slower for clear, easy-to-follow narration
      utter.pitch = 1.0;
      utter.lang = (voice && voice.lang) || 'en-IN';
      utter.onend = advanceIfPlaying;
      utter.onerror = () => {
        // If speech errors mid-way, fall back to a timed advance so the tour never stalls.
        if (gen !== genRef.current || !playing) return;
        fallbackTimer.current = setTimeout(advanceIfPlaying, fallbackDurationMs(step.text));
      };
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch (_) {
        fallbackTimer.current = setTimeout(advanceIfPlaying, fallbackDurationMs(step.text));
      }
    } else if (playing) {
      // No speech (unsupported or muted): auto-advance on a text-length timer.
      fallbackTimer.current = setTimeout(advanceIfPlaying, fallbackDurationMs(step.text));
    }

    return () => {
      clearTimers();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, playing, speechOn]);

  // Keep handleNext fresh for the speech `onend` closure without re-triggering the narrate effect.
  const handleNextRef = useRef(handleNext);
  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  // Re-measure on resize/scroll so the spotlight tracks its target.
  useEffect(() => {
    if (!open) return undefined;
    const onChange = () => measure();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [open, measure]);

  // Keyboard controls.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleNext, handlePrev, togglePlay, onClose]);

  // Reset to the first step whenever the tour is (re)opened, and hard-stop speech when it closes.
  useEffect(() => {
    if (open) { setIndex(0); setPlaying(true); }
    else { clearTimers(); stopSpeaking(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cancel any in-flight speech on unmount.
  useEffect(() => () => { clearTimers(); stopSpeaking(); }, [stopSpeaking]);

  if (!open || !step) return null;

  // Caption placement: below the target if it sits in the top half of the screen, otherwise above.
  // When there's no rect (intro/outro/missing target) the caption is centered.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const cardWidth = Math.min(420, vw - 32);
  let cardStyle;
  if (rect) {
    const placeBelow = rect.top + rect.height / 2 < vh / 2;
    const left = Math.max(16, Math.min(rect.left, vw - cardWidth - 16));
    cardStyle = placeBelow
      ? { top: Math.min(rect.top + rect.height + 16, vh - 220), left, width: cardWidth }
      : { bottom: Math.max(16, vh - rect.top + 16), left, width: cardWidth };
  } else {
    cardStyle = { top: '50%', left: '50%', width: cardWidth, transform: 'translate(-50%, -50%)' };
  }

  const spotPad = 8;

  // While the tour is actively playing we animate the presenter (mouth + halo) to read as "talking";
  // when paused it goes idle. Speaking is tied to playback so it works whether narration is spoken
  // aloud or captions are advancing on the fallback timer.
  const isSpeaking = playing;
  const presenterStatus = playing
    ? (speechOn && speechSupported ? 'Narrating…' : 'Presenting…')
    : 'Paused';

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label={`${title} — narrated walkthrough`}>
      {/* Presenter avatar styles — scoped here so no global stylesheet edit is needed. */}
      <style>{TOUR_PRESENTER_CSS}</style>
      {/* Click-blocking backdrop. Full dim when there's no spotlight target. */}
      <div className={`tour-backdrop${rect ? '' : ' tour-backdrop--full'}`} onClick={(e) => e.preventDefault()} />

      {/* Spotlight ring around the current section. */}
      {rect && (
        <div
          className="tour-spot"
          style={{
            top: rect.top - spotPad,
            left: rect.left - spotPad,
            width: rect.width + spotPad * 2,
            height: rect.height + spotPad * 2
          }}
        />
      )}

      {/* Caption card + controls. */}
      <div className="tour-card" style={cardStyle}>
        {/* AI presenter — a friendly guide that "talks" while narration plays. */}
        <div className="tour-presenter">
          <div className={`tour-avatar${isSpeaking ? ' is-speaking' : ''}`} aria-hidden="true">
            <span className="tour-halo" />
            <svg viewBox="0 0 60 60" fill="none">
              <path d="M14 31a16 16 0 0 1 32 0" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.92" />
              <rect x="10.5" y="30" width="5" height="11" rx="2.5" fill="#fff" opacity="0.92" />
              <rect x="44.5" y="30" width="5" height="11" rx="2.5" fill="#fff" opacity="0.92" />
              <circle cx="30" cy="31" r="12.5" fill="#fff" opacity="0.16" />
              <circle cx="25.4" cy="29.5" r="1.8" fill="#fff" />
              <circle cx="34.6" cy="29.5" r="1.8" fill="#fff" />
              <ellipse className="tour-mouth" cx="30" cy="36" rx="4.2" ry="2.3" fill="#fff" />
            </svg>
          </div>
          <div className="tour-presenter-meta">
            <span className="tour-presenter-name">Ava — your AI guide</span>
            <span className="tour-presenter-sub">
              <span className={`tour-live-dot${isSpeaking ? ' on' : ''}`} />
              {presenterStatus}
            </span>
          </div>
        </div>

        <div className="tour-card-top">
          <span className="tour-eyebrow">{title}</span>
          <button className="tour-x" onClick={onClose} aria-label="Close tour">×</button>
        </div>
        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-text">{step.text}</p>

        <div className="tour-progress" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={i} className={`tour-dot${i === index ? ' is-active' : ''}${i < index ? ' is-done' : ''}`} />
          ))}
        </div>

        <div className="tour-controls">
          <div className="tour-controls-left">
            <button className="tour-btn" onClick={handlePrev} disabled={index === 0} aria-label="Previous">‹ Back</button>
            <button className="tour-btn tour-btn-primary" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? '❚❚ Pause' : '▶ Play'}
            </button>
            <button className="tour-btn" onClick={handleNext} aria-label="Next">
              {index >= total - 1 ? 'Finish' : 'Next ›'}
            </button>
          </div>
          <div className="tour-controls-right">
            <span className="tour-count">{index + 1} / {total}</span>
            {speechSupported && (
              <button
                className={`tour-mute${speechOn ? '' : ' is-muted'}`}
                onClick={() => setSpeechOn((v) => !v)}
                title={speechOn ? 'Mute narration' : 'Unmute narration'}
                aria-label={speechOn ? 'Mute narration' : 'Unmute narration'}
              >
                {speechOn ? '🔊' : '🔇'}
              </button>
            )}
          </div>
        </div>
        {!speechSupported && (
          <p className="tour-note">Your browser doesn’t support spoken narration — captions advance automatically.</p>
        )}
      </div>
    </div>
  );
}
