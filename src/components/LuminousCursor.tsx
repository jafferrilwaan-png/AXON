import React, { useEffect, useState } from 'react';

export const LuminousCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      // Small delay for smooth trailing effect
      requestAnimationFrame(() => {
        setPosition({ x: e.clientX, y: e.clientY });
      });
    };
    window.addEventListener('mousemove', updatePosition);
    return () => window.removeEventListener('mousemove', updatePosition);
  }, []);

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-50 w-[500px] h-[500px] rounded-full mix-blend-screen opacity-20 blur-[120px] bg-brand-blue transition-transform duration-300 ease-out"
      style={{ transform: `translate(${position.x - 250}px, ${position.y - 250}px)` }}
    />
  );
};
