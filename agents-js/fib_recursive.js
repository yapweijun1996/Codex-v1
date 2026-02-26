/**
 * Calculates the nth Fibonacci number using recursion.
 * 
 * @param {number} n - The index of the Fibonacci sequence.
 * @returns {number} The nth Fibonacci number.
 */
function getFibonacciRecursive(n) {
  // Input validation
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("Input must be a non-negative integer.");
  }

  // Base cases: Fibonacci(0) = 0, Fibonacci(1) = 1
  if (n <= 1) {
    return n;
  }

  // Recursive call
  return getFibonacciRecursive(n - 1) + getFibonacciRecursive(n - 2);
}

// Test the function
try {
  const result = getFibonacciRecursive(10);
  console.log(`Fibonacci(10) is: ${result}`);
} catch (error) {
  console.error(error.message);
}

