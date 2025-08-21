---
title: Mathematical & Statistical Functions
nav_label: Mathematical Functions
nav_order: 24
id: mathematical-functions
parent: data-operations
---

# Mathematical & Statistical Functions

## Overview

JMESPath provides a comprehensive set of mathematical and statistical functions that enable sophisticated data analysis and numerical processing directly within your queries. These functions complement arithmetic operators by providing advanced mathematical operations, statistical calculations, and data aggregation capabilities.

Mathematical functions in JMESPath can be categorized into several groups:
- **Core Math Functions**: `abs()`, `ceil()`, `floor()`
- **Statistical Functions**: `sum()`, `avg()`, `max()`, `min()`
- **Comparison Functions**: `max_by()`, `min_by()`
- **Array Operations**: `sort()`, `sort_by()`, `reverse()`

## Core Mathematical Functions

### abs()

Returns the absolute value of a number, removing any negative sign.

```
number abs(number $value)
```

```jmespath-interactive Absolute Values
{
  "financial_data": {
    "profit_loss": [-1500, 2300, -800, 4200, -300],
    "temperature_readings": [-15.5, 22.3, -8.7, 35.1, -2.9],
    "account_balances": [150.75, -45.20, 0, -12.50, 89.30]
  }
}
---JMESPATH---
{
  "absolute_losses": financial_data.profit_loss[*].abs(@),
  "temperature_magnitudes": financial_data.temperature_readings[*].abs(@),
  "balance_amounts": financial_data.account_balances[*].abs(@),
  "total_absolute_pl": sum(financial_data.profit_loss[*].abs(@)),
  "max_temperature_swing": max(financial_data.temperature_readings[*].abs(@))
}
```

### ceil() and floor()

Round numbers up or down to the nearest integer.

```
number ceil(number $value)   // Round up
number floor(number $value)  // Round down
```

```jmespath-interactive Rounding Operations
{
  "pricing_data": {
    "raw_prices": [19.99, 25.01, 12.50, 8.75, 33.33],
    "tax_calculations": [2.15, 4.67, 1.89, 3.44, 5.92],
    "usage_metrics": [45.7, 78.2, 23.9, 91.1, 67.4]
  }
}
---JMESPATH---
{
  "rounded_up_prices": pricing_data.raw_prices[*].ceil(@),
  "rounded_down_prices": pricing_data.raw_prices[*].floor(@),
  "tax_ceiling": pricing_data.tax_calculations[*].ceil(@),
  "usage_floor": pricing_data.usage_metrics[*].floor(@),
  "price_ranges": {
    "min_ceiling": min(pricing_data.raw_prices[*].ceil(@)),
    "max_floor": max(pricing_data.raw_prices[*].floor(@))
  }
}
```

## Statistical Functions

### sum() and avg()

Calculate totals and averages for numerical arrays.

```
number sum(array[number] $numbers)
number avg(array[number] $numbers)
```

```jmespath-interactive Statistical Calculations
{
  "sales_data": [
    {"region": "North", "q1": 15000, "q2": 18000, "q3": 22000, "q4": 25000},
    {"region": "South", "q1": 12000, "q2": 14000, "q3": 16000, "q4": 19000},
    {"region": "East", "q1": 20000, "q2": 23000, "q3": 26000, "q4": 28000},
    {"region": "West", "q1": 18000, "q2": 21000, "q3": 24000, "q4": 27000}
  ]
}
---JMESPATH---
{
  "quarterly_totals": {
    "q1_total": sum(sales_data[*].q1),
    "q2_total": sum(sales_data[*].q2),
    "q3_total": sum(sales_data[*].q3),
    "q4_total": sum(sales_data[*].q4)
  },
  "regional_analysis": sales_data[*].{
    "region": region,
    "annual_total": sum([q1, q2, q3, q4]),
    "quarterly_average": avg([q1, q2, q3, q4]),
    "growth_rate": (q4 - q1) / q1 * `100`
  },
  "company_metrics": {
    "total_revenue": sum(sales_data[*].sum([q1, q2, q3, q4])),
    "average_regional_performance": avg(sales_data[*].sum([q1, q2, q3, q4]))
  }
}
```

### max() and min()

Find maximum and minimum values in arrays.

```
number max(array[number] $numbers)
number min(array[number] $numbers)
string max(array[string] $strings)
string min(array[string] $strings)
```

