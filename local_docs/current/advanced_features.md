---
title: Advanced Features
nav_order: 4
id: advanced-features
---

# Advanced Features

Unlock JMESPath's most powerful capabilities for complex data transformations, aggregations, and sophisticated processing workflows. These advanced features enable enterprise-level data manipulation and solve challenging real-world scenarios.

## Advanced Function Categories

### Transformation Functions
High-level functions that reshape and reorganize data structures:

- **map() Function**: Apply expressions to every array element with null preservation
- **group_by() Function**: Aggregate and organize data by common keys for analysis
- **Projection Control**: Understand when and how to use functions vs. projections

### Function Composition
Combine multiple functions and operations for sophisticated data processing:

- **Pipeline Patterns**: Chain functions together for multi-step transformations
- **Nested Operations**: Compose functions within projections and filters
- **Performance Optimization**: Structure compositions for maximum efficiency

## Key Capabilities

### Data Aggregation & Analysis
Transform flat data into meaningful insights:

**group_by()** excels at:
- Organizing records by categories, departments, or time periods
- Creating summary reports and analytics dashboards
- Preparing data for visualization and business intelligence

**map()** provides:
- Consistent array transformations with predictable output length
- Null-safe processing that preserves array structure
- Complex field calculations and data enrichment

### Complex Transformations
Handle sophisticated data reshaping requirements:

**Function Composition** enables:
- Multi-step data pipelines that combine filtering, transformation, and aggregation
- Nested data processing with parent context preservation
- Reusable patterns for common transformation workflows

## When to Use Advanced Features

**Use map()** when you need:
- To transform every element in an array, including handling missing data
- Predictable output array length that matches input length
- Complex calculations that might produce null values

**Use group_by()** when you need:
- To organize data by categories for reporting or analysis
- To aggregate metrics by common attributes
- To transform flat data into hierarchical structures

**Use Function Composition** when you need:
- Multi-step data processing pipelines
- To combine filtering, transformation, and aggregation in a single query
- Complex business logic that requires multiple operations

## Real-World Applications

### Business Intelligence
```jmespath
// Group sales by region and calculate performance metrics
group_by(sales, &region) | items(@) | map(&{
  region: @[0],
  total_revenue: sum(@[1][*].amount),
  order_count: length(@[1]),
  avg_order_value: avg(@[1][*].amount)
}, @)
```

### Data Pipeline Processing
```jmespath
// Transform and enrich user data with calculated fields
users[?active] | map(&{
  id: id,
  full_name: join(' ', [first_name, last_name]),
  email_domain: split(email, '@')[1],
  account_age_days: (now() - created_date) / 86400
}, @)
```

### Log Analysis
```jmespath
// Analyze error patterns by service and severity
group_by(logs[?level == 'ERROR'], &service) | items(@) | map(&{
  service: @[0],
  error_count: length(@[1]),
  unique_messages: length(unique(@[1][*].message)),
  first_error: min(@[1][*].timestamp),
  last_error: max(@[1][*].timestamp)
}, @)
```

These advanced features represent the pinnacle of JMESPath's data processing capabilities. Master these tools to handle enterprise-scale data transformations and build sophisticated data processing workflows.
