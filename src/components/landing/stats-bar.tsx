"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

interface StatItemProps {
  target: number;
  suffix?: string;
  prefix?: string;
  label: string;
  formatNumber?: boolean;
  inView: boolean;
}

function useCountUp(target: number, inView: boolean, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) return;

    startTimeRef.current = performance.now();

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      setCount(Math.round(easedProgress * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, inView, duration]);

  return count;
}

function formatWithSpaces(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function StatItem({ target, suffix = "", prefix = "", label, formatNumber, inView }: StatItemProps) {
  const count = useCountUp(target, inView);
  const display = formatNumber ? formatWithSpaces(count) : count.toString();

  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-primary-foreground">
        {prefix}
        {display}
        {suffix}
      </div>
      <div className="text-primary-foreground/70 text-sm mt-2">{label}</div>
    </div>
  );
}

const stats = [
  {
    target: 91,
    suffix: "%",
    label: "Taux d'embarquement moyen",
    formatNumber: false,
  },
  {
    target: 2500,
    suffix: "+",
    label: "Départs gérés/mois",
    formatNumber: true,
  },
  {
    target: 15000,
    suffix: "+",
    label: "Passagers traités",
    formatNumber: true,
  },
  {
    target: 6,
    prefix: "",
    suffix: "M FCFA",
    label: "Économisés/mois par nos clients",
    formatNumber: false,
  },
];

export function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="stats" className="py-16 bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4"
        >
          {stats.map((stat) => (
            <StatItem
              key={stat.label}
              target={stat.target}
              suffix={stat.suffix}
              prefix={stat.prefix}
              label={stat.label}
              formatNumber={stat.formatNumber}
              inView={inView}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}