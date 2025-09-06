'use client';

import React, { useState, useEffect } from 'react';
import { ParticleCard } from './MagicBento';

interface MarketBentoCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  particleCount?: number;
  enableEffects?: boolean;
  variant?: 'indices' | 'stocks' | 'crypto' | 'commodities' | 'bonds' | 'currencies';
}

const variantColors: Record<NonNullable<MarketBentoCardProps['variant']>, string> = {
  indices: '132, 0, 255',
  stocks: '34, 197, 94',
  crypto: '245, 158, 11',
  commodities: '251, 191, 36',
  bonds: '59, 130, 246',
  currencies: '236, 72, 153',
};

export default function MarketBentoCard({
  children,
  className = '',
  glowColor,
  particleCount = 6,
  enableEffects = true,
  variant = 'indices',
}: MarketBentoCardProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const effectiveGlowColor = glowColor || variantColors[variant];

  if (!enableEffects || isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <ParticleCard
      className={className}
      disableAnimations={false}
      particleCount={particleCount}
      glowColor={effectiveGlowColor}
      enableTilt={false}
      clickEffect={true}
      enableMagnetism={false}
      style={{ position: 'relative', isolation: 'isolate', ['--glow-color' as any]: effectiveGlowColor }}
    >
      {children}
    </ParticleCard>
  );
}
