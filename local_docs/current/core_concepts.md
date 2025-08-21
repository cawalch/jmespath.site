---
title: Core Concepts
nav_order: 2
id: core-concepts
---

# Core Concepts

Master the fundamental JMESPath concepts that form the foundation for all advanced data manipulation. These core techniques solve common JSON processing challenges and provide the building blocks for complex queries.

## What You'll Learn

### Data Filtering & Selection
Learn how to precisely select the data you need from complex JSON structures using powerful filtering techniques:

- **Filter Expressions**: Use boolean logic and comparison operators to extract specific elements
- **Conditional Selection**: Apply complex criteria to filter arrays and objects
- **Performance Optimization**: Write efficient filters that process large datasets effectively

### Variable Binding & Scoping
Understand how to reference and reuse values across different parts of your queries:

- **Let Expressions**: Bind variables to avoid repetitive calculations and enable parent context access
- **Lexical Scoping**: Control variable visibility and handle nested data transformations
- **Context Preservation**: Maintain references to parent data while processing nested structures

### Data Cleaning & Validation
Master techniques for cleaning and validating JSON data:

- **Null Handling**: Remove or filter null and empty values from objects and arrays
- **Data Sanitization**: Clean API responses and prepare data for storage or display
- **Conditional Processing**: Apply different logic based on data presence and validity

## When to Use These Concepts

**Filter Expressions** are essential when you need to:
- Extract specific records from large datasets
- Apply complex business logic to data selection
- Combine multiple criteria for precise data filtering

**Let Expressions** become crucial when you need to:
- Reference parent data while processing nested structures
- Avoid repeating expensive calculations
- Build complex transformations that require context preservation

**Null Handling** is vital for:
- Cleaning API responses before frontend consumption
- Preparing data for database storage
- Generating clean exports and reports

## Quick Reference

```jmespath
// Filter arrays with complex conditions
users[?active && age > `25` && department == 'Engineering']

// Use variables to avoid repetition and access parent context
let $dept = department.name in
  employees[*].{name: name, department: $dept, salary: salary}

// Remove null and empty values from objects
from_items(items(user_data)[?@[1] && @[1] != ''])
```

These core concepts work together to provide a solid foundation for all JMESPath operations. Master these fundamentals before moving on to advanced data type operations and specialized functions.
