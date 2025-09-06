'use client';

import { motion, useInView, Variants } from 'framer-motion';
import { useRef } from 'react';

// Use a cubic-bezier tuple (valid Easing for framer-motion)
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Helper to build consistent variant shapes (both x and y present)
const makeVariants = (
  direction: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
): Variants => {
  const from =
    direction === 'top' ? { x: 0, y: -20 } :
    direction === 'bottom' ? { x: 0, y: 20 } :
    direction === 'left' ? { x: -20, y: 0 } :
    { x: 20, y: 0 };

  return {
    hidden: {
      filter: 'blur(10px)',
      opacity: 0,
      x: from.x,
      y: from.y,
    },
    visible: {
      filter: 'blur(0px)',
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.6, ease: EASE },
    },
  };
};

interface BlurTextProps {
  text: string;
  delay?: number;
  animateBy?: 'words' | 'characters';
  direction?: 'top' | 'bottom' | 'left' | 'right';
  onAnimationComplete?: () => void;
  className?: string;
  shouldAnimate?: boolean;
}

const BlurText = ({
  text,
  delay = 0,
  animateBy = 'words',
  direction = 'top',
  onAnimationComplete,
  className = '',
  shouldAnimate = true,
}: BlurTextProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const getInitialPosition = () => {
    switch (direction) {
      case 'top':
        return { y: -20, opacity: 0 };
      case 'bottom':
        return { y: 20, opacity: 0 };
      case 'left':
        return { x: -20, opacity: 0 };
      case 'right':
        return { x: 20, opacity: 0 };
      default:
        return { y: -20, opacity: 0 };
    }
  };

  const getAnimatePosition = () => {
    switch (direction) {
      case 'top':
        return { y: 0, opacity: 1 };
      case 'bottom':
        return { y: 0, opacity: 1 };
      case 'left':
        return { x: 0, opacity: 1 };
      case 'right':
        return { x: 0, opacity: 1 };
      default:
        return { y: 0, opacity: 1 };
    }
  };

  const splitText = () => {
    if (animateBy === 'words') {
      return text.split(' ');
    }
    return text.split('');
  };

  const words = splitText();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay / 1000,
        onComplete: onAnimationComplete,
      },
    },
  };

  const wordVariants: Variants = makeVariants(direction);

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView && shouldAnimate ? 'visible' : 'hidden'}
      className={className}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={wordVariants}
          className="inline-block mr-1"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

export default BlurText;
