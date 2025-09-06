'use client';

import React from 'react';

type ParticleCardProps = {
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  style?: React.CSSProperties;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
};

function rgba(rgb: string | undefined, alpha: number) {
  const safe = rgb || '255,255,255';
  return `rgba(${safe}, ${alpha})`;
}

export function ParticleCard({
  children,
  className = '',
  disableAnimations = false,
  particleCount = 6,
  glowColor,
  enableTilt = true,
  clickEffect = true,
  style,
  onMouseMove,
  onMouseLeave,
}: ParticleCardProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const tiltRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = rootRef.current;
    const tilt = tiltRef.current;
    if (!root || !tilt || !enableTilt) return;

    const onMove = (e: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rotX = Math.max(-1, Math.min(1, dy)) * 6;
      const rotY = Math.max(-1, Math.min(1, -dx)) * 6;
      tilt.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    };

    const onLeave = () => { tilt.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'; };

    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    return () => {
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
    };
  }, [enableTilt]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || disableAnimations || particleCount <= 0) return;

    const spawn = (x: number, y: number) => {
      for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        const size = Math.random() * 6 + 4;
        const dx = (Math.random() - 0.5) * 40;
        const dy = -Math.random() * 40 - 10;
        p.style.position = 'absolute';
        p.style.left = `${x - root.getBoundingClientRect().left}px`;
        p.style.top = `${y - root.getBoundingClientRect().top}px`;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.borderRadius = '9999px';
        p.style.pointerEvents = 'none';
        p.style.background = rgba('255,255,255', 1);
        p.style.boxShadow = `0 0 10px ${rgba('255,255,255', 0.8)}`;
        p.style.opacity = '0.9';
        p.style.transform = 'translate(0,0) scale(1)';
        p.style.transition = 'transform 700ms ease, opacity 700ms ease';
        root.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transform = `translate(${dx}px, ${dy}px) scale(0.6)`;
          p.style.opacity = '0';
        });
        setTimeout(() => p.remove(), 800);
      }
    };

    const onEnter = (e: MouseEvent) => spawn(e.clientX, e.clientY);
    const onMove = (e: MouseEvent) => spawn(e.clientX, e.clientY);

    root.addEventListener('mouseenter', onEnter);
    root.addEventListener('mousemove', onMove);
    return () => {
      root.removeEventListener('mouseenter', onEnter);
      root.removeEventListener('mousemove', onMove);
    };
  }, [disableAnimations, particleCount]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || !clickEffect || disableAnimations) return;

    const onClick = (e: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      const r = document.createElement('span');
      r.style.position = 'absolute';
      r.style.left = `${e.clientX - rect.left}px`;
      r.style.top = `${e.clientY - rect.top}px`;
      r.style.width = r.style.height = '6px';
      r.style.borderRadius = '9999px';
      r.style.pointerEvents = 'none';
      r.style.background = rgba('255,255,255', 0.45);
      r.style.boxShadow = `0 0 18px ${rgba('255,255,255', 0.6)}`;
      r.style.transform = 'translate(-50%, -50%) scale(1)';
      r.style.transition = 'transform 500ms ease, opacity 600ms ease';
      root.appendChild(r);
      requestAnimationFrame(() => {
        r.style.transform = 'translate(-50%, -50%) scale(16)';
        r.style.opacity = '0';
      });
      setTimeout(() => r.remove(), 700);
    };

    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [clickEffect, disableAnimations]);

  return (
    <div
      ref={rootRef}
      className={`ParticleCard relative transition-transform duration-200 ${className}`}
      style={{ willChange: 'transform', ...style }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div ref={tiltRef}>{children}</div>
    </div>
  );
}

export function GlobalSpotlight({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = 100,
}: {
  gridRef?: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
}) {
  const [pos, setPos] = React.useState({ x: 0, y: 0, intensity: 0 });

  React.useEffect(() => {
    if (!enabled || disableAnimations) return;

    const onMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('.card--border-glow');
      let isOverCard = false;
      cards.forEach((card) => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          isOverCard = true;
        }
      });
      setPos({ x: e.clientX, y: e.clientY, intensity: isOverCard ? 0.05 : 0 });
    };

    const onLeave = () => setPos((p) => ({ ...p, intensity: 0 }));

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [enabled, disableAnimations]);

  if (!enabled) return null;
  const size = 220;
  const style: React.CSSProperties = {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    width: size,
    height: size,
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 50,
    opacity: pos.intensity,
    transform: 'translate(-50%, -50%)',
    mixBlendMode: 'screen',
    transition: 'opacity 0.25s ease',
    background: 'radial-gradient(circle, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.005) 20%, transparent 50%)',
  };
  return <div className="global-spotlight" style={style} />;
}

