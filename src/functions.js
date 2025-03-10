const axios = require("axios");

function hello(name) {
  return "hello " + name;
}

function fibonacci(n = 500000) {
  if (n <= 0) return (0).toString();
  if (n === 1) return (1).toString();
  let a = 0,
    b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b.toString();
}

function factorial(n = 500000) {
  let result = BigInt(1);
  for (let i = 2; i <= n; i++) {
    result *= BigInt(i);
  }
  return result.toString().slice(0, 10);
}

function matrixMultiplication(size = 2000) {
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
  return C[0].join(", ");
}

async function httpRequest(
  url = "https://jsonplaceholder.typicode.com/posts/1"
) {
  try {
    const response = await axios.get(url);
    return JSON.stringify(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return error.message;
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

function countPrime(limit = 50000) {
  let primeCount = 0;
  for (let i = 2; i <= limit; i++) {
    if (isPrime(i)) {
      primeCount++;
    }
  }
  return primeCount.toString();
}

function deepRecursion(n = 1000) {
  if (n <= 1) return "1";
  return deepRecursion(n - 1);
}

function sortLargeArray(size = 1_000_000) {
  const largeArray = [];
  for (let i = 0; i < size; i++) {
    largeArray.push(Math.random());
  }
  largeArray.sort((a, b) => a - b);
  return `Sorted array with ${size} elements`;
}

// Export functions using CommonJS syntax
module.exports = {
  hello,
  fibonacci,
  factorial,
  matrixMultiplication,
  httpRequest,
  countPrime,
  deepRecursion,
  sortLargeArray,
};
