// server.js - Main server file that handles requests and invokes faast functions
const express = require("express");
const { faast } = require("faastjs");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Current optimal configuration for our serverless functions
let currentOptimalConfig = {
  memorySize: 256,
  concurrency: 20,
};

// Store performance metrics for analysis
const performanceHistory = [];

// Load existing performance history if available
try {
  const data = fs.readFileSync("performance_history.json", "utf8");
  performanceHistory.push(...JSON.parse(data));

  // Find optimal configuration from existing data
  updateOptimalConfiguration();

  console.log(
    `Loaded existing performance history with ${performanceHistory.length} entries`
  );
  console.log(
    `Starting with optimal config: Memory ${currentOptimalConfig.memorySize}MB, Concurrency ${currentOptimalConfig.concurrency}`
  );
} catch (err) {
  console.log("No existing performance history found, starting fresh");
}

// Middleware to parse JSON bodies
app.use(express.json());

// Endpoint to handle user requests
app.get("/api/hello/:name", async (req, res) => {
  const name = req.params.name || "world";

  try {
    const result = await processRequest(name);
    res.json({
      message: result.message,
      executionTimeMs: result.executionTimeMs,
      memoryUsedMb: result.memoryUsedMb,
      estimatedCost: result.cost,
    });

    // Log performance to console
    console.log(
      `Request processed: ${result.executionTimeMs.toFixed(
        2
      )}ms, ${result.memoryUsedMb.toFixed(2)}MB, $${result.cost.toFixed(8)}`
    );
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Endpoint to get performance metrics
app.get("/api/metrics", (req, res) => {
  res.json({
    currentOptimalConfig,
    recentPerformance: performanceHistory.slice(-10),
    totalRequestsProcessed: performanceHistory.length,
  });
});

// Function to process a request using the current optimal configuration
async function processRequest(name) {
  const start = process.hrtime.bigint();
  const memorySampleStart = process.memoryUsage().heapUsed;

  // Import functions directly from the file
  const funcs = require("./functions.js");

  // Initialize faast with current optimal configuration
  const m = await faast("local", funcs, {
    memorySize: currentOptimalConfig.memorySize,
    maxConcurrency: currentOptimalConfig.concurrency,
  });

  try {
    const { hello } = m.functions;
    const message = await hello(name);

    const end = process.hrtime.bigint();
    const executionTimeMs = Number(end - start) / 1_000_000;
    const memoryUsed = process.memoryUsage().heapUsed - memorySampleStart;
    const memoryUsedMb = memoryUsed / 1024 / 1024;

    // Calculate estimated AWS Lambda cost
    const cost = estimateLambdaCost(
      executionTimeMs,
      currentOptimalConfig.memorySize,
      memoryUsedMb
    );

    // Record this execution's performance
    const metrics = {
      timestamp: new Date().toISOString(),
      concurrency: currentOptimalConfig.concurrency,
      memorySize: currentOptimalConfig.memorySize,
      executionTimeMs,
      memoryUsedMb,
      cost,
      message,
    };

    performanceHistory.push(metrics);

    // Every 10 requests, analyze performance and update optimal configuration
    if (performanceHistory.length % 10 === 0) {
      updateOptimalConfiguration();
      savePerformanceHistory();
    }

    return metrics;
  } finally {
    // Always clean up the faast instance
    await m.cleanup();
  }
}

// Calculate AWS Lambda cost estimate
function estimateLambdaCost(
  executionTimeMs,
  configuredMemoryMb,
  actualMemoryMb
) {
  // AWS Lambda pricing is based on configured memory, not actual usage
  // Lambda is billed based on GB-seconds (GB of RAM * seconds of execution)
  const gbSeconds = (configuredMemoryMb / 1024) * (executionTimeMs / 1000);

  // AWS Lambda price per GB-second (as of 2024)
  const pricePerGbSecond = 0.0000166667;

  return gbSeconds * pricePerGbSecond;
}

// Analyze performance data and update the optimal configuration
function updateOptimalConfiguration() {
  if (performanceHistory.length < 5) return;

  // Get the most recent 50 entries (or all if less than 50)
  const recentMetrics = performanceHistory.slice(-50);

  // Group metrics by configuration (memorySize + concurrency)
  const configGroups = new Map();

  recentMetrics.forEach((metric) => {
    const configKey = `${metric.memorySize}-${metric.concurrency}`;
    if (!configGroups.has(configKey)) {
      configGroups.set(configKey, []);
    }
    configGroups.get(configKey).push(metric);
  });

  // Calculate average cost and performance for each configuration
  const configPerformance = [];

  configGroups.forEach((metrics, configKey) => {
    if (metrics.length < 3) return; // Skip configs with too few samples

    const avgCost =
      metrics.reduce((sum, m) => sum + m.cost, 0) / metrics.length;
    const avgTime =
      metrics.reduce((sum, m) => sum + m.executionTimeMs, 0) / metrics.length;

    const [memorySize, concurrency] = configKey.split("-").map(Number);

    configPerformance.push({
      memorySize,
      concurrency,
      avgCost,
      avgTime,
      samples: metrics.length,
    });
  });

  // Sort by average cost (lowest first)
  configPerformance.sort((a, b) => a.avgCost - b.avgCost);

  // If we have at least one config with sufficient data, update our optimal config
  if (configPerformance.length > 0) {
    const optimal = configPerformance[0];

    // Only change config if it's significantly better (5% improvement in cost)
    const currentConfigPerf = configPerformance.find(
      (c) =>
        c.memorySize === currentOptimalConfig.memorySize &&
        c.concurrency === currentOptimalConfig.concurrency
    );

    if (
      !currentConfigPerf ||
      optimal.avgCost < currentConfigPerf.avgCost * 0.95
    ) {
      const oldConfig = { ...currentOptimalConfig };

      currentOptimalConfig = {
        memorySize: optimal.memorySize,
        concurrency: optimal.concurrency,
      };

      console.log(
        `Updated optimal configuration from Memory ${oldConfig.memorySize}MB, Concurrency ${oldConfig.concurrency} to Memory ${currentOptimalConfig.memorySize}MB, Concurrency ${currentOptimalConfig.concurrency}`
      );
      console.log(
        `New avg cost: $${optimal.avgCost.toFixed(
          8
        )}, avg time: ${optimal.avgTime.toFixed(2)}ms from ${
          optimal.samples
        } samples`
      );
    }
  }

  // Every 100 requests, explore a new configuration to avoid local minimums
  if (performanceHistory.length % 100 === 0) {
    exploreNewConfiguration();
  }
}

// Occasionally try new configurations to find global optimum
function exploreNewConfiguration() {
  // List of memory configurations to explore
  const memorySizes = [128, 256, 512, 1024, 2048];
  const concurrencyLevels = [5, 10, 20, 50, 100];

  // Choose a random configuration that's different from current
  let newMemory, newConcurrency;

  do {
    newMemory = memorySizes[Math.floor(Math.random() * memorySizes.length)];
    newConcurrency =
      concurrencyLevels[Math.floor(Math.random() * concurrencyLevels.length)];
  } while (
    newMemory === currentOptimalConfig.memorySize &&
    newConcurrency === currentOptimalConfig.concurrency
  );

  currentOptimalConfig = {
    memorySize: newMemory,
    concurrency: newConcurrency,
  };

  console.log(
    `Exploring new configuration: Memory ${newMemory}MB, Concurrency ${newConcurrency}`
  );
}

// Save performance history to disk
function savePerformanceHistory() {
  // Only keep the most recent 1000 entries to prevent indefinite growth
  const historyToSave = performanceHistory.slice(-1000);
  fs.writeFileSync(
    "performance_history.json",
    JSON.stringify(historyToSave, null, 2)
  );
  console.log(`Saved ${historyToSave.length} performance records to disk`);
}

// Serve static files from the public directory
app.use(express.static("public"));

// Add a route for the dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
