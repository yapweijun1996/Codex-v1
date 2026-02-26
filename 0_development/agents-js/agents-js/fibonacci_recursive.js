/**
 * Calculates the Fibonacci number at a given index using recursion.
 * 
 * @param {number} n - The index of the Fibonacci sequence.
 * @returns {number} The Fibonacci number at index n.
 * @throws {Error} If n is not a non-negative integer.
 */
function getFibonacciRecursive(n) {
  // 1. Error Handling
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('Input must be a non-negative integer.');
  }

  // 2. Base Cases
  if (n === 0) return 0;
  if (n === 1) return 1;

  // 3. Recursive Step
  // Note: This is a direct implementation of the Fibonacci definition.
  // For large n, this is less efficient than the iterative version due to redundant calculations.
  return getFibonacciRecursive(n - 1) + getFibonacciRecursive(n - 2);
}

// Example usage:
try {
  const index = 10;
  console.log(`Fibonacci (Recursive) at index ${index}: ${getFibonacciRecursive(index)}`);
} catch (error) {
  console.error(error.message);
}

module.exports = getFibonacciRecursive;
