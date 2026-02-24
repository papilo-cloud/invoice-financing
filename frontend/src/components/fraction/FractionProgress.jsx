import { motion } from 'framer-motion';

export const FractionProgress = ({ sold, total }) => {
  const percentage = (sold / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Fractions Sold</span>
        <span className="font-semibold">
          {sold} / {total} ({percentage.toFixed(1)}%)
        </span>
      </div>
      
      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
        />
      </div>
    </div>
  );
};