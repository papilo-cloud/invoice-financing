import { motion } from 'framer-motion';

export const Card = ({ children, className = '', hover = false, ...props }) => {
  const baseStyles = 'glass p-6 rounded-2xl border-gray-700';
  const hoverStyles = hover ? 'hover:bg-dark-800 hover:border-primary-500/50 transition-all duration-300' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${baseStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};