import React from 'react';

type StarBorderProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  as?: T;
  className?: string;
  children?: React.ReactNode;
  color?: string;
  speed?: React.CSSProperties['animationDuration'];
  thickness?: number;
};

const StarBorder = <T extends React.ElementType = 'button'>({
  as,
  className = '',
  color = 'white',
  speed = '6s',
  thickness = 1,
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = as || 'button';

  return (
    <Component
      className={`relative inline-block overflow-hidden rounded-[30px] ${className}`}
      {...(rest as any)}
      style={{
        padding: `${thickness}px 0`,
        ...(rest as any).style
      }}
    >
      <div
        className="absolute w-[400%] h-[60%] opacity-70 bottom-[-15px] right-[-300%] rounded-full animate-star-movement-bottom z-0"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 12%)`,
          animationDuration: speed
        }}
      ></div>
      <div
        className="absolute w-[400%] h-[60%] opacity-70 top-[-15px] left-[-300%] rounded-full animate-star-movement-top z-0"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 12%)`,
          animationDuration: speed
        }}
      ></div>
      <div className="relative z-1 bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 text-white text-center text-[18px] py-[20px] px-[32px] rounded-[30px]">
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
