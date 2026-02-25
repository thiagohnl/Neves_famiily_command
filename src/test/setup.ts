import '@testing-library/jest-dom';
import React from 'react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const motionHandler = {
    get(_target: any, prop: string) {
      // Return a simple forwardRef component for any motion.div, motion.button, etc.
      return React.forwardRef(({ children, ...props }: any, ref: any) => {
        // Strip motion-specific props
        const filtered = { ...props };
        const motionKeys = [
          'initial', 'animate', 'exit', 'transition', 'whileHover',
          'whileTap', 'layout', 'layoutId', 'variants', 'whileInView',
          'viewport', 'onAnimationComplete', 'drag', 'dragConstraints',
        ];
        motionKeys.forEach((k) => delete filtered[k]);
        return React.createElement(prop, { ...filtered, ref }, children);
      });
    },
  };

  return {
    motion: new Proxy({}, motionHandler),
    AnimatePresence: ({ children }: any) => children,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useInView: () => true,
  };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock import.meta.env for Supabase
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
