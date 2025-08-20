---
title: map
nav_label: map
nav_order: 5
---

# map() Function

## Overview

The `map()` function is a powerful transformation tool that applies an expression to every element in an array and returns a new array containing the results. Unlike projections, `map()` preserves the original array length by including `null` values when expressions don't match elements.

```
array[any] map(expression->any->any $expr, array[any] $elements)
```

The function takes an expression and an array, applying the expression to each element in the array. The result is always an array of the same length as the input array, making it ideal for consistent data transformations.

## Basic Usage

### Simple Property Extraction

```jmespath-interactive Basic Property Mapping
{
  "users": [
    {"name": "Alice", "age": 30, "email": "alice@example.com"},
    {"name": "Bob", "age": 25, "email": "bob@example.com"},
    {"name": "Charlie", "age": 35},
    {"name": "Diana", "age": 28, "email": "diana@example.com"}
  ]
}
---JMESPATH---
map(&name, users)
```

This extracts the `name` property from each user object, creating an array of names in the same order as the original array.

### Handling Missing Properties

```jmespath-interactive Missing Properties
{
  "products": [
    {"id": 1, "name": "Laptop", "price": 999},
    {"id": 2, "name": "Mouse"},
    {"id": 3, "name": "Keyboard", "price": 79},
    {"id": 4, "name": "Monitor", "price": 299}
  ]
}
---JMESPATH---
map(&price, products)
```

Notice how `map()` includes `null` for the mouse that has no price, maintaining the array length and element positions.

## Advanced Use Cases

### Complex Object Transformations

```jmespath-interactive Object Transformation
{
  "employees": [
    {"firstName": "John", "lastName": "Doe", "salary": 75000, "department": "Engineering"},
    {"firstName": "Jane", "lastName": "Smith", "salary": 82000, "department": "Marketing"},
    {"firstName": "Bob", "lastName": "Johnson", "salary": 68000, "department": "Engineering"}
  ]
}
---JMESPATH---
map(&{
  fullName: join(' ', [firstName, lastName]),
  annualSalary: salary,
  dept: department
}, employees)
```

This creates new objects for each employee with transformed and renamed fields.

### Mathematical Operations

```jmespath-interactive Mathematical Transformations
{
  "measurements": [
    {"celsius": 0, "humidity": 45},
    {"celsius": 25, "humidity": 60},
    {"celsius": 100, "humidity": 80},
    {"celsius": -10, "humidity": 30}
  ]
}
---JMESPATH---
map(&{
  celsius: celsius,
  fahrenheit: celsius * `1.8` + `32`,
  humidity: humidity
}, measurements)
```

This converts temperature measurements from Celsius to Fahrenheit using arithmetic operators while preserving other data.

### Array Flattening

```jmespath-interactive Array Flattening
{
  "nested_arrays": [
    [1, 2, 3],
    [4, 5, 6, 7],
    [8, 9],
    [10, 11, 12, 13, 14]
  ]
}
---JMESPATH---
map(&[], nested_arrays)
```

The `[]` (flatten) operator can be used with `map()` to flatten each sub-array individually.

## Working with Nested Data

### Extracting from Nested Objects

```jmespath-interactive Nested Data Extraction
{
  "orders": [
    {
      "id": "ord_1",
      "customer": {"name": "Alice", "tier": "premium"},
      "items": [{"name": "laptop", "price": 999}],
      "shipping": {"address": {"city": "Seattle", "state": "WA"}}
    },
    {
      "id": "ord_2", 
      "customer": {"name": "Bob", "tier": "standard"},
      "items": [{"name": "mouse", "price": 25}, {"name": "keyboard", "price": 75}],
      "shipping": {"address": {"city": "Portland", "state": "OR"}}
    }
  ]
}
---JMESPATH---
map(&{
  orderId: id,
  customerName: customer.name,
  itemCount: length(items),
  totalValue: sum(items[*].price),
  shippingCity: shipping.address.city
}, orders)
```

This demonstrates extracting and computing values from deeply nested structures.

### Processing Arrays Within Objects

