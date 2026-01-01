/**
 * Shared Framer Motion animation variants
 * Used across Tournament, RoundRecap, Round, App, and other pages
 */

/** Staggered container that reveals children sequentially */
export const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

/** Fade-in + slide-up animation for list items */
export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};
