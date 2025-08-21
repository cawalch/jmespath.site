---
title: Data Types & Operations
nav_order: 3
id: data-operations
---

# Data Types & Operations

Master type-specific operations for manipulating arrays, objects, strings, and numbers. These operations provide the building blocks for complex data transformations and enable precise control over different data types in JSON.

## Data Type Categories

### Array Operations
Powerful techniques for working with ordered collections of data:

- **Array Slicing & Indexing**: Extract specific portions using Python-style slice notation `[start:stop:step]`
- **Element Access**: Use positive and negative indexing to access elements from either end
- **Subset Extraction**: Create new arrays from existing ones with precise control over ranges

### Object Manipulation
Comprehensive tools for working with key-value structures:

- **Object Introspection**: Extract keys, values, and key-value pairs with `keys()`, `values()`, `items()`
- **Object Construction**: Build new objects from arrays using `from_items()` and merge objects with `merge()`
- **Structure Transformation**: Convert between objects and arrays for flexible data reshaping

### String Processing
Rich text manipulation capabilities for data cleaning and formatting:

- **Text Transformation**: Convert case with `upper()` and `lower()`
- **String Splitting & Joining**: Break apart and combine strings using `split()` and `join()`
- **Pattern Matching**: Search and test strings with `contains()`, `starts_with()`, `ends_with()`
- **Text Modification**: Clean and format text with `replace()`, `trim()`, and padding functions

### Arithmetic Operations
Mathematical calculations directly within your queries:

- **Basic Math**: Addition, subtraction, multiplication, division, and modulo operations
- **Financial Calculations**: Compute taxes, discounts, and totals in e-commerce scenarios
- **Data Analysis**: Calculate percentages, ratios, and statistical measures
- **Pagination Logic**: Determine page counts, ranges, and navigation states

## Common Use Cases

**Array Slicing** is perfect for:
- Pagination and data windowing
- Extracting recent records or time-based ranges
- Sampling data for analysis or testing

**Object Functions** excel at:
- API response transformation and cleaning
- Dynamic object construction from arrays
- Data normalization and restructuring

**String Functions** are essential for:
- User input validation and formatting
- Data cleaning and standardization
- Text search and pattern matching

**Arithmetic Operations** enable:
- Real-time calculations in data processing
- Financial and business metric computation
- Dynamic field generation and data enrichment

## Quick Reference

```jmespath
// Array slicing - get first 5 items, last 3 items, every other item
items[:5], items[-3:], items[::2]

// Object manipulation - extract keys, rebuild without nulls
keys(user), from_items(items(user)[?@[1] != null])

// String operations - clean and format text
trim(upper(name)), split(email, '@')[1], join(' ', [first, last])

// Arithmetic - calculate totals and percentages
price * quantity, (revenue - costs) / revenue * `100`
```

These operations form the core toolkit for data manipulation in JMESPath. Each type provides specialized functions optimized for working with specific data structures, enabling efficient and readable data transformations.