export const MagicBentoCard: React.FC<{
  children: React.ReactNode;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  glowColor?: string;
  className?: string;
}> = ({
  children,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  glowColor = '255, 255, 255',
  className = '',
}) => {
  const gridRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  React.useEffect(() => {
    if (!enableBorderGlow || !cardRef.current) return;
    
    const wrapper = cardRef.current;
    const card = wrapper.querySelector('.card--border-glow') as HTMLElement;
    if (!card) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const cardRect = card.getBoundingClientRect();
      
      // Mouse position relative to card
      const mouseX = e.clientX - cardRect.left;
      const mouseY = e.clientY - cardRect.top;
      
      // Card dimensions
      const cardWidth = cardRect.width;
      const cardHeight = cardRect.height;
      
      // Check if mouse is within reasonable proximity (including the 100px padding area)
      const proximityThreshold = 150; // pixels
      const isNearCard = mouseX >= -proximityThreshold && 
                        mouseX <= cardWidth + proximityThreshold && 
                        mouseY >= -proximityThreshold && 
                        mouseY <= cardHeight + proximityThreshold;
      
      if (!isNearCard) {
        // Mouse is too far away, hide glow
        card.style.setProperty('--ring-o', '0');
        return;
      }
      
      // Determine if cursor is inside or outside the actual card content
      const isInside = mouseX >= 0 && mouseX <= cardWidth && mouseY >= 0 && mouseY <= cardHeight;
      
      // Calculate minimum distance to edge
      let minDistToEdge: number;
      if (isInside) {
        // Inside: distance to nearest edge
        const distToLeft = mouseX;
        const distToRight = cardWidth - mouseX;
        const distToTop = mouseY;
        const distToBottom = cardHeight - mouseY;
        minDistToEdge = Math.min(distToLeft, distToRight, distToTop, distToBottom);
      } else {
        // Outside: calculate shortest distance to card boundary
        let dx = 0, dy = 0;
        if (mouseX < 0) dx = -mouseX;
        else if (mouseX > cardWidth) dx = mouseX - cardWidth;
        if (mouseY < 0) dy = -mouseY;
        else if (mouseY > cardHeight) dy = mouseY - cardHeight;
        
        minDistToEdge = Math.sqrt(dx * dx + dy * dy);
      }
      
      // Calculate gradient position (can be outside 0-100% range)
      const xPercent = (mouseX / cardWidth) * 100;
      const yPercent = (mouseY / cardHeight) * 100;
      
      // Calculate distance from center
      const centerX = cardWidth / 2;
      const centerY = cardHeight / 2;
      const distFromCenter = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
      const maxDistFromCenter = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
      
      // Normalize distances with same scale for inside and outside
      const referenceDistance = Math.min(cardWidth / 2, cardHeight / 2);
      
      // Edge proximity: 1 at edge, 0 at referenceDistance away
      const edgeProximity = Math.max(0, 1 - (minDistToEdge / referenceDistance));
      
      // Center distance normalized
      const centerDistanceNorm = Math.min(1, distFromCenter / maxDistFromCenter);
      
      // Calculate intensity - same formula for inside and outside
      // But scale down the overall intensity to match your gradient values
      const rawIntensity = Math.max(
        edgeProximity * 0.5,  // Reduced from 0.7
        (1 - centerDistanceNorm) * 0.3  // Reduced from 0.5
      );
      
      // Apply a subtle scaling to keep intensity controlled
      const combinedIntensity = rawIntensity * 0.8; // Scale down overall intensity
      
      // Dynamic radius based on distance from center
      const dynamicRadius = 150 + (centerDistanceNorm * 250);
      
      // Optional: fade out at extreme distances
      const maxDistance = 150; // pixels from card edge where effect fades completely
      const fadeFactor = minDistToEdge > maxDistance && !isInside ? 
        Math.max(0, 1 - ((minDistToEdge - maxDistance) / 50)) : 1;
      
      // Set CSS variables
      card.style.setProperty('--ring-x', `${xPercent}%`);
      card.style.setProperty('--ring-y', `${yPercent}%`);
      card.style.setProperty('--ring-r', `${dynamicRadius}px`);
      card.style.setProperty('--ring-intensity', (combinedIntensity * fadeFactor).toString());
      
      // Set opacity with minimum visibility
      const finalOpacity = Math.max(0.1, Math.min((combinedIntensity * fadeFactor) + 0.2, 0.8));
      card.style.setProperty('--ring-o', finalOpacity.toString());
    };
    
    const handleMouseLeave = () => {
      card.style.setProperty('--ring-o', '0');
    };
    
    // Use document-level mouse tracking for glow to avoid conflicts
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enableBorderGlow, cardRef]);

  // Separate effect for hover lift animation - only on actual card content
  React.useEffect(() => {
    if (!cardRef.current) return;
    
    const card = cardRef.current.querySelector('.card--border-glow') as HTMLElement;
    if (!card) return;
    
    const handleCardMouseEnter = () => {
      card.style.transform = 'translateY(-4px)';
    };
    
    const handleCardMouseLeave = () => {
      card.style.transform = 'translateY(0)';
    };
    
    // Only the card content should trigger hover animation
    card.addEventListener('mouseenter', handleCardMouseEnter);
    card.addEventListener('mouseleave', handleCardMouseLeave);
    
    return () => {
      card.removeEventListener('mouseenter', handleCardMouseEnter);
      card.removeEventListener('mouseleave', handleCardMouseLeave);
    };
  }, [cardRef]);

  const disabled = isMobile;

  return (
    <>
      {enableSpotlight && (
        <GlobalSpotlight gridRef={gridRef} disableAnimations={disabled} enabled={enableSpotlight} spotlightRadius={100} />
      )}
      <div ref={gridRef} className="bento-section relative">
        <div 
          ref={cardRef} 
          className="card-wrapper"
          style={{ 
            padding: '100px',
            pointerEvents: 'none' // Wrapper doesn't interfere with other cards
          }}
        >
          <style>{`
            .card-wrapper {
              position: relative;
              margin: -100px; /* Compensate for padding to maintain layout */
              pointer-events: none; /* Wrapper is transparent to hover events */
            }
            
            .card-wrapper .card {
              pointer-events: auto; /* Only the actual card content captures hover */
            }
            
            .card--border-glow { 
              border: 8px solid transparent !important; /* base border invisible */
              position: relative;
              border-radius: .75rem;
            }
            .card--border-glow::before {
              content: '';
              position: absolute;
              inset: -8px;
              border-radius: inherit;
              /* Dynamic radius based on distance */
              background:
                radial-gradient(var(--ring-r, 200px) circle at var(--ring-x, 50%) var(--ring-y, 50%),
                  rgba(255,255,255, var(--ring-intensity, 1.0)) 0%,
                  rgba(255,255,255, calc(var(--ring-intensity, 0.7) * 0.8)) 25%,
                  rgba(255,255,255, calc(var(--ring-intensity, 0.5) * 0.6)) 50%,
                  rgba(255,255,255, calc(var(--ring-intensity, 0.3) * 0.4)) 75%,
                  transparent 100%);
              padding: 8px; /* ring thickness */
              -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              mask-composite: exclude;
              pointer-events: none;
              opacity: var(--ring-o, 0); /* no forced full-ring on hover */
              transition: opacity .16s ease;
              z-index: 1;
            }
            /* IMPORTANT: do not force full visibility for the entire ring */
            /* .card--border-glow:hover::before { opacity: 1; } */
            /* Hover animation handled by JavaScript for better control */
            
            /* Ensure hover only works on actual card content, not padding area */
            .card-wrapper .card {
              transition: transform .3s ease;
            }
          `}</style>
          <ParticleCard
            className={`card ${enableBorderGlow ? 'card--border-glow' : ''} ${className}`}
            disableAnimations={disabled}
            particleCount={enableStars ? 8 : 0}
            glowColor={'255,255,255'}
            enableTilt={false}
            clickEffect={true}
            enableMagnetism={false}
          >
            {children}
          </ParticleCard>
        </div>
      </div>
    </>
  );
};

