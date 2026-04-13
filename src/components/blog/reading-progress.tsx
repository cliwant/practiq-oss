"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ReadingProgress — a thin bar at the top of the viewport that fills
 * as the reader scrolls through the article.
 *
 * Progress is measured against the <article> element when available
 * (so the bar reaches 100% at the end of the post, not at the bottom
 * of the footer). Falls back to full-page scroll if no <article> is
 * present on the page.
 *
 * Scroll handling is throttled via requestAnimationFrame so the bar
 * updates smoothly without hammering layout.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const computeProgress = () => {
      const article = document.querySelector("article");
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;

      let fraction: number;

      if (article) {
        // Measure relative to the article's vertical span.
        const rect = article.getBoundingClientRect();
        const articleTop = rect.top + scrollY;
        const articleHeight = article.offsetHeight;
        const articleEnd = articleTop + articleHeight;

        // How far past the article's top have we scrolled, as a
        // fraction of the scrollable distance inside the article?
        const scrollableDistance = Math.max(1, articleEnd - articleTop - viewportHeight);
        const scrolled = Math.max(0, scrollY - articleTop);
        fraction = scrolled / scrollableDistance;
      } else {
        const docHeight = document.documentElement.scrollHeight - viewportHeight;
        fraction = docHeight > 0 ? scrollY / docHeight : 0;
      }

      const clamped = Math.max(0, Math.min(1, fraction));
      setProgress(clamped * 100);
    };

    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        computeProgress();
        frameRef.current = null;
      });
    };

    computeProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-zinc-800"
    >
      <div
        className="h-full bg-zinc-100 transition-[width] duration-75 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
