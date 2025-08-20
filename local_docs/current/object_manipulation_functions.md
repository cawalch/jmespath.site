---
title: Object Manipulation Functions
nav_label: Object Functions
nav_order: 9
---

# Object Manipulation Functions

## Overview

JMESPath provides a powerful set of functions for manipulating JSON objects, enabling complex object transformations, restructuring, and analysis. These functions allow you to extract keys and values, convert between objects and arrays, merge objects, and perform sophisticated object operations.

The core object manipulation functions include:
- **Object introspection**: `keys()`, `values()`, `items()`
- **Object construction**: `from_items()`, `merge()`
- **Array utilities**: `zip()`

## Object Introspection Functions

### keys()

Extract all keys from an object as an array.

```
array[string] keys(object $obj)
```

```jmespath-interactive Keys Extraction
{
  "user": {
    "name": "Alice",
    "email": "alice@example.com",
    "age": 30,
    "active": true
  },
  "config": {
    "theme": "dark",
    "language": "en",
    "notifications": true
  }
}
---JMESPATH---
{
  "user_fields": keys(user),
  "config_options": keys(config),
  "all_keys": keys(@),
  "sorted_user_keys": sort(keys(user))
}
```

**Keys extraction explained:**
- `keys(user)` returns ["name", "email", "age", "active"] - all property names from the user object
- `keys(config)` extracts ["theme", "language", "notifications"] from the config object
- `keys(@)` gets keys from the root object: ["user", "config"]
- `sort(keys(user))` alphabetically sorts the user keys: ["active", "age", "email", "name"]
- Keys are always returned as strings, regardless of the original property types

### values()

Extract all values from an object as an array.

```
array[any] values(object $obj)
```

```jmespath-interactive Values Extraction
{
  "scores": {
    "math": 95,
    "science": 87,
    "english": 92,
    "history": 89
  },
  "settings": {
    "auto_save": true,
    "theme": "light",
    "font_size": 14
  }
}
---JMESPATH---
{
  "all_scores": values(scores),
  "average_score": avg(values(scores)),
  "max_score": max(values(scores)),
  "setting_values": values(settings),
  "numeric_settings": values(settings)[?type(@) == 'number']
}
```

**Values extraction breakdown:**
- `values(scores)` extracts [95, 87, 92, 89] - all numeric values from the scores object
- `avg(values(scores))` calculates the average: (95 + 87 + 92 + 89) / 4 = 90.75
- `max(values(scores))` finds the highest score: 95
- `values(settings)` returns [true, "light", 14] - mixed types from settings
- The filter `[?type(@) == 'number']` isolates only numeric values: [14]

### items()

Convert an object to an array of key-value pairs.

```
array[array[any]] items(object $obj)
```

```jmespath-interactive Items Conversion
{
  "product": {
    "name": "Laptop",
    "price": 999,
    "category": "Electronics",
    "in_stock": true
  },
  "metadata": {
    "created": "2023-08-15",
    "version": "1.2",
    "author": "system"
  }
}
---JMESPATH---
{
  "product_pairs": items(product),
  "sorted_by_key": sort_by(items(product), &[0]),
  "sorted_by_value": sort_by(items(metadata), &[1]),
  "key_value_map": items(product)[*].{key: @[0], value: @[1], type: type(@[1])}
}
```

**What this example demonstrates:**

1. **`items(product)`** converts the product object into an array of key-value pairs:
   ```
   [["name", "Laptop"], ["price", 999], ["category", "Electronics"], ["in_stock", true]]
   ```

2. **`sort_by(items(product), &[0])`** sorts the key-value pairs alphabetically by key name:
   ```
   [["category", "Electronics"], ["in_stock", true], ["name", "Laptop"], ["price", 999]]
   ```

3. **`sort_by(items(metadata), &[1])`** sorts the metadata pairs by their values:
   ```
   [["version", "1.2"], ["created", "2023-08-15"], ["author", "system"]]
   ```

