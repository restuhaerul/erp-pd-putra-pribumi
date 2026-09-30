// components/AnimatedMenuIcon.tsx
import React from 'react';

interface Props {
  isOpen: boolean;
}

const AnimatedMenuIcon: React.FC<Props> = ({ isOpen }) => {
  return (
    <div className="relative w-6 h-6">
      {/* Line 1 */}
      <span
        className={`block absolute h-0.5 w-full bg-current transform transition duration-300 ease-in-out
          ${isOpen ? 'rotate-45 top-2.5' : 'top-1'}
        `}
      />
      {/* Line 2 */}
      <span
        className={`block absolute h-0.5 w-full bg-current transition-all duration-300 ease-in-out
          ${isOpen ? 'opacity-0' : 'top-2.5'}
        `}
      />
      {/* Line 3 */}
      <span
        className={`block absolute h-0.5 w-full bg-current transform transition duration-300 ease-in-out
          ${isOpen ? '-rotate-45 top-2.5' : 'top-4'}
        `}
      />
    </div>
  );
};

export default AnimatedMenuIcon;
