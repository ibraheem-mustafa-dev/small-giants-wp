"use client";

import { useEffect, useRef } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useScrollReveal<T extends HTMLElement>(
  options: ScrollRevealOptions = {},
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      element.classList.add("visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: options.threshold ?? 0.1,
        rootMargin: options.rootMargin ?? "0px 0px -50px 0px",
      },
    );

    // Observe the element itself
    observer.observe(element);

    // Also observe any child elements with scroll-reveal or scroll-reveal-scale class
    const children = element.querySelectorAll(
      ".scroll-reveal, .scroll-reveal-scale",
    );
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return ref;
}