4. **`items(product)[*].{key: @[0], value: @[1], type: type(@[1])}`** transforms each key-value pair into a structured object with metadata:
   ```
   [
     {"key": "name", "value": "Laptop", "type": "string"},
     {"key": "price", "value": 999, "type": "number"},
     {"key": "category", "value": "Electronics", "type": "string"},
     {"key": "in_stock", "value": true, "type": "boolean"}
   ]
   ```

**Real-world applications:**
- **API introspection**: Analyze object structure and data types
- **Configuration validation**: Sort and examine configuration keys
- **Data auditing**: Create metadata about object properties for logging
- **Dynamic form generation**: Generate form fields based on object structure

## Object Construction Functions

### from_items()

Convert an array of key-value pairs back to an object.

```
object from_items(array[array[any]] $pairs)
```

```jmespath-interactive From Items Construction
{
  "pairs": [
    ["name", "Bob"],
    ["age", 25],
    ["city", "Seattle"],
    ["active", true]
  ],
  "config_pairs": [
    ["debug", false],
    ["timeout", 30],
    ["retries", 3]
  ]
}
---JMESPATH---
{
  "user_object": from_items(pairs),
  "config_object": from_items(config_pairs),
  "filtered_object": from_items(pairs[?@[1] != `true`]),
  "transformed_pairs": from_items(pairs[*].[upper(@[0]), @[1]])
}
```

**What this example demonstrates:**

1. **`from_items(pairs)`** converts the key-value pair array back into an object:
   ```
   {"name": "Bob", "age": 25, "city": "Seattle", "active": true}
   ```

2. **`from_items(config_pairs)`** creates a configuration object:
   ```
   {"debug": false, "timeout": 30, "retries": 3}
   ```

3. **`from_items(pairs[?@[1] != true])`** filters out pairs where the value is `true`, then creates an object:
   - Filters to: `[["name", "Bob"], ["age", 25], ["city", "Seattle"]]`
   - Result: `{"name": "Bob", "age": 25, "city": "Seattle"}`

4. **`from_items(pairs[*].[upper(@[0]), @[1]])`** transforms keys to uppercase before creating the object:
   - Transforms to: `[["NAME", "Bob"], ["AGE", 25], ["CITY", "Seattle"], ["ACTIVE", true]]`
   - Result: `{"NAME": "Bob", "AGE": 25, "CITY": "Seattle", "ACTIVE": true}`

**Real-world applications:**
- **Dynamic object construction**: Build objects from processed data arrays
- **Configuration merging**: Combine configuration key-value pairs from multiple sources
- **Data transformation**: Convert tabular data (CSV-like) into structured objects
- **API response formatting**: Transform internal data structures for external APIs

### merge()

Combine multiple objects into one, with later objects overriding earlier ones.

```
object merge(object $obj1[, object $obj2, ...])
```

```jmespath-interactive Object Merging
{
  "defaults": {
    "theme": "light",
    "language": "en",
    "timeout": 30,
    "debug": false
  },
  "user_prefs": {
    "theme": "dark",
    "timeout": 60
  },
  "admin_overrides": {
    "debug": true,
    "admin_mode": true
  }
}
---JMESPATH---
{
  "final_config": merge(defaults, user_prefs, admin_overrides),
  "user_config": merge(defaults, user_prefs),
  "with_computed": merge(defaults, {computed_field: length(keys(defaults))})
}
```

**What this example demonstrates:**

1. **`merge(defaults, user_prefs, admin_overrides)`** combines three objects with precedence (later objects override earlier ones):
   - Starts with: `{"theme": "light", "language": "en", "timeout": 30, "debug": false}`
   - User preferences override: `theme` becomes "dark", `timeout` becomes 60
   - Admin overrides: `debug` becomes true, adds `admin_mode: true`
   - Final result: `{"theme": "dark", "language": "en", "timeout": 60, "debug": true, "admin_mode": true}`

2. **`merge(defaults, user_prefs)`** shows a two-level merge:
   - Result: `{"theme": "dark", "language": "en", "timeout": 60, "debug": false}`
   - Only user preferences are applied, no admin overrides

3. **`merge(defaults, {computed_field: length(keys(defaults))})`** demonstrates merging with computed values:
   - `length(keys(defaults))` calculates the number of default settings (4)
   - Result: `{"theme": "light", "language": "en", "timeout": 30, "debug": false, "computed_field": 4}`

**Real-world applications:**
- **Configuration management**: Layer default, user, and environment-specific settings
- **API response composition**: Combine base response with user-specific data
- **Feature flag resolution**: Merge default flags with user/environment overrides
- **Settings inheritance**: Apply organizational defaults with team and individual customizations

## Advanced Object Manipulation

### Object Transformation Patterns

```jmespath-interactive Object Transformation
{
  "employees": [
    {"id": 1, "name": "Alice", "dept": "Engineering", "salary": 85000},
    {"id": 2, "name": "Bob", "dept": "Marketing", "salary": 70000},
    {"id": 3, "name": "Charlie", "dept": "Engineering", "salary": 90000}
  ]
}
---JMESPATH---
{
  "by_department": from_items(
    group_by(employees, &dept) | items(@)[*].[
      @[0],
      {
        "count": length(@[1]),
        "avg_salary": avg(@[1][*].salary),
        "employees": @[1][*].name
      }
    ]
  ),
  "salary_ranges": from_items(
    employees[*].[
      name,
      salary > `80000` && 'high' || salary > `60000` && 'medium' || 'low'
    ]
  )
}
```

### Dynamic Object Construction

```jmespath-interactive Dynamic Construction
{
  "data": [
    {"metric": "cpu_usage", "value": 75, "unit": "percent"},
    {"metric": "memory_usage", "value": 60, "unit": "percent"},
    {"metric": "disk_space", "value": 45, "unit": "GB"},
    {"metric": "network_io", "value": 120, "unit": "MB/s"}
  ]
}
---JMESPATH---
{
  "metrics_object": from_items(data[*].[metric, value]),
  "with_units": from_items(data[*].[metric, join(' ', [to_string(value), unit])]),
  "categorized": from_items(data[*].[
    metric,
    {
      "value": value,
      "unit": unit,
      "status": value > `70` && 'high' || value > `40` && 'medium' || 'low'
    }
  ])
}
```

### Object Filtering and Cleaning

```jmespath-interactive Object Filtering
{
  "user_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secret123",
    "age": null,
    "preferences": {
      "theme": "dark",
      "notifications": true,
      "beta_features": null
    },
    "internal_id": "usr_12345",
    "created_at": "2023-08-15T10:00:00Z"
  }
}
---JMESPATH---
{
  "public_fields": from_items(
    items(user_data)[?!contains(['password', 'internal_id'], @[0])]
  ),
  "non_null_values": from_items(
    items(user_data)[?@[1] != null]
  ),
  "clean_preferences": merge(
    user_data,
    {preferences: from_items(items(user_data.preferences)[?@[1] != null])}
  )
}
```

## Utility Functions

### zip()

Combine multiple arrays element-wise into pairs.

```
array[array[any]] zip(array[any] $array1, array[any] $array2[, ...])
```

```jmespath-interactive Array Zipping
{
  "names": ["Alice", "Bob", "Charlie"],
  "ages": [30, 25, 35],
  "departments": ["Engineering", "Marketing", "Sales"],
  "salaries": [85000, 70000, 90000]
}
---JMESPATH---
{
  "name_age_pairs": zip(names, ages),
  "employee_records": from_items(zip(names, ages)),
  "full_records": zip(names, ages, departments, salaries)[*].{
    "name": @[0],
    "age": @[1],
    "department": @[2],
    "salary": @[3]
  }
}
```

## Real-World Applications

### API Response Transformation

```jmespath-interactive API Transformation
{
  "api_response": {
    "users": [
      {"user_id": 1, "username": "alice", "email": "alice@example.com"},
      {"user_id": 2, "username": "bob", "email": "bob@example.com"}
    ],
    "permissions": [
      {"user_id": 1, "role": "admin", "permissions": ["read", "write", "delete"]},
      {"user_id": 2, "role": "user", "permissions": ["read"]}
    ]
  }
}
---JMESPATH---
{
  "users_by_id": from_items(
    api_response.users[*].[to_string(user_id), @]
  ),
  "permissions_by_id": from_items(
    api_response.permissions[*].[to_string(user_id), @]
  ),
  "enriched_users": from_items(
    api_response.users[*].[
      to_string(user_id),
      merge(@, api_response.permissions[?user_id == @.user_id] | [0])
    ]
  )
}
```

### Configuration Management

```jmespath-interactive Configuration Management
{
  "base_config": {
    "database": {
      "host": "localhost",
      "port": 5432,
      "ssl": false
    },
    "cache": {
      "ttl": 300,
      "max_size": 1000
    },
    "logging": {
      "level": "info",
      "format": "json"
    }
  },
  "environment_overrides": {
    "production": {
      "database": {"host": "prod-db.example.com", "ssl": true},
      "logging": {"level": "warn"}
    },
    "development": {
      "database": {"host": "dev-db.example.com"},
      "logging": {"level": "debug"},
      "cache": {"ttl": 60}
    }
  }
}
---JMESPATH---
{
  "prod_config": merge(
    base_config,
    from_items(
      items(environment_overrides.production)[*].[
        @[0],
        @[1]
      ]
    )
  ),
  "dev_config": merge(
    base_config,
    from_items(
      items(environment_overrides.development)[*].[
        @[0],
        @[1]
      ]
    )
  )
}
```

### Data Aggregation and Reporting

```jmespath-interactive Data Aggregation
{
  "sales_data": [
    {"region": "North", "product": "A", "sales": 1000, "quarter": "Q1"},
    {"region": "North", "product": "B", "sales": 1500, "quarter": "Q1"},
    {"region": "South", "product": "A", "sales": 800, "quarter": "Q1"},
    {"region": "South", "product": "B", "sales": 1200, "quarter": "Q1"}
  ]
}
---JMESPATH---
{
  "by_region": from_items(
    group_by(sales_data, &region) | items(@)[*].[
      @[0],
      {
        "total_sales": sum(@[1][*].sales),
        "products": @[1][*].product,
        "avg_sales": avg(@[1][*].sales)
      }
    ]
  ),
  "by_product": from_items(
    group_by(sales_data, &product) | items(@)[*].[
      @[0],
      {
        "total_sales": sum(@[1][*].sales),
        "regions": @[1][*].region,
        "performance": sum(@[1][*].sales) > `2000` && 'excellent' || 'good'
      }
    ]
  )
}
```

## Best Practices

1. **Use Appropriate Functions**: Choose `keys()`, `values()`, or `items()` based on what you need to extract from objects.

2. **Combine with Sorting**: Object key-value pairs are unordered; use `sort()` or `sort_by()` when order matters.

3. **Leverage merge() for Configuration**: Use `merge()` to combine base configurations with overrides.

4. **Filter Before Construction**: When using `from_items()`, filter unwanted pairs first for cleaner objects.

5. **Handle Null Values**: Consider filtering out null values when constructing objects from items.

6. **Use with Group Operations**: Combine object functions with `group_by()` for powerful aggregation patterns.

## Function Reference Summary

| Function | Syntax | Purpose |
|----------|--------|---------|
| `keys(object)` | `array[string] keys(object $obj)` | Extract object keys |
| `values(object)` | `array[any] values(object $obj)` | Extract object values |
| `items(object)` | `array[array[any]] items(object $obj)` | Convert object to key-value pairs |
| `from_items(array)` | `object from_items(array[array[any]] $pairs)` | Convert key-value pairs to object |
| `merge(object, ...)` | `object merge(object $obj1[, object $obj2, ...])` | Merge multiple objects |
| `zip(array, ...)` | `array[array[any]] zip(array[any] $array1, array[any] $array2[, ...])` | Combine arrays element-wise |

Object manipulation functions provide essential capabilities for transforming, restructuring, and analyzing JSON objects in sophisticated ways, enabling complex data processing workflows directly within JMESPath expressions.
