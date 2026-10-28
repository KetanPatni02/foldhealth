import { useEffect, useState } from 'react';
import videoVisit from '../assets/intro-video-visit.png';
import styles from './LoginPage.module.css';

// The design's second slide ("Refill meds, manage care plan & get care on
// demand") is waiting on a clean export: Figma's SVG export of that hidden
// layer lost its per-layer transforms and rendered upside down.
const SLIDES = [
  { src: videoVisit, caption: 'Schedule remote visits or instant video visit' },
];
const INTERVAL_MS = 6000;

export function IntroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (SLIDES.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [index]);

  const slide = SLIDES[index];
  return (
    <section className={styles.intro} aria-label="What you can do with Fold Health">
      <div className={styles.introSlide}>
        <img key={slide.src} src={slide.src} alt="" className={styles.introImg} />
        <p className={styles.introCaption} aria-live="polite">{slide.caption}</p>
      </div>
      {SLIDES.length > 1 && (
      <div className={styles.dots}>
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
            aria-label={`Show slide ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
      )}
    </section>
  );
}
