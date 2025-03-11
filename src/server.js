const express = require("express");
const { faast } = require("faastjs");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Get command line arguments to check for function-name
const args = process.argv.slice(2);
let selectedFunction = "hello"; // Default function

// Parse arguments to find function name
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--function-name" || args[i] === "-fn") {
    selectedFunction = args[i + 1];
    break;
  }
}

console.log(`Selected function implementation: ${selectedFunction}`);

let currentOptimalConfig = {
  memorySize: 256,
  concurrency: 20,
};

const performanceHistory = [];

try {
  const data = fs.readFileSync("performance_history.json", "utf8");
  performanceHistory.push(...JSON.parse(data));

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

app.use(express.json());

app.get("/test/:name", async (req, res) => {
  const name = req.params.name || "world";

  try {
    const result = await processRequest(name);

    // Send the response
    res.json({
      message: result.message,
      executionTimeMs: result.executionTimeMs,
      memoryUsedMb: result.memoryUsedMb,
      estimatedCost: result.cost,
      costDetails: result.costDetails,
      function: selectedFunction,
    });

    // Log after sending the response to avoid any potential issues
    console.log(
      `${selectedFunction} request processed: ${result.executionTimeMs.toFixed(
        2
      )}ms, ${result.memoryUsedMb.toFixed(2)}MB, $${
        typeof result.cost === "number" && !isNaN(result.cost)
          ? result.cost.toFixed(8)
          : "(cost data unavailable)"
      }`
    );
  } catch (error) {
    console.error("Error processing request:", error);

    // Check if headers are not already sent
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to process request",
        message: error.message,
      });
    }
  }
});

app.get("/api/metrics", (req, res) => {
  res.json({
    currentOptimalConfig,
    currentFunction: selectedFunction,
    recentPerformance: performanceHistory,
    totalRequestsProcessed: performanceHistory.length,
  });
});

async function processRequest(name) {
  const start = process.hrtime.bigint();
  const memorySampleStart = process.memoryUsage().heapUsed;

  const funcs = require(path.join(__dirname, "functions.js"));

  const m = await faast("aws", funcs, {
    memorySize: currentOptimalConfig.memorySize,
    maxConcurrency: currentOptimalConfig.concurrency,
    env: {
      SELECTED_FUNCTION: selectedFunction,
    },
  });

  let message;
  let executionTimeMs;
  let memoryUsedMb;
  let costValue;
  let costDetails;
  
  try {
    const { hello } = m.functions;
    message = await hello(name);
    
    const end = process.hrtime.bigint();
    executionTimeMs = Number(end - start) / 1_000_000;
    const memoryUsed = process.memoryUsage().heapUsed - memorySampleStart;
    memoryUsedMb = memoryUsed / 1024 / 1024;
  } finally {
    // Get cost snapshot inside finally block as recommended in documentation
    const costSnapshot = await m.costSnapshot();
    
    // Fix the cost calculation using total() method from the documentation
    costValue = costSnapshot.total ? costSnapshot.total() : 0;
    
    costDetails = {
      total: costValue,
      breakdown: costSnapshot.costMetrics ? 
        costSnapshot.costMetrics.reduce((acc, metric) => {
          acc[metric.name] = metric.price;
          return acc;
        }, {}) : {},
      csv: typeof costSnapshot.csv === 'function' ? costSnapshot.csv() : null,
    };
    
    await m.cleanup();
  }
  
  const metrics = {
    timestamp: new Date().toISOString(),
    function: selectedFunction,
    concurrency: currentOptimalConfig.concurrency,
    memorySize: currentOptimalConfig.memorySize,
    executionTimeMs,
    memoryUsedMb,
    cost: costValue,
    message,
    costDetails,
  };
  
  performanceHistory.push(metrics);
  
  if (performanceHistory.length % 10 === 0) {
    updateOptimalConfiguration();
    savePerformanceHistory();
  }
  
  return metrics;
}

function updateOptimalConfiguration() {
  if (performanceHistory.length < 5) return;

  const recentMetrics = performanceHistory.slice(-250);

  const configGroups = new Map();

  recentMetrics.forEach((metric) => {
    const configKey = `${metric.memorySize}-${metric.concurrency}`;
    if (!configGroups.has(configKey)) {
      configGroups.set(configKey, []);
    }
    configGroups.get(configKey).push(metric);
  });

  const configPerformance = [];

  configGroups.forEach((metrics, configKey) => {
    if (metrics.length < 3) return;

    // Filter out NaN costs before calculating average
    const validCostMetrics = metrics.filter(m => typeof m.cost === 'number' && !isNaN(m.cost));
    
    if (validCostMetrics.length < 3) return;
    
    const avgCost =
      validCostMetrics.reduce((sum, m) => sum + m.cost, 0) / validCostMetrics.length;
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

  configPerformance.sort((a, b) => a.avgCost - b.avgCost);

  if (configPerformance.length > 0) {
    const optimal = configPerformance[0];

    const currentConfigPerf = configPerformance.find(
      (c) =>
        c.memorySize === currentOptimalConfig.memorySize &&
        c.concurrency === currentOptimalConfig.concurrency
    );

    if (
      !currentConfigPerf ||
      optimal.avgCost < currentConfigPerf.avgCost * 0.97
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

  if (performanceHistory.length % 200 === 0) {
    exploreNewConfiguration();
  }
}

function exploreNewConfiguration() {
  const memorySizes = [2, 16, 64, 256];
  const concurrencyLevels = [1, 5, 10, 30, 100, 1000, 10000];

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

function savePerformanceHistory() {
  const historyToSave = performanceHistory.slice(-10000);
  fs.writeFileSync(
    "performance_history.json",
    JSON.stringify(historyToSave, null, 2)
  );
  console.log(`Saved ${historyToSave.length} performance records to disk`);
}

app.use(express.static("public"));

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
