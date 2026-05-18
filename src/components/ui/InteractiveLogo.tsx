import React from 'react';
import { motion, Variants, useMotionValue, useTransform } from 'framer-motion';

interface InteractiveLogoProps {
  className?: string;
  size?: number;
  variant?: 'v1' | 'v2';
  loading?: boolean;
  showBg?: boolean;
}

const InteractiveLogo: React.FC<InteractiveLogoProps> = ({ className, size = 40, variant = 'v1', loading = false, showBg = true }) => {
  // 建立進度值，由 0 到 1
  const progress = useMotionValue(0);

  // 定義路徑
  const paths = {
    v1: {
      m: "M 18 46 V 18 L 32 34 L 46 18 V 46",
      arrow: "M -6 -5 L 0 0 L -6 5" // 指向右方 (+X)，配合 offsetRotate: auto
    },
    v2: {
      m: "M 14 42 L 24 16 L 32 38 L 40 16 L 50 42",
      arrow: "M -6 -5 L 0 0 L -6 5"
    }
  };

  const currentPaths = paths[variant];

  // 轉換進度為 offsetDistance 的百分比字串
  const offsetDistance = useTransform(progress, [0, 1], ["0%", "100%"]);

  const containerVariants: Variants = {
    initial: {},
    animate: {},
    hover: {},
    loading: showBg ? {
      scale: [0.96, 1.04, 0.96],
      boxShadow: [
        "0 8px 32px 0 rgba(0, 0, 0, 0.15), 0 0 0px 0px rgba(56, 189, 248, 0)",
        "0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 16px 4px rgba(56, 189, 248, 0.4)",
        "0 8px 32px 0 rgba(0, 0, 0, 0.15), 0 0 0px 0px rgba(56, 189, 248, 0)"
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    } : {
      scale: [0.96, 1.04, 0.96],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const pathVariants: Variants = {
    initial: { pathLength: 0, opacity: 0 },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 1.5,
        ease: "easeInOut",
      }
    },
    hover: {
      pathLength: [0, 1],
      opacity: 1,
      filter: "drop-shadow(0 0 8px rgba(255,255,255,0.8))",
      transition: {
        duration: 1.5,
        ease: "easeInOut",
      }
    },
    loading: {
      pathLength: [0, 1, 0],
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const arrowVariants: Variants = {
    initial: { opacity: 0, scale: 0 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
      }
    },
    hover: {
      opacity: [0, 1],
      scale: [0.8, 1],
      transition: {
        duration: 0.3,
      }
    },
    loading: {
      opacity: [0.4, 1, 0.4],
      scale: [0.9, 1.1, 0.9],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const strokeColor = showBg ? "var(--logo-stroke)" : "var(--brand-primary)";

  return (
    <motion.div
      key={variant}
      className={`relative flex items-center justify-center rounded-2xl overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: showBg ? "var(--logo-bg)" : "transparent",
        backdropFilter: showBg ? "blur(var(--logo-blur))" : "none",
        WebkitBackdropFilter: showBg ? "blur(var(--logo-blur))" : "none",
        border: showBg ? "1px solid var(--logo-border)" : "none",
        boxShadow: showBg ? "0 8px 32px 0 rgba(0, 0, 0, 0.1)" : "none",
      }}
      initial="initial"
      animate={loading ? "loading" : "animate"}
      whileHover={loading ? undefined : "hover"}
      whileTap={loading ? undefined : {
        backdropFilter: "blur(calc(var(--logo-blur) / 2))",
        scale: 0.92
      }}
      variants={containerVariants}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ strokeLinecap: "round", strokeLinejoin: "round" }}
      >
        {/* 主路徑：負責畫線 */}
        <motion.path
          d={currentPaths.m}
          stroke={strokeColor}
          strokeWidth="4"
          variants={pathVariants}
          onUpdate={(latest: any) => {
            if (latest.pathLength !== undefined) {
              progress.set(latest.pathLength);
            }
          }}
        />

        {/* 火車頭：箭頭群組 */}
        <motion.g
          style={{
            offsetPath: `path("${currentPaths.m}")`,
            offsetDistance: offsetDistance,
            offsetRotate: "auto",
          }}
          variants={arrowVariants}
        >
          <path
            d={currentPaths.arrow}
            stroke={strokeColor}
            strokeWidth="4"
            fill="none"
          />
        </motion.g>
      </svg>

      <motion.div
        className="absolute inset-0 bg-white/5 pointer-events-none"
        initial={{ opacity: 0 }}
        variants={{
          hover: { opacity: 1 }
        }}
      />
    </motion.div>
  );
};

export default InteractiveLogo;
