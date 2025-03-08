// load-test.js - Script to simulate user load for testing
const axios = require("axios");

const SERVER_URL = "http://localhost:3000";
const TOTAL_REQUESTS = 50;
const MAX_CONCURRENT = 5;
const NAMES = [
  "Alice",
  "Bob",
  "Charlie",
  "David",
  "Eve",
  "Frank",
  "Grace",
  "Heidi",
];

async function sendRequest(id) {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const startTime = Date.now();

  try {
    const response = await axios.get(`${SERVER_URL}/api/hello/${name}`);
    const duration = Date.now() - startTime;

    console.log(
      `Request #${id} completed in ${duration}ms: ${response.data.message}`
    );
    console.log(
      `  Execution time: ${response.data.executionTimeMs.toFixed(2)}ms`
    );
    console.log(`  Memory used: ${response.data.memoryUsedMb.toFixed(2)}MB`);
    console.log(`  Estimated cost: $${response.data.estimatedCost.toFixed(8)}`);
  } catch (error) {
    console.error(`Request #${id} failed: ${error.message}`);
  }
}

async function runLoadTest() {
  console.log(
    `Starting load test with ${TOTAL_REQUESTS} total requests, ${MAX_CONCURRENT} max concurrent`
  );
  const startTime = Date.now();

  for (let i = 0; i < TOTAL_REQUESTS; i += MAX_CONCURRENT) {
    const batch = [];
    for (let j = 0; j < MAX_CONCURRENT && i + j < TOTAL_REQUESTS; j++) {
      batch.push(sendRequest(i + j + 1));
    }

    await Promise.all(batch);

    if (i % 10 === 0 && i > 0) {
      try {
        const metricsResponse = await axios.get(`${SERVER_URL}/api/metrics`);
        const { currentOptimalConfig } = metricsResponse.data;

        console.log(`\nCurrent optimal configuration after ${i} requests:`);
        console.log(`  Memory: ${currentOptimalConfig.memorySize}MB`);
        console.log(`  Concurrency: ${currentOptimalConfig.concurrency}`);
        console.log(
          `  Total requests processed: ${metricsResponse.data.totalRequestsProcessed}\n`
        );
      } catch (error) {
        console.error("Failed to fetch metrics:", error.message);
      }
    }
  }

  const totalDuration = (Date.now() - startTime) / 1000;
  console.log(`\nLoad test completed in ${totalDuration.toFixed(2)} seconds`);

  // Get final metrics
  try {
    const metricsResponse = await axios.get(`${SERVER_URL}/api/metrics`);
    console.log("\nFinal system metrics:");
    console.log(JSON.stringify(metricsResponse.data, null, 2));
  } catch (error) {
    console.error("Failed to fetch final metrics:", error.message);
  }
}

// Run the load test
runLoadTest().catch((error) => {
  console.error("Load test failed:", error);
});
