/**
 * Throttle utility function
 * Limits how frequently a function can be called
 * 
 * @param {Function} fn - The function to throttle
 * @param {number} delay - The delay in milliseconds between executions
 * @param {Object} options - Configuration options
 * @param {boolean} options.leading - Execute on leading edge (default: true)
 * @param {boolean} options.trailing - Execute on trailing edge (default: true)
 * @returns {Function} - A throttled version of the input function
 * 
 * Features:
 * - Executes immediately on first call (leading edge)
 * - Executes the last call after delay (trailing edge)
 * - Prevents execution until the delay period passes
 * - Preserves 'this' context and arguments
 * - Returns the result of function execution
 * - Configurable leading/trailing behavior
 * 
 * Example usage:
 * ```javascript
 * // Basic throttle
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll event handled');
 * }, 200);
 * 
 * // With options
 * const leadingOnly = throttle(fn, 1000, { leading: true, trailing: false });
 * 
 * // With context preservation
 * window.addEventListener('resize', throttle(this.handleResize.bind(this), 250));
 * ```
 */
function throttle(fn, delay, options = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('throttle: first argument must be a function');
  }
  if (typeof delay !== 'number' || isNaN(delay)) {
    throw new TypeError('throttle: delay must be a valid number');
  }

  const { leading = true, trailing = true } = options;
  let timeoutId = null;
  // When the current delay window started; null while no window is open.
  let lastCallTime = null;
  let lastArgs = null;
  let lastContext = null;
  let lastResult;

  // Execute the function and update state
  const execute = (context, args) => {
    lastCallTime = Date.now();
    lastResult = fn.apply(context, args);
    return lastResult;
  };

  // Schedule trailing execution
  const scheduleTrailing = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (lastArgs) {
        execute(lastContext, lastArgs);
        lastArgs = null;
        lastContext = null;
      }
      // Without a leading call, the next call must open a new window instead of running immediately.
      if (!leading) {
        lastCallTime = null;
      }
    }, Math.max(0, delay - (Date.now() - lastCallTime)));
  };

  // Return the throttled function
  return function throttled(...args) {
    const currentTime = Date.now();

    // With leading disabled, the first call of a burst only opens the delay window.
    if (!leading && lastCallTime === null) {
      lastCallTime = currentTime;
    }

    const windowHasPassed = lastCallTime === null || currentTime - lastCallTime >= delay;

    if (leading && windowHasPassed && timeoutId === null) {
      return execute(this, args);
    }

    // Keep the latest call so it can run when the window ends
    if (trailing) {
      lastArgs = args;
      lastContext = this;
      scheduleTrailing();
    }

    // Return last result for immediate feedback
    return lastResult;
  };
}

module.exports = throttle;