```jmespath-interactive Processing Nested Arrays
{
  "teams": [
    {
      "name": "Frontend",
      "members": [
        {"name": "Alice", "skills": ["React", "TypeScript"]},
        {"name": "Bob", "skills": ["Vue", "JavaScript"]}
      ]
    },
    {
      "name": "Backend", 
      "members": [
        {"name": "Charlie", "skills": ["Python", "Django"]},
        {"name": "Diana", "skills": ["Node.js", "Express"]}
      ]
    }
  ]
}
---JMESPATH---
map(&{
  teamName: name,
  memberCount: length(members),
  allSkills: members[*].skills[] | sort(@)
}, teams)
```

This extracts team information and flattens all skills across team members.

## Comparison with Projections

### map() vs Projection Behavior

```jmespath-interactive Comparison with Projections
{
  "data": [
    {"value": 10, "active": true},
    {"value": 20, "active": false},
    {"missing": "data"},
    {"value": 30, "active": true}
  ]
}
---JMESPATH---
map(&value, data)
```

Compare this with a projection:

```jmespath-interactive Projection Comparison
{
  "data": [
    {"value": 10, "active": true},
    {"value": 20, "active": false},
    {"missing": "data"},
    {"value": 30, "active": true}
  ]
}
---JMESPATH---
data[*].value
```

The key difference: `map()` preserves array length with `null` values, while projections filter out missing values.

## Error Handling and Edge Cases

### Empty Arrays

```jmespath-interactive Empty Array Handling
{
  "empty": [],
  "data": [1, 2, 3]
}
---JMESPATH---
map(&to_string(@), empty)
```

`map()` applied to an empty array returns an empty array.

### Type Validation

```jmespath-interactive Type Validation
{
  "not_an_array": "string",
  "numbers": [1, 2, 3]
}
---JMESPATH---
map(&to_string(@), not_an_array)
```

Applying `map()` to non-array types results in an `invalid-type` error.

## Real-World Examples

### Data Normalization

```jmespath-interactive Data Normalization
{
  "api_response": [
    {"user_id": 1, "user_name": "alice", "user_email": "ALICE@EXAMPLE.COM", "created_at": "2023-01-15"},
    {"user_id": 2, "user_name": "BOB", "user_email": "bob@example.com", "created_at": "2023-02-20"},
    {"user_id": 3, "user_name": "charlie", "user_email": "Charlie@Example.Com", "created_at": "2023-03-10"}
  ]
}
---JMESPATH---
map(&{
  id: user_id,
  name: to_string(user_name),
  email: to_string(user_email),
  createdDate: created_at
}, api_response)
```

This normalizes inconsistent API data into a clean, consistent format.

### Report Generation

```jmespath-interactive Report Generation
{
  "sales_data": [
    {"rep": "Alice", "q1": 15000, "q2": 18000, "q3": 22000, "q4": 25000},
    {"rep": "Bob", "q1": 12000, "q2": 14000, "q3": 16000, "q4": 18000},
    {"rep": "Charlie", "q1": 20000, "q2": 22000, "q3": 19000, "q4": 24000}
  ]
}
---JMESPATH---
map(&{
  representative: rep,
  totalSales: q1 + q2 + q3 + q4,
  avgQuarterly: (q1 + q2 + q3 + q4) / `4`,
  bestQuarter: max([q1, q2, q3, q4])
}, sales_data)
```

This transforms raw sales data into a comprehensive report with calculated metrics using arithmetic operators.

## Best Practices

1. **Preserve Data Integrity**: Use `map()` when you need to maintain the original array structure and length, especially when element positions matter.

2. **Handle Missing Data**: Design expressions that gracefully handle missing properties, as `map()` will include `null` values rather than filtering them out.

3. **Complex Transformations**: Use `map()` for complex object transformations where you need to create new structures from existing data.

4. **Performance Considerations**: For simple property extraction where missing values should be filtered, consider using projections (`[*].property`) instead of `map()`.

5. **Combine with Other Functions**: `map()` works well with other functions like `sort()`, `reverse()`, and filtering operations applied to the result.

The `map()` function is essential for data transformation pipelines where maintaining array structure and applying consistent transformations across all elements is crucial.
