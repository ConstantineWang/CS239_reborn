const axios = require("axios");

// Get command line arguments
const args = process.argv.slice(2);
let functionName = "hello"; // Default function

// Parse arguments to find function name
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--function-name" || args[i] === "-fn") {
    functionName = args[i + 1];
    break;
  }
}

// Check for environment variable (needed for faastjs execution)
if (process.env.SELECTED_FUNCTION) {
  functionName = process.env.SELECTED_FUNCTION;
}

// All our functions will be wrapped in this hello function
// This ensures compatibility with faastjs
async function hello(input) {
  console.log(`Using implementation: ${functionName} with input: ${input}`);

  switch (functionName) {
    case "fibonacci":
      return fibonacci(input);
    case "factorial":
      return factorial(input);
    case "matrixMultiplication":
      return matrixMultiplication(input);
    case "httpRequest":
      return httpRequest(input);
    case "countPrime":
      return countPrime(input);
    case "deepRecursion":
      return deepRecursion(input);
    case "sortLargeArray":
      return sortLargeArray(input);
    case "hello":
    default:
      return `Hello, ${input}!`;
  }
}

function fibonacci(n) {
  n = parseInt(n) || 30;
  if (n <= 0) return (0).toString();
  if (n === 1) return (1).toString();
  let a = 0,
    b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return `Fibonacci(${n}) = ${b.toString()}`;
}

function factorial(n) {
  n = parseInt(n) || 20;
  let result = BigInt(1);
  for (let i = 2; i <= n; i++) {
    result *= BigInt(i);
  }
  return `Factorial(${n}) = ${result.toString()}`;
}

function matrixMultiplication(size) {
  size = parseInt(size) || 100;
  const A = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.random())
  );
  const B = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.random())
  );
  const C = Array.from({ length: size }, () => Array(size).fill(0));

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let sum = 0;
      for (let k = 0; k < size; k++) {
        sum += A[i][k] * B[k][j];
      }
      C[i][j] = sum;
    }
  }
  return `Matrix multiplication complete for size ${size}x${size}. First row sample: ${C[0]
    .slice(0, 3)
    .join(", ")}...`;
}

async function httpRequest(url) {
  url = "https://jsonplaceholder.typicode.com/posts/1";
  try {
    const response = await axios.get(url);
    return `API Response: ${JSON.stringify(response.data)}`;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return `API Error: ${error.message}`;
    } else {
      return "An unknown error occurred";
    }
  }
}

const isPrime = (n) => {
  if (n <= 1) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
};

function countPrime(limit) {
  limit = parseInt(limit) || 10000;
  let primeCount = 0;
  for (let i = 2; i <= limit; i++) {
    if (isPrime(i)) {
      primeCount++;
    }
  }
  return `Found ${primeCount} prime numbers up to ${limit}`;
}

function deepRecursion(n) {
  n = parseInt(n) || 100;
  if (n <= 1) return "1";
  return deepRecursion(n - 1) + "+1";
}

function sortLargeArray(size) {
  size = parseInt(size) || 100000;
  const largeArray = [];
  for (let i = 0; i < size; i++) {
    largeArray.push(Math.random());
  }
  largeArray.sort((a, b) => a - b);
  return `Sorted array with ${size} elements. First 3 elements: ${largeArray
    .slice(0, 3)
    .join(", ")}`;
}

console.log(`Selected function implementation: ${functionName}`);

// Export only the hello function, which will dispatch to the selected implementation
module.exports = {
  hello,
};
