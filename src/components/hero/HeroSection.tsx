"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import HeroBackground from "./HeroBackground";
import type { UrbanHeroBackgroundProps } from "@/lib/shaders";

/** Elegant staggered entrance — premium, calm, cinematic. */
const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.14, delayChildren: 0.2 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] },
  },
};

interface HeroSectionProps extends UrbanHeroBackgroundProps {
  /** Optional layer rendered above the shader but below the content (e.g. the 3D globe). */
  children?: ReactNode;
}

/**
 * The full hero: holographic shader background (z-0), optional mid layer
 * (z-8), and the foreground content (z-20) with framer-motion entrances.
 */
export default function HeroSection({ children, ...backgroundProps }: HeroSectionProps) {
  const router = useRouter();

  return (
    <section className="relative min-h-[88vh] flex flex-col items-center justify-center px-6 md:px-12 w-full text-center overflow-hidden">
      <HeroBackground {...backgroundProps} />

      {children}

      <motion.div
        className="flex flex-col items-center justify-center gap-6 z-20 relative"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <div className="inline-block px-4 py-1 border border-neon-cyan/50 rounded-full bg-neon-cyan/10 backdrop-blur-md font-code-sm text-neon-cyan uppercase tracking-[0.2em] animate-pulse text-xs">
            Neural Defense Network Online
          </div>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-display-lg font-bold text-on-surface leading-[0.9] light-sweep"
          style={{ fontSize: "clamp(52px, 9vw, 120px)", letterSpacing: "-0.03em" }}
        >
          PREDICT THE
          <br />
          FUTURE OF{" "}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-electric-blue to-neon-purple text-glow">
            URBAN SAFETY
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="font-body-lg text-base text-on-surface/70 max-w-xl mt-2"
        >
          Advanced AI-driven telemetry providing real-time threat detection and
          secure navigation for the modern metropolis.
        </motion.p>

        <motion.div variants={fadeUp} className="flex gap-4 mt-6">
          <button
            onClick={() => router.push("/login")}
            className="hologram-capsule text-neon-cyan px-8 py-3 font-data-label font-bold tracking-widest hover-target text-xs flex items-center gap-2"
          >
            INITIALIZE SHIELD{" "}
            <span className="material-symbols-outlined align-middle text-sm">
              rocket_launch
            </span>
          </button>
          <button className="glass-panel text-white px-8 py-3 rounded-full font-data-label border border-white/20 hover:bg-white/10 transition-colors flex items-center gap-2 hover-target text-xs tracking-wider">
            <span className="material-symbols-outlined text-neon-magenta text-sm">
              radar
            </span>{" "}
            VIEW TELEMETRY
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
