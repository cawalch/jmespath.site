---
title: Arithmetic Expressions
nav_label: Arithmetic Expressions
nav_order: 6
---

# Arithmetic Expressions

## Overview

JMESPath supports arithmetic operations that allow you to perform mathematical calculations directly within your queries. This feature enables data transformation, aggregation, and computed field generation without requiring external processing.

The supported arithmetic operators are:

- `+` addition
- `-` subtraction  
- `*` multiplication
- `/` division
- `%` modulo (remainder)
- `//` integer division

## Basic Arithmetic Operations

### Simple Calculations

```jmespath-interactive Basic Addition
{
  "price": 100,
  "tax_rate": 0.08,
  "quantity": 3
}
---JMESPATH---
price + (price * tax_rate)
```

**Step-by-step calculation:**
1. `price * tax_rate` calculates the tax amount: 100 * 0.08 = 8
2. `price + (...)` adds the tax to the original price: 100 + 8 = 108
3. The parentheses ensure tax is calculated first, following mathematical order of operations
4. Result: 108 (the total price including tax)

### Working with Arrays

```jmespath-interactive Array Calculations
{
  "sales": [
    {"month": "Jan", "revenue": 15000, "expenses": 8000},
    {"month": "Feb", "revenue": 18000, "expenses": 9500},
    {"month": "Mar", "revenue": 22000, "expenses": 11000}
  ]
}
---JMESPATH---
sales[*].{
  month: month,
  revenue: revenue,
  expenses: expenses,
  profit: revenue - expenses,
  profit_margin: (revenue - expenses) / revenue
}
```

**Array arithmetic breakdown:**
- `sales[*]` applies the projection to each month's data
- `profit: revenue - expenses` calculates: Jan: 7000, Feb: 8500, Mar: 11000
- `profit_margin: (revenue - expenses) / revenue` computes the percentage:
  - Jan: 7000 / 15000 = 0.4667 (46.67%)
  - Feb: 8500 / 18000 = 0.4722 (47.22%)
  - Mar: 11000 / 22000 = 0.5 (50%)
- Each object gets its own calculated fields while preserving the original data

## Operator Precedence

Arithmetic operators follow standard mathematical precedence rules:

1. **Unary operators**: `+` (unary plus), `-` (unary minus) - highest precedence
2. **Multiplicative**: `*`, `/`, `%`, `//` - medium precedence  
3. **Additive**: `+`, `-` - lowest precedence

Operations of the same precedence are evaluated left-to-right.

```jmespath-interactive Operator Precedence
{
  "a": 10,
  "b": 3,
  "c": 2
}
---JMESPATH---
{
  "basic": a + b * c,
  "with_parentheses": (a + b) * c,
  "division_and_modulo": a / b + a % b,
  "integer_division": a // b
}
```

## Division Operations

### Regular Division vs Integer Division

```jmespath-interactive Division Types
{
  "total_items": 17,
  "items_per_page": 5
}
---JMESPATH---
{
  "exact_pages": total_items / items_per_page,
  "full_pages": total_items // items_per_page,
  "remaining_items": total_items % items_per_page
}
```

This shows the difference between regular division (returns decimal) and integer division (returns whole number).

## Real-World Examples

### E-commerce Order Processing

```jmespath-interactive Order Calculations
{
  "order": {
    "subtotal": 850,
    "shipping": 15,
    "tax_rate": 0.08,
    "discount_amount": 50
  }
}
---JMESPATH---
{
  "subtotal": order.subtotal,
  "discount": order.discount_amount,
  "discounted_subtotal": order.subtotal - order.discount_amount,
  "shipping": order.shipping,
  "tax": (order.subtotal - order.discount_amount) * order.tax_rate,
  "total": (order.subtotal - order.discount_amount) + order.shipping + ((order.subtotal - order.discount_amount) * order.tax_rate),
  "savings_percent": order.discount_amount / order.subtotal * `100`
}
```

### Financial Metrics Calculation

```jmespath-interactive Financial Metrics
{
  "company_data": [
    {"year": 2021, "revenue": 1000000, "expenses": 750000, "shares": 100000},
    {"year": 2022, "revenue": 1200000, "expenses": 850000, "shares": 110000},
    {"year": 2023, "revenue": 1450000, "expenses": 980000, "shares": 120000}
  ]
}
---JMESPATH---
company_data[*].{
  year: year,
  revenue: revenue,
  expenses: expenses,
  net_income: revenue - expenses,
  earnings_per_share: (revenue - expenses) / shares,
  profit_margin_percent: ((revenue - expenses) / revenue) * `100`,
  revenue_growth: year > `2021` && (revenue / `1000000` - `1`) * `100` || null
}
```

### Pagination Calculations

```jmespath-interactive Pagination
{
  "dataset": {
    "total_records": 1247,
    "page_size": 25,
    "current_page": 3
  }
}
---JMESPATH---
{
  "total_records": dataset.total_records,
  "page_size": dataset.page_size,
  "current_page": dataset.current_page,
  "total_pages": (dataset.total_records + dataset.page_size - `1`) // dataset.page_size,
  "records_on_current_page": dataset.page_size,
  "start_record": (dataset.current_page - `1`) * dataset.page_size + `1`,
  "end_record": dataset.current_page * dataset.page_size,
  "has_next_page": dataset.current_page * dataset.page_size < dataset.total_records,
  "has_previous_page": dataset.current_page > `1`
}
```

## Working with Negative Numbers

```jmespath-interactive Negative Numbers
{
  "temperature_readings": [
    {"location": "Arctic", "celsius": -25},
    {"location": "Desert", "celsius": 45},
    {"location": "Mountain", "celsius": -5}
  ]
}
---JMESPATH---
temperature_readings[*].{
  location: location,
  celsius: celsius,
  fahrenheit: celsius * `9` / `5` + `32`,
  kelvin: celsius + `273.15`,
  is_freezing: celsius < `0`
}
```

## Error Handling

Arithmetic operations can produce errors in certain conditions:

- **Division by zero**: Results in an error
- **Type mismatches**: Attempting arithmetic on non-numeric values
- **Null values**: Arithmetic with `null` typically results in `null`

```jmespath-interactive Error Scenarios
{
  "data": {
    "valid_number": 10,
    "zero": 0,
    "null_value": null,
    "string_value": "not_a_number"
  }
}
---JMESPATH---
{
  "valid_number": data.valid_number,
  "zero_value": data.zero,
  "null_value": data.null_value,
  "string_value": data.string_value
}
```

## Best Practices

1. **Use parentheses** for clarity when combining multiple operations
2. **Check for zero** before division operations
3. **Handle null values** appropriately in calculations
4. **Consider precision** when working with floating-point numbers
5. **Use integer division** when you need whole number results

## Combining with Functions

Arithmetic expressions work seamlessly with JMESPath functions:

```jmespath-interactive Functions with Arithmetic
{
  "sales": [100, 150, 200, 175, 225],
  "costs": [60, 90, 120, 105, 135]
}
---JMESPATH---
{
  "total_sales": sum(sales),
  "total_costs": sum(costs),
  "total_profit": sum(sales) - sum(costs),
  "average_sale": sum(sales) / length(sales),
  "profit_margin": (sum(sales) - sum(costs)) / sum(sales) * `100`,
  "high_sales_count": length(sales[? @ > `150`]),
  "sales_range": max(sales) - min(sales)
}
```

This demonstrates using arithmetic within function calls and filter expressions for business calculations.