```jmespath-interactive Min Max Operations
{
  "performance_data": {
    "response_times": [45, 23, 67, 12, 89, 34, 56],
    "error_rates": [0.02, 0.15, 0.08, 0.03, 0.21, 0.07],
    "server_names": ["alpha", "beta", "gamma", "delta", "epsilon"],
    "timestamps": ["2023-08-15T10:00:00Z", "2023-08-15T11:30:00Z", "2023-08-15T14:15:00Z"]
  }
}
---JMESPATH---
{
  "performance_summary": {
    "fastest_response": min(performance_data.response_times),
    "slowest_response": max(performance_data.response_times),
    "best_error_rate": min(performance_data.error_rates),
    "worst_error_rate": max(performance_data.error_rates),
    "response_range": max(performance_data.response_times) - min(performance_data.response_times)
  },
  "string_comparisons": {
    "first_server_alphabetically": min(performance_data.server_names),
    "last_server_alphabetically": max(performance_data.server_names),
    "earliest_timestamp": min(performance_data.timestamps),
    "latest_timestamp": max(performance_data.timestamps)
  }
}
```

## Comparison Functions

### max_by() and min_by()

Find array elements with maximum or minimum values based on an expression.

```
any max_by(array $elements, expression $expr)
any min_by(array $elements, expression $expr)
```

```jmespath-interactive Comparison by Expression
{
  "employees": [
    {"name": "Alice", "salary": 75000, "experience": 5, "department": "Engineering"},
    {"name": "Bob", "salary": 82000, "experience": 8, "department": "Marketing"},
    {"name": "Charlie", "salary": 68000, "experience": 3, "department": "Engineering"},
    {"name": "Diana", "salary": 95000, "experience": 12, "department": "Sales"},
    {"name": "Eve", "salary": 71000, "experience": 6, "department": "Marketing"}
  ]
}
---JMESPATH---
{
  "salary_analysis": {
    "highest_paid": max_by(employees, &salary),
    "lowest_paid": min_by(employees, &salary),
    "most_experienced": max_by(employees, &experience),
    "newest_employee": min_by(employees, &experience)
  },
  "department_leaders": {
    "engineering_top_salary": max_by(employees[?department == 'Engineering'], &salary),
    "marketing_most_experienced": max_by(employees[?department == 'Marketing'], &experience)
  },
  "name_comparisons": {
    "alphabetically_first": min_by(employees, &name),
    "alphabetically_last": max_by(employees, &name)
  }
}
```

## Array Sorting Functions

### sort() and sort_by()

Sort arrays by values or by expression results.

```
array sort(array $elements)
array sort_by(array $elements, expression $expr)
```

```jmespath-interactive Array Sorting
{
  "product_data": [
    {"name": "Laptop", "price": 999, "rating": 4.5, "category": "Electronics"},
    {"name": "Book", "price": 25, "rating": 4.8, "category": "Education"},
    {"name": "Headphones", "price": 199, "rating": 4.2, "category": "Electronics"},
    {"name": "Desk", "price": 299, "rating": 4.0, "category": "Furniture"},
    {"name": "Monitor", "price": 449, "rating": 4.6, "category": "Electronics"}
  ],
  "scores": [85, 92, 78, 96, 88, 73, 91]
}
---JMESPATH---
{
  "simple_sorting": {
    "scores_ascending": sort(scores),
    "scores_descending": reverse(sort(scores))
  },
  "product_sorting": {
    "by_price_asc": sort_by(product_data, &price),
    "by_rating_desc": reverse(sort_by(product_data, &rating)),
    "by_name": sort_by(product_data, &name),
    "electronics_by_price": sort_by(product_data[?category == 'Electronics'], &price)
  },
  "top_performers": {
    "highest_rated_product": max_by(product_data, &rating),
    "best_value": min_by(product_data[?rating > `4.0`], &price),
    "premium_electronics": sort_by(product_data[?category == 'Electronics' && price > `400`], &rating)
  }
}
```

### reverse()

Reverse the order of elements in an array.

```
array reverse(array $elements)
```

```jmespath-interactive Array Reversal
{
  "time_series": [
    {"date": "2023-01-01", "value": 100},
    {"date": "2023-02-01", "value": 120},
    {"date": "2023-03-01", "value": 110},
    {"date": "2023-04-01", "value": 140},
    {"date": "2023-05-01", "value": 135}
  ],
  "priority_list": ["critical", "high", "medium", "low"]
}
---JMESPATH---
{
  "chronological_analysis": {
    "oldest_to_newest": time_series,
    "newest_to_oldest": reverse(time_series),
    "recent_trend": reverse(time_series)[:3]
  },
  "priority_handling": {
    "normal_priority": priority_list,
    "reverse_priority": reverse(priority_list),
    "top_priorities": reverse(priority_list)[:2]
  },
  "value_analysis": {
    "ascending_values": sort_by(time_series, &value),
    "descending_values": reverse(sort_by(time_series, &value)),
    "highest_value_month": max_by(time_series, &value)
  }
}
```

