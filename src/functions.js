// functions.js - Contains the serverless functions to be invoked
function hello(name) {
  // Simulate some processing work
  const startTime = Date.now();

  // Do some CPU work to simulate processing
  let counter = 0;
  for (let i = 0; i < 1_000_000; i++) {
    counter += i;
  }

  // Create a response message
  const message = `Hello, ${name}! (Processed in ${Date.now() - startTime}ms)`;

  return message;
}

// Add more serverless functions as needed
function processData(data) {
  // Simulate data processing
  const startTime = Date.now();

  // Do some work
  const result = {
    processed: true,
    originalData: data,
    processingTime: 0,
  };

  // Simulate more intensive processing for larger inputs
  const complexity =
    typeof data === "object"
      ? JSON.stringify(data).length
      : String(data).length;

  let counter = 0;
  for (let i = 0; i < Math.min(complexity * 10000, 10_000_000); i++) {
    counter += i;
  }

  result.processingTime = Date.now() - startTime;

  return result;
}

module.exports = {
  hello,
  processData,
};
