'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

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

  const wordVariants = {
    hidden: {
      ...getInitialPosition(),
      filter: 'blur(10px)',
    },
    visible: {
      ...getAnimatePosition(),
      filter: 'blur(0px)',
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

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
