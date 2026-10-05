import React, { useRef, useState } from "react";
import { motion, useMotionValue, useMotionTemplate } from "framer-motion";

export function SpotlightCard({ children, color, className = "" }: { children: React.ReactNode, color: string, className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
    setIsHovering(true);
  };

  const background = useMotionTemplate`radial-gradient(circle at ${mouseX}px ${mouseY}px, ${color}25 0%, transparent 70%)`;

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setIsHovering(false)}
      className={`bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] rounded-[12px] flex flex-col shadow-sm relative overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] duration-300 ${className}`}
    >
      <motion.div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0 mix-blend-screen"
        style={{
          background,
          opacity: isHovering ? 1 : 0
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-[4px] z-20 rounded-t-[12px]" style={{ backgroundColor: color }} />
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none z-0 transition-opacity group-hover:opacity-20 duration-500" 
        style={{ background: `linear-gradient(to bottom, ${color}, transparent)` }} 
      />
      {children}
    </div>
  );
}