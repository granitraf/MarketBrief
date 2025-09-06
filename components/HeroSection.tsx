'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import StarBorder from '@/components/ui/StarBorder';
import BlurText from '@/components/ui/BlurText';

// Dynamically import LightRays to prevent SSR issues
const LightRays = dynamic(() => import('./ui/LightRays'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-black" />
  )
});

export default function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set loaded state after a short delay to ensure proper rendering
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Set background ready immediately, then add delay for text animation timing
    const backgroundTimer = setTimeout(() => {
      setBackgroundReady(true);
    }, 1500); // Wait 1.5 seconds for text animation timing after background loads

    return () => clearTimeout(backgroundTimer);
  }, []);

  const scrollToDashboard = () => {
    const dashboard = document.querySelector('.dashboard-section');
    if (dashboard) {
      dashboard.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div 
      ref={heroRef}
      className="relative min-h-screen bg-black text-white overflow-hidden"
    >
      {/* Dark overlay to ensure darkest possible background */}
      <div className="absolute inset-0 bg-black z-0" />
      
      {/* LightRays Background */}
      <div className="absolute inset-0 z-1">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1.8}
          lightSpread={1.6}
          rayLength={3}
          pulsating={false}
          fadeDistance={1.6}
          saturation={0.6}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.25}
          distortion={0.0}
          className="w-full h-full"
        />
      </div>


      {/* Additional dark overlay to darken the bottom area */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black z-2"
        style={{ 
          opacity: 0.8
        }}
      />

      {/* Fallback background for when WebGL isn't available - matches Dashboard exactly */}
      <div 
        className="absolute inset-0 bg-black z-3"
        style={{ 
          opacity: isLoaded ? 0 : 0.9,
          transition: 'opacity 2s ease-in-out'
        }}
      />

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        {/* Main Title with Logo */}
        <div className="flex items-center justify-center gap-2 mb-2 animate-fade-in-up">
          <img 
            src="/LOGO.png" 
            alt="MarketBrief Logo" 
            className="w-24 h-24 md:w-96 md:h-48 object-contain"
            style={{ 
              aspectRatio: '1/1',
              transform: 'translateX(10px)'
            }}
          />
          
        </div>

        {/* Subtitle */}
        {backgroundReady ? (
          <BlurText
            text="Real-time market insight, all on one page."
            delay={310}
            animateBy="words"
            direction="top"
            onAnimationComplete={() => console.log('Subtitle animation completed')}
            className="text-xl md:text-2xl text-zinc-300 mb-12 max-w-2xl"
            shouldAnimate={true}
          />
        ) : (
          <div className="text-xl md:text-2xl text-zinc-300 mb-12 max-w-2xl h-8">
            {/* Empty div to maintain spacing without showing text */}
          </div>
        )}

        {/* CTA Button */}
        <StarBorder
          as="button"
          onClick={scrollToDashboard}
          className="hover:scale-105 transition-transform duration-300 animate-fade-in-up animation-delay-400"
          color="#9CA3AF"
          speed="6s"
          thickness={1}
        >
          View Dashboard
        </StarBorder>

      </div>
    </div>
  );
}