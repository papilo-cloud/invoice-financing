import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export const Toast = ({ type, message }) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  };

  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="glass rounded-xl p-4 flex items-center gap-3 min-w-[300px]"
    >
      <Icon className={`w-5 h-5 ${colors[type]}`} />
      <p className="flex-1">{message}</p>
    </motion.div>
  );
};