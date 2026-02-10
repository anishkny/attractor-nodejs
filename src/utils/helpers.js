/**
 * Utility functions for the execution engine
 */

/**
 * Parse duration string to milliseconds
 */
export function parseDuration(duration) {
  if (typeof duration === 'number') return duration;
  if (!duration || typeof duration !== 'string') return 0;

  const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) return 0;

  const [, value, unit] = match;
  const num = parseInt(value);

  switch (unit) {
    case 'ms': return num;
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

/**
 * Normalize label for comparison
 */
export function normalizeLabel(label) {
  if (!label) return '';
  
  // Remove accelerator prefixes: [K], K), K -
  let normalized = label.replace(/^\[(\w)\]\s*/,  '');
  normalized = normalized.replace(/^(\w)\)\s*/, '');
  normalized = normalized.replace(/^(\w)\s*-\s*/, '');
  
  return normalized.toLowerCase().trim();
}

/**
 * Parse accelerator key from label
 */
export function parseAcceleratorKey(label) {
  if (!label) return '';

  // Try patterns: [K], K), K -
  let match = label.match(/^\[(\w)\]/);
  if (match) return match[1].toUpperCase();

  match = label.match(/^(\w)\)/);
  if (match) return match[1].toUpperCase();

  match = label.match(/^(\w)\s*-/);
  if (match) return match[1].toUpperCase();

  // Fallback: first character
  return label.charAt(0).toUpperCase();
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