## Real-World Applications

### Financial Analysis

```jmespath-interactive Financial Calculations
{
  "portfolio": [
    {"symbol": "AAPL", "shares": 100, "price": 150.25, "cost_basis": 145.00, "value": 15025},
    {"symbol": "GOOGL", "shares": 50, "price": 2750.80, "cost_basis": 2650.00, "value": 137540},
    {"symbol": "MSFT", "shares": 75, "price": 305.15, "cost_basis": 290.50, "value": 22886},
    {"symbol": "TSLA", "shares": 25, "price": 245.30, "cost_basis": 280.75, "value": 6132}
  ]
}
---JMESPATH---
{
  "portfolio_analysis": {
    "total_value": sum(portfolio[*].value),
    "total_shares": sum(portfolio[*].shares),
    "average_price": avg(portfolio[*].price),
    "highest_price": max(portfolio[*].price),
    "lowest_price": min(portfolio[*].price),
    "largest_position": max_by(portfolio, &value),
    "most_expensive_stock": max_by(portfolio, &price),
    "cheapest_stock": min_by(portfolio, &price)
  },
  "risk_metrics": {
    "position_values": sort(portfolio[*].value),
    "max_position_value": max(portfolio[*].value),
    "min_position_value": min(portfolio[*].value),
    "winners": length(portfolio[?price > cost_basis]),
    "losers": length(portfolio[?price < cost_basis])
  }
}
```

### Performance Monitoring

```jmespath-interactive System Performance
{
  "server_metrics": [
    {"server": "web-01", "cpu": 45.2, "memory": 78.5, "disk": 23.1, "uptime": 720},
    {"server": "web-02", "cpu": 67.8, "memory": 82.3, "disk": 45.7, "uptime": 680},
    {"server": "db-01", "cpu": 89.1, "memory": 91.2, "disk": 67.4, "uptime": 1440},
    {"server": "cache-01", "cpu": 23.4, "memory": 45.6, "disk": 12.8, "uptime": 360}
  ]
}
---JMESPATH---
{
  "performance_summary": {
    "avg_cpu": avg(server_metrics[*].cpu),
    "max_cpu": max(server_metrics[*].cpu),
    "avg_memory": avg(server_metrics[*].memory),
    "max_memory": max(server_metrics[*].memory),
    "total_uptime": sum(server_metrics[*].uptime)
  },
  "alerts": {
    "high_cpu_servers": server_metrics[?cpu > `80`],
    "high_memory_servers": server_metrics[?memory > `85`],
    "most_loaded_server": max_by(server_metrics, &cpu),
    "least_loaded_server": min_by(server_metrics, &cpu)
  },
  "capacity_planning": {
    "servers_by_load": sort_by(server_metrics, &cpu),
    "memory_utilization": sort_by(server_metrics, &memory),
    "resource_efficiency": server_metrics[*].{
      "server": server,
      "efficiency_score": ceil((`100` - cpu) * (`100` - memory) / `100`)
    }
  }
}
```

## Best Practices

1. **Choose the Right Function**: Use `max_by()`/`min_by()` when you need the entire element, `max()`/`min()` when you only need the value.

2. **Handle Edge Cases**: Mathematical functions return `null` for empty arrays or invalid types.

3. **Combine with Filters**: Apply filters before mathematical operations for better performance and accuracy.

4. **Use with Projections**: Mathematical functions work well with array projections for element-wise operations.

5. **Consider Precision**: Be aware of floating-point precision when working with decimal numbers.

## Function Reference Summary

| Function | Purpose | Returns |
|----------|---------|---------|
| `abs(number)` | Absolute value | Positive number |
| `ceil(number)` | Round up | Integer |
| `floor(number)` | Round down | Integer |
| `sum(array[number])` | Sum all numbers | Number |
| `avg(array[number])` | Average of numbers | Number |
| `max(array)` | Maximum value | Same type as input |
| `min(array)` | Minimum value | Same type as input |
| `max_by(array, expr)` | Element with max value | Original element |
| `min_by(array, expr)` | Element with min value | Original element |
| `sort(array)` | Sort array | Sorted array |
| `sort_by(array, expr)` | Sort by expression | Sorted array |
| `reverse(array)` | Reverse order | Reversed array |

These mathematical functions provide the foundation for sophisticated data analysis and statistical processing within JMESPath queries, enabling complex calculations without external processing.
