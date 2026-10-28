import { useEffect, useState } from 'react';
import videoVisit from '../assets/intro-video-visit.png';
import carePlan from '../assets/intro-care-plan.svg';
import styles from './LoginPage.module.css';

const SLIDES = [
  { src: videoVisit, caption: 'Schedule remote visits or instant video visit' },
  { src: carePlan, caption: 'Refill meds, manage care plan & get care on demand' },
];
const INTERVAL_MS = 6000;

export function IntroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
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
    </section>
  );
}
