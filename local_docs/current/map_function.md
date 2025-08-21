---
title: map() Function
nav_label: map() Function
nav_order: 30
id: map-function
parent: advanced-features
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

**How map() works here:**
- `&name` is an expression reference that extracts the `name` property
- `map()` applies this expression to each element in the `users` array
- Result: ["Alice", "Bob", "Charlie", "Diana"] - preserving the original order
- All four users have a `name` property, so no `null` values appear in the result

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

**Understanding null preservation:**
- Result: [999, null, 79, 299] - exactly 4 elements, same as input array
- The Mouse (index 1) has no `price` property, so `map()` inserts `null`
- This differs from projections like `products[*].price` which would return [999, 79, 299]
- Element positions are preserved: Laptop=0, Mouse=1, Keyboard=2, Monitor=3
- This behavior is crucial when you need to maintain correspondence between arrays

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

**What this transformation accomplishes:**

1. **`join(' ', [firstName, lastName])`** combines first and last names with a space:
   - "John" + " " + "Doe" = "John Doe"
   - "Jane" + " " + "Smith" = "Jane Smith"
   - "Bob" + " " + "Johnson" = "Bob Johnson"

2. **Field renaming and restructuring**:
   - `annualSalary: salary` renames the field for clarity
   - `dept: department` shortens the field name
   - `fullName` creates a new computed field

3. **Result structure** - each employee becomes:
   ```
   [
     {"fullName": "John Doe", "annualSalary": 75000, "dept": "Engineering"},
     {"fullName": "Jane Smith", "annualSalary": 82000, "dept": "Marketing"},
     {"fullName": "Bob Johnson", "annualSalary": 68000, "dept": "Engineering"}
   ]
   ```

**Real-world applications:**
- **API response formatting**: Transform internal data structure for external consumption
- **Report generation**: Prepare data for display with computed fields and cleaner names
- **Data export**: Restructure database records for CSV/Excel export
- **Frontend data preparation**: Format backend data for UI components

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

**What this mathematical transformation does:**

1. **Temperature conversion formula**: `celsius * 1.8 + 32`
   - 0°C → (0 × 1.8) + 32 = 32°F (freezing point)
   - 25°C → (25 × 1.8) + 32 = 77°F (room temperature)
   - 100°C → (100 × 1.8) + 32 = 212°F (boiling point)
   - -10°C → (-10 × 1.8) + 32 = 14°F (below freezing)

2. **Data preservation**: Original Celsius values and humidity are kept alongside the computed Fahrenheit values

3. **Result structure**:
   ```
   [
     {"celsius": 0, "fahrenheit": 32, "humidity": 45},
     {"celsius": 25, "fahrenheit": 77, "humidity": 60},
     {"celsius": 100, "fahrenheit": 212, "humidity": 80},
     {"celsius": -10, "fahrenheit": 14, "humidity": 30}
   ]
   ```

**Real-world applications:**
- **IoT sensor data**: Convert temperature readings for different regional displays
- **Weather APIs**: Provide temperature in multiple units for international users
- **Scientific data processing**: Unit conversions in research datasets
- **Manufacturing systems**: Convert measurements between metric and imperial systems

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

**What this nested extraction accomplishes:**

1. **Direct field access**: `id` → `orderId` (simple field copy)

2. **Single-level nesting**: `customer.name` → `customerName`
   - Extracts "Alice" from `{"name": "Alice", "tier": "premium"}`
   - Extracts "Bob" from `{"name": "Bob", "tier": "standard"}`

3. **Array aggregation**: `length(items)` → `itemCount`
   - Order 1: 1 item (laptop)
   - Order 2: 2 items (mouse + keyboard)

4. **Array computation**: `sum(items[*].price)` → `totalValue`
   - Order 1: sum([999]) = 999
   - Order 2: sum([25, 75]) = 100

5. **Deep nesting**: `shipping.address.city` → `shippingCity`
   - Navigates through shipping → address → city
   - Extracts "Seattle" and "Portland"

**Result structure**:
```
[
  {"orderId": "ord_1", "customerName": "Alice", "itemCount": 1, "totalValue": 999, "shippingCity": "Seattle"},
  {"orderId": "ord_2", "customerName": "Bob", "itemCount": 2, "totalValue": 100, "shippingCity": "Portland"}
]
```

**Real-world applications:**
- **E-commerce analytics**: Flatten complex order data for reporting dashboards
- **Invoice generation**: Extract billing information from nested customer/order structures
- **Shipping logistics**: Aggregate order details for fulfillment systems
- **Customer insights**: Combine customer, order, and shipping data for analysis

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
