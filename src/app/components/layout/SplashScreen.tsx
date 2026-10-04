import { motion } from "framer-motion";

const BAR_COUNT = 12;

export function SplashScreen({ visible }: { visible: boolean }) {
  return (
    <motion.div
      className="fixed inset-0 z-[1000000] pointer-events-none flex items-center justify-center bg-background"
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex flex-col items-center gap-8 select-none">
        {/* Logo mark */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Outer pulse ring */}
          <motion.div
            className="absolute w-20 h-20 rounded-[14px] border border-primary/30"
            animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Icon card */}
          <div className="relative z-10 w-16 h-16 bg-card border border-border rounded-[12px] flex items-center justify-center shadow-lg">
            {/* Hash mark - animated draw */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <motion.line
                x1="4" y1="9" x2="20" y2="9"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              />
              <motion.line
                x1="4" y1="15" x2="20" y2="15"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              />
              <motion.line
                x1="10" y1="3" x2="8" y2="21"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              />
              <motion.line
                x1="16" y1="3" x2="14" y2="21"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.65 }}
              />
            </svg>
          </div>
        </motion.div>

        {/* Text block */}
        <motion.div
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <span className="text-foreground font-black text-[20px] tracking-tight leading-none">
            ASTD Value List
          </span>
          <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-[0.2em]">
            Loading market data
          </span>
        </motion.div>

        {/* Equalizer bars */}
        <motion.div
          className="flex items-end gap-[3px] h-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <motion.div
              key={i}
              className="w-[3px] rounded-full bg-primary"
              animate={{
                height: ["8px", `${12 + Math.random() * 16}px`, "8px"],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.7 + Math.random() * 0.4,
                repeat: Infinity,
                delay: i * 0.05,
                ease: "easeInOut",
              }}
              style={{ height: "8px" }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
