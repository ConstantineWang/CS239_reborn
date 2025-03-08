// types.ts - Type definitions for the system

// Configuration options for serverless functions
export interface ConfigOption {
    memorySize: number;  // Memory in MB
    concurrency: number; // Max concurrent executions
  }
  
  // Performance metrics for each execution
  export interface PerformanceMetrics {
    timestamp: string;     // When the execution occurred
    memorySize: number;    // Configured memory in MB
    concurrency: number;   // Configured concurrency
    executionTimeMs: number; // Time taken to execute in ms
    memoryUsedMb: number;  // Actual memory used in MB
    cost: number;          // Estimated cost in dollars
    message?: string;      // Optional result message
  }
  
  // System configuration
  export interface SystemConfig {
    port: number;
    optimizationInterval: number; // How often to update optimal config (in requests)
    explorationInterval: number;  // How often to try new configs (in requests)
    historyLength: number;        // How many records to keep
  }