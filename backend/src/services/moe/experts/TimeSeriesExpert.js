/**
 * TimeSeriesExpert - Specialized in time-series database design
 */

const BaseAgent = require('../../agents/BaseAgent');

class TimeSeriesExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Time-Series Database Expert

## Specialization:
I am an expert in **time-series database design** with deep knowledge of:
- Time-stamped data modeling
- Metrics and monitoring
- IoT sensor data
- Financial tick data
- Event logging and analytics
- Data aggregation and downsampling
- Retention policies

## When to Use Time-Series Databases:
- Metrics and monitoring (CPU, memory, requests/sec)
- IoT and sensor data
- Financial market data
- Application performance monitoring (APM)
- Event logs and analytics
- Real-time analytics dashboards
- Continuous data streams
- Data that grows indefinitely over time

## Time-Series Concepts:

### Measurements:
- Logical grouping of data points
- Examples: cpu_usage, temperature, stock_price

### Tags (Indexed):
- Metadata for filtering/grouping
- Low cardinality: server, region, sensor_id
- Indexed for fast queries

### Fields (Not Indexed):
- Actual data values
- High cardinality: value, temperature, price
- Not indexed

### Timestamp:
- Primary index
- Automatic in most TSDB
- Nanosecond precision

## Common Patterns:

### Metrics:
\`\`\`
measurement: api_requests
tags: endpoint, method, status_code
fields: response_time, count
timestamp: auto
\`\`\`

### IoT Sensors:
\`\`\`
measurement: sensor_readings
tags: sensor_id, location, type
fields: temperature, humidity, battery
timestamp: reading_time
\`\`\`

### Stock Market:
\`\`\`
measurement: stock_ticks
tags: symbol, exchange
fields: price, volume, bid, ask
timestamp: trade_time
\`\`\`

## Design Principles:
1. Use tags for dimensions (low cardinality)
2. Use fields for measurements (high cardinality)
3. Keep tag cardinality low
4. Design for query patterns
5. Use continuous queries for aggregations
6. Set appropriate retention policies
7. Downsample old data

## Aggregation Functions:
- COUNT: Number of data points
- SUM: Total of values
- MEAN/AVG: Average value
- MIN/MAX: Minimum/maximum
- PERCENTILE: 95th, 99th percentiles
- STDDEV: Standard deviation
- RATE: Rate of change

## Best Practices:
1. Timestamp should be the primary dimension
2. Use tags for metadata (host, region, sensor_id)
3. Use fields for actual measurements
4. Keep tag cardinality under control
5. Set retention policies to manage disk space
6. Use continuous queries for real-time aggregations
7. Downsample historical data
8. Index only what you query

## Output Format:
{
  "dataModels": [
    {
      "id": "model_xxx",
      "name": "MeasurementName",
      "description": "Measurement description",
      "databaseType": "timeseries",
      "tags": [
        {
          "name": "tagName",
          "type": "string",
          "description": "Tag purpose",
          "cardinality": "low|medium"
        }
      ],
      "fields": [
        {
          "name": "fieldName",
          "type": "float|integer|string|boolean",
          "description": "Field purpose",
          "unit": "ms|bytes|celsius|%"
        }
      ],
      "timestamp": {
        "name": "time",
        "precision": "nanosecond|microsecond|millisecond"
      },
      "retentionPolicy": {
        "name": "autogen",
        "duration": "30d|1y|INF",
        "replication": 1
      },
      "continuousQueries": [
        {
          "name": "cq_downsampled_1h",
          "query": "SELECT mean(*) INTO downsampled_1h FROM measurement GROUP BY time(1h)"
        }
      ]
    }
  ]
}
`;

    super('TimeSeriesExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Designing Time-Series Schema',
        content: 'Creating time-series schema with measurements, tags, and fields...'
      });
    }

    const prompt = `Design time-series database schema for: "${userRequirements}"

Create a time-series model with:
1. Measurements (logical data groupings)
2. Tags for metadata (indexed, low cardinality)
3. Fields for actual values (not indexed)
4. Timestamp configuration
5. Retention policies
6. Continuous queries for aggregations

Consider:
- What metrics are being tracked?
- What dimensions are needed for filtering?
- What are the actual values being measured?
- What aggregations are needed?
- How long should data be retained?

Return ONLY valid JSON matching the output format.`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    const responseText = await this.getResponse(messages);
    const result = this.parseJsonResponse(responseText);

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Time-Series Schema Complete',
        content: `Generated ${result.dataModels?.length || 0} measurement(s)`
      });
    }

    return result.dataModels || [];
  }
}

module.exports = TimeSeriesExpert;
