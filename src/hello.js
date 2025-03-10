function hello(name) {
  const startTime = Date.now();

  let counter = 0;
  for (let i = 0; i < 1_000_000; i++) {
    counter += i;
  }

  const message = `Hello, ${name}! (Processed in ${Date.now() - startTime}ms)`;

  return message;
}

function processData(data) {
  const startTime = Date.now();

  const result = {
    processed: true,
    originalData: data,
    processingTime: 0,
  };

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
