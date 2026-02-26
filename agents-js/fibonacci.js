/**
 * Calculates the nth Fibonacci number using recursion.
 * The sequence starts with 0, 1, 1, 2, 3, 5, 8, 13, 21, ...
 * 
 * @param {number} n - The index of the Fibonacci number to retrieve (0-indexed).
 * @returns {number} - The nth Fibonacci number.
 * @throws {Error} - If the input is not a non-negative integer.
 */
const getFibonacciRecursive = (n) => {
  // 1. Error Handling: Ensure input is a valid non-negative integer
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("Input must be a non-negative integer.");
  }

  // 2. Base Cases
  if (n === 0) return 0;
  if (n === 1) return 1;

  // 3. Recursive Step: F(n) = F(n-1) + F(n-2)
  return getFibonacciRecursive(n - 1) + getFibonacciRecursive(n - 2);
};

// Simple test
try {
  console.log("Fibonacci(10):", getFibonacciRecursive(10));
} catch (e) {
  console.error(e.message);
}
