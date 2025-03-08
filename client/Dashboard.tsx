import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Dashboard = () => {
  const [data, setData] = useState({ 
    currentOptimalConfig: { memorySize: 0, concurrency: 0 },
    recentPerformance: [],
    totalRequestsProcessed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/metrics');
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError('Failed to fetch metrics. Is the server running?');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (loading && !data.recentPerformance.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Loading metrics...</h2>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Format time series data for charts
  const timeSeriesData = data.recentPerformance.map((item, index) => ({
    index,
    timestamp: new Date(item.timestamp).toLocaleTimeString(),
    executionTime: parseFloat(item.executionTimeMs.toFixed(2)),
    memoryUsed: parseFloat(item.memoryUsedMb.toFixed(2)),
    cost: parseFloat((item.cost * 1000000).toFixed(2)), // Convert to microseconds for better visibility
    memorySize: item.memorySize,
    concurrency: item.concurrency
  }));

  // Group by configuration to show comparison
  const configsData = {};
  data.recentPerformance.forEach(item => {
    const key = `${item.memorySize}MB-${item.concurrency}`;
    if (!configsData[key]) {
      configsData[key] = {
        name: key,
        avgTime: 0,
        avgCost: 0,
        count: 0
      };
    }
    configsData[key].avgTime += item.executionTimeMs;
    configsData[key].avgCost += item.cost;
    configsData[key].count++;
  });

  // Calculate averages
  const configComparison = Object.values(configsData).map(config => ({
    name: config.name,
    avgTime: parseFloat((config.avgTime / config.count).toFixed(2)),
    avgCost: parseFloat(((config.avgCost / config.count) * 1000000).toFixed(2)), // Convert to microseconds
    count: config.count
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Serverless Performance Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Current Optimal Config</h2>
          <div className="text-4xl font-bold text-blue-600">
            {data.currentOptimalConfig.memorySize}MB
          </div>
          <div className="text-gray-500">Memory Size</div>
          <div className="text-4xl font-bold text-green-600 mt-4">
            {data.currentOptimalConfig.concurrency}
          </div>
          <div className="text-gray-500">Concurrency</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Total Requests</h2>
          <div className="text-4xl font-bold text-purple-600">
            {data.totalRequestsProcessed}
          </div>
          <div className="text-gray-500">Processed Requests</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Recent Performance</h2>
          <div className="text-4xl font-bold text-amber-600">
            {timeSeriesData.length > 0 
              ? `${timeSeriesData[timeSeriesData.length - 1].executionTime}ms` 
              : 'N/A'}
          </div>
          <div className="text-gray-500">Latest Execution Time</div>
          <div className="text-xl font-bold text-red-600 mt-4">
            {timeSeriesData.length > 0 
              ? `$${(timeSeriesData[timeSeriesData.length - 1].cost / 1000000).toFixed(8)}` 
              : 'N/A'}
          </div>
          <div className="text-gray-500">Latest Cost</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Execution Time Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="executionTime" stroke="#8884d8" name="Execution Time (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Cost Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${(value / 1000000).toFixed(8)}`, 'Cost']} />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke="#82ca9d" name="Cost (millionths of $)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Memory Usage Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="memoryUsed" stroke="#ff7300" name="Memory Used (MB)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Configuration Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={configComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="avgTime" fill="#8884d8" name="Avg Time (ms)" />
              <Bar yAxisId="right" dataKey="avgCost" fill="#82ca9d" name="Avg Cost (millionths of $)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;