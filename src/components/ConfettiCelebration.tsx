import React from 'react';
import Confetti from 'react-confetti';
import toast from 'react-hot-toast';

interface ConfettiCelebrationProps {
  show: boolean;
  onComplete: () => void;
  message?: string;
  /** No sound (the wall tablet's birthday confetti). */
  silent?: boolean;
}

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({ 
  show, 
  onComplete, 
  message = "Awesome work! You're amazing! 🌟",
  silent = false
}) => {
  React.useEffect(() => {
    if (show) {
      // Play celebration sound (if available)
      if (!silent) try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio errors (user interaction required)
        });
      } catch {
        // Ignore audio errors
      }
      
      // Show toast message
      toast.success(message, {
        icon: '🎉',
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          borderRadius: '16px',
          padding: '16px 24px',
        },
      });
    }
  }, [show, message, silent]);
  
  if (!show) return null;

  return (
    <Confetti
      width={window.innerWidth}
      height={window.innerHeight}
      recycle={false}
      numberOfPieces={500}
      gravity={0.3}
      colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#FF69B4', '#9370DB', '#00CED1']}
      onConfettiComplete={onComplete}
    />
  );
};