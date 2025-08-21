---
title: group_by() Function
nav_label: group_by() Function
nav_order: 31
id: group-by-function
parent: advanced-features
---

# group_by() Function

## Overview

The `group_by()` function is a powerful data aggregation tool that groups an array of objects based on a common key expression. It transforms flat arrays into organized object structures, making it easier to analyze and process related data.

```
object group_by(array[object] $elements, expression->string $expr)
```

The function takes an array of objects and groups them by the result of evaluating an expression against each element. The expression must evaluate to a string value to be used as a group key.

## Basic Usage

### Simple Grouping by Property

```jmespath-interactive Basic Grouping
{
  "employees": [
    {"name": "Alice", "department": "Engineering", "salary": 75000},
    {"name": "Bob", "department": "Marketing", "salary": 65000},
    {"name": "Charlie", "department": "Engineering", "salary": 80000},
    {"name": "Diana", "department": "Marketing", "salary": 70000},
    {"name": "Eve", "department": "Sales", "salary": 60000}
  ]
}
---JMESPATH---
group_by(employees, &department)
```

**Grouping result structure:**
- `&department` extracts the department value from each employee
- Result creates three groups:
  - `"Engineering"`: [Alice, Charlie] - 2 employees
  - `"Marketing"`: [Bob, Diana] - 2 employees
  - `"Sales"`: [Eve] - 1 employee
- Each group key is the department name, each value is an array of employee objects
- Original employee objects are preserved unchanged within their groups

### Grouping with Nested Properties

```jmespath-interactive Nested Property Grouping
{
  "orders": [
    {"id": 1, "customer": {"region": "US", "tier": "premium"}, "amount": 150},
    {"id": 2, "customer": {"region": "EU", "tier": "standard"}, "amount": 100},
    {"id": 3, "customer": {"region": "US", "tier": "standard"}, "amount": 75},
    {"id": 4, "customer": {"region": "EU", "tier": "premium"}, "amount": 200},
    {"id": 5, "customer": {"region": "US", "tier": "premium"}, "amount": 300}
  ]
}
---JMESPATH---
group_by(orders, &customer.region)
```

## Advanced Use Cases

### Grouping with Data Analysis

After grouping, you can perform aggregations and analysis on each group:

```jmespath-interactive Grouping with Analysis
{
  "sales": [
    {"product": "laptop", "category": "electronics", "revenue": 1200, "quarter": "Q1"},
    {"product": "phone", "category": "electronics", "revenue": 800, "quarter": "Q1"},
    {"product": "desk", "category": "furniture", "revenue": 300, "quarter": "Q1"},
    {"product": "laptop", "category": "electronics", "revenue": 1100, "quarter": "Q2"},
    {"product": "chair", "category": "furniture", "revenue": 150, "quarter": "Q2"}
  ]
}
---JMESPATH---
group_by(sales, &category) | keys(@)
```

To get total revenue by category:

```jmespath-interactive Revenue Analysis
{
  "sales": [
    {"product": "laptop", "category": "electronics", "revenue": 1200, "quarter": "Q1"},
    {"product": "phone", "category": "electronics", "revenue": 800, "quarter": "Q1"},
    {"product": "desk", "category": "furniture", "revenue": 300, "quarter": "Q1"},
    {"product": "laptop", "category": "electronics", "revenue": 1100, "quarter": "Q2"},
    {"product": "chair", "category": "furniture", "revenue": 150, "quarter": "Q2"}
  ]
}
---JMESPATH---
group_by(sales, &category)
  | items(@)
  | map(&{
      category: @[0],
      total_revenue: sum(@[1][*].revenue)
    }, @)
```

This expression aggregates sales data by category:
1. **Groups** sales records by their `category` field
2. **Converts** the grouped object to key-value pairs with `items(@)`
3. **Calculates** total revenue per category using `sum(@[1][*].revenue)`
4. **Creates** summary objects showing category name and total revenue

### Filtering Before Grouping

Combine filtering with grouping for more targeted analysis:

```jmespath-interactive Filtering and Grouping
{
  "transactions": [
    {"id": 1, "type": "purchase", "status": "completed", "amount": 100},
    {"id": 2, "type": "refund", "status": "completed", "amount": 50},
    {"id": 3, "type": "purchase", "status": "pending", "amount": 200},
    {"id": 4, "type": "purchase", "status": "completed", "amount": 150},
    {"id": 5, "type": "refund", "status": "failed", "amount": 25}
  ]
}
---JMESPATH---
group_by(transactions[?status=='completed'], &type)
```

## Working with Grouped Data

### Extracting Group Information

Once data is grouped, you can extract various insights:

```jmespath-interactive Group Analysis
{
  "logs": [
    {"timestamp": "2023-08-01T10:00:00Z", "level": "info", "service": "api"},
    {"timestamp": "2023-08-01T10:05:00Z", "level": "error", "service": "api"},
    {"timestamp": "2023-08-01T10:10:00Z", "level": "info", "service": "db"},
    {"timestamp": "2023-08-01T10:15:00Z", "level": "warning", "service": "api"},
    {"timestamp": "2023-08-01T10:20:00Z", "level": "error", "service": "db"}
  ]
}
---JMESPATH---
group_by(logs, &service) | keys(@)
```

Get count of logs per service:

```jmespath-interactive Log Counts
{
  "logs": [
    {"timestamp": "2023-08-01T10:00:00Z", "level": "info", "service": "api"},
    {"timestamp": "2023-08-01T10:05:00Z", "level": "error", "service": "api"},
    {"timestamp": "2023-08-01T10:10:00Z", "level": "info", "service": "db"},
    {"timestamp": "2023-08-01T10:15:00Z", "level": "warning", "service": "api"},
    {"timestamp": "2023-08-01T10:20:00Z", "level": "error", "service": "db"}
  ]
}
---JMESPATH---
group_by(logs, &service)
  | items(@)
  | map(&{
      service: @[0],
      count: length(@[1])
    }, @)
```

**What this log analysis pipeline accomplishes:**

1. **`group_by(logs, &service)`** - Groups logs by service name:
   ```
   {
     "api": [
       {"timestamp": "2023-08-01T10:00:00Z", "level": "info", "service": "api"},
       {"timestamp": "2023-08-01T10:05:00Z", "level": "error", "service": "api"},
       {"timestamp": "2023-08-01T10:15:00Z", "level": "warning", "service": "api"}
     ],
     "db": [
       {"timestamp": "2023-08-01T10:10:00Z", "level": "info", "service": "db"},
       {"timestamp": "2023-08-01T10:20:00Z", "level": "error", "service": "db"}
     ]
   }
   ```

2. **`| items(@)`** - Converts grouped object to key-value pairs:
   ```
   [
     ["api", [array of 3 api logs]],
     ["db", [array of 2 db logs]]
   ]
   ```

3. **`| map(&{service: @[0], count: length(@[1])}, @)`** - Transforms each pair into a summary object:
   - `@[0]` extracts the service name ("api" or "db")
   - `@[1]` is the array of logs for that service
   - `length(@[1])` counts the logs in each group

4. **Final result** - Service monitoring summary:
   ```
   [
     {"service": "api", "count": 3},
     {"service": "db", "count": 2}
   ]
   ```

**Real-world applications:**
- **System monitoring**: Track log volume per microservice for capacity planning
- **Error analysis**: Identify which services generate the most errors
- **Performance metrics**: Monitor service activity levels over time
- **Alerting systems**: Trigger alerts when log counts exceed thresholds

## Error Handling and Edge Cases

### Null Values Cause Errors

Objects that produce `null` when the grouping expression is evaluated will cause an error. You need to filter out such objects before grouping:

```jmespath-interactive Filtering Nulls Before Grouping
{
  "items": [
    {"name": "item1", "category": "electronics"},
    {"name": "item2", "category": "furniture"},
    {"name": "item3"},
    {"name": "item4", "category": "electronics"}
  ]
}
---JMESPATH---
group_by(items[?category], &category)
```

Here we filter out items without a `category` field using `[?category]` before grouping. Without this filter, "item3" would cause an error because it has no `category` field (evaluates to `null`).

### Type Validation

The grouping expression must evaluate to a string. Non-string values will cause an `invalid-type` error:

```jmespath-interactive Type Error Example
{
  "data": [
    {"name": "item1", "active": true},
    {"name": "item2", "active": false},
    {"name": "item3", "active": true}
  ]
}
---JMESPATH---
group_by(data, &active)
```

This will result in an `invalid-type` error because `active` is a boolean, not a string.

## Real-World Examples

### E-commerce Order Analysis

```jmespath-interactive E-commerce Analysis
{
  "orders": [
    {"id": "ord_1", "customer_id": "cust_1", "status": "shipped", "total": 150.00, "region": "north"},
    {"id": "ord_2", "customer_id": "cust_2", "status": "pending", "total": 89.99, "region": "south"},
    {"id": "ord_3", "customer_id": "cust_1", "status": "delivered", "total": 200.00, "region": "north"},
    {"id": "ord_4", "customer_id": "cust_3", "status": "shipped", "total": 75.50, "region": "east"},
    {"id": "ord_5", "customer_id": "cust_2", "status": "delivered", "total": 120.00, "region": "south"}
  ]
}
---JMESPATH---
group_by(orders[?status!='pending'], &region)
  | items(@)
  | map(&{
      region: @[0],
      order_count: length(@[1]),
      total_revenue: sum(@[1][*].total)
    }, @)
```

This expression creates a regional sales summary by:
1. **Filtering**: `orders[?status!='pending']` excludes pending orders
2. **Grouping**: `group_by(..., &region)` groups remaining orders by region
3. **Converting**: `items(@)` transforms the grouped object into key-value pairs
4. **Summarizing**: `map(...)` creates summary objects with region name, order count, and total revenue

The result shows business metrics for each region: how many completed orders and total revenue per region.

### Log Analysis by Service and Level

```jmespath-interactive Log Analysis
{
  "application_logs": [
    {"service": "auth", "level": "error", "message": "Login failed", "timestamp": "2023-08-01T10:00:00Z"},
    {"service": "auth", "level": "info", "message": "User logged in", "timestamp": "2023-08-01T10:01:00Z"},
    {"service": "payment", "level": "error", "message": "Payment declined", "timestamp": "2023-08-01T10:02:00Z"},
    {"service": "auth", "level": "warning", "message": "Suspicious activity", "timestamp": "2023-08-01T10:03:00Z"},
    {"service": "payment", "level": "info", "message": "Payment processed", "timestamp": "2023-08-01T10:04:00Z"}
  ]
}
---JMESPATH---
group_by(application_logs[?level=='error'], &service)
```

## Best Practices

1. **Filter First**: When possible, filter your data before grouping to improve performance and focus on relevant data.

2. **Handle Nulls**: Always filter out objects that might produce null grouping keys using expressions like `[?field_name]` before calling `group_by()`, as null values will cause errors.

3. **Type Safety**: Ensure your grouping expression evaluates to strings to avoid type errors.

4. **Combine with Other Functions**: Use `group_by()` with functions like `sum()`, `length()`, `max_by()`, and `sort_by()` for powerful data analysis.

5. **Use with Projections**: After grouping, use projections and transformations to extract meaningful insights from your grouped data.

The `group_by()` function is particularly powerful when combined with other JMESPath functions to create comprehensive data analysis pipelines directly within your queries.
