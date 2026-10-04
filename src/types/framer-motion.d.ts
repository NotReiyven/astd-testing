import "framer-motion";

// framer-motion v11 changed its generic types in a way that drops
// standard HTML attributes (className, style, etc.) from motion.div.
// This augmentation restores them so TypeScript stops complaining.
declare module "framer-motion" {
  interface MotionProps {
    className?: string;
    style?: React.CSSProperties;
    role?: string;
    "aria-modal"?: boolean | "true" | "false";
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
    onClick?: React.MouseEventHandler;
  }
}
