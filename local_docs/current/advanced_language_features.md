---
title: Advanced Expression Patterns
nav_label: Expression Patterns
nav_order: 15
id: advanced-expression-patterns
parent: advanced-features
---

# Advanced Expression Patterns

## Overview

JMESPath provides powerful expression patterns that enable sophisticated data manipulation and transformation. These patterns combine basic JMESPath features in creative ways to solve complex real-world data processing challenges.

The key advanced patterns include:
- **Complex Filter Combinations**: Multi-level filtering with boolean logic
- **Dynamic Field Selection**: Conditional field extraction and transformation
- **Cross-Reference Patterns**: Correlating data across different document sections
- **Nested Transformation Patterns**: Deep data restructuring with context preservation

## Complex Filter Combinations

### Multi-Level Filtering

Combine multiple filter expressions to create sophisticated selection criteria:

```jmespath-interactive Multi-Level Filtering
{
  "departments": [
    {
      "name": "Engineering",
      "budget": 500000,
      "employees": [
        {"name": "Alice", "level": "senior", "salary": 120000, "active": true},
        {"name": "Bob", "level": "junior", "salary": 80000, "active": true},
        {"name": "Charlie", "level": "senior", "salary": 130000, "active": false}
      ]
    },
    {
      "name": "Marketing",
      "budget": 300000,
      "employees": [
        {"name": "Diana", "level": "senior", "salary": 110000, "active": true},
        {"name": "Eve", "level": "junior", "salary": 70000, "active": true}
      ]
    }
  ]
}
---JMESPATH---
departments[?budget > `400000`][*].employees[*][?active && level == 'senior']
```

### Boolean Logic Patterns

Use complex boolean expressions for precise data selection:

```jmespath-interactive Boolean Logic
{
  "products": [
    {"name": "Laptop", "category": "Electronics", "price": 1200, "rating": 4.5, "in_stock": true},
    {"name": "Phone", "category": "Electronics", "price": 800, "rating": 4.2, "in_stock": false},
    {"name": "Book", "category": "Books", "price": 25, "rating": 4.8, "in_stock": true},
    {"name": "Tablet", "category": "Electronics", "price": 600, "rating": 4.0, "in_stock": true}
  ]
}
---JMESPATH---
{
  "premium_available": products[?(category == 'Electronics' && price > `700` && in_stock)],
  "highly_rated_affordable": products[?(rating >= `4.5` && price < `100`) || (rating >= `4.0` && price < `50`)],
  "electronics_analysis": products[?category == 'Electronics'].{
    name: name,
    value_score: rating * `100` / price,
    availability: in_stock && 'Available' || 'Out of Stock'
  }
}
```

## Dynamic Field Selection

### Conditional Field Extraction

Extract different fields based on data characteristics:

```jmespath-interactive Conditional Fields
{
  "users": [
    {"type": "admin", "username": "admin1", "permissions": ["read", "write", "delete"], "last_login": "2023-12-01"},
    {"type": "user", "username": "user1", "email": "user1@example.com", "profile": {"name": "John Doe"}},
    {"type": "service", "service_name": "api-gateway", "endpoint": "https://api.example.com", "status": "active"}
  ]
}
---JMESPATH---
users[*].{
  identifier: username || service_name,
  contact: email || endpoint,
  access_info: permissions || profile || status,
  account_type: type
}
```

### Nested Data Transformation

Transform nested structures while preserving context:

```jmespath-interactive Nested Transformation
{
  "company": {
    "name": "TechCorp",
    "departments": [
      {
        "name": "Engineering",
        "teams": [
          {"name": "Backend", "members": [{"name": "Alice", "role": "Lead"}, {"name": "Bob", "role": "Dev"}]},
          {"name": "Frontend", "members": [{"name": "Charlie", "role": "Lead"}, {"name": "Diana", "role": "Dev"}]}
        ]
      },
      {
        "name": "Product",
        "teams": [
          {"name": "Design", "members": [{"name": "Eve", "role": "Lead"}]},
          {"name": "Research", "members": [{"name": "Frank", "role": "Analyst"}]}
        ]
      }
    ]
  }
}
---JMESPATH---
company.departments[*].{
  department: name,
  team_structure: teams[*].{
    team: name,
    size: length(members),
    lead: members[?role == 'Lead'].name | [0],
    all_members: members[*].name
  }
}
```

## Cross-Reference Patterns

### Data Correlation Techniques

Correlate data across different sections using creative filtering:

```jmespath-interactive Data Correlation
{
  "user_preferences": [
    {"user_id": "u1", "category": "Electronics", "max_budget": 1000},
    {"user_id": "u2", "category": "Books", "max_budget": 100}
  ],
  "products": [
    {"id": "p1", "name": "Laptop", "category": "Electronics", "price": 800},
    {"id": "p2", "name": "Phone", "category": "Electronics", "price": 1200},
    {"id": "p3", "name": "Novel", "category": "Books", "price": 25},
    {"id": "p4", "name": "Textbook", "category": "Books", "price": 150}
  ]
}
---JMESPATH---
user_preferences[*].[
  let $userCat = category,
      $userBudget = max_budget
  in {
    user: user_id,
    preferred_category: $userCat,
    budget: $userBudget,
    matching_products: products[?category == $userCat && price <= $userBudget].{
      name: name,
      price: price,
      within_budget: `true`
    }
  }
]
```

### Reference-Based Filtering

Use let expressions to create cross-references:

```jmespath-interactive Reference Filtering
{
  "config": {
    "active_regions": ["us-east", "eu-west"],
    "min_capacity": 5
  },
  "servers": [
    {"name": "web-01", "region": "us-east", "capacity": 8, "status": "running"},
    {"name": "web-02", "region": "us-west", "capacity": 6, "status": "running"},
    {"name": "web-03", "region": "eu-west", "capacity": 4, "status": "stopped"},
    {"name": "web-04", "region": "eu-west", "capacity": 10, "status": "running"}
  ]
}
---JMESPATH---
let $activeRegions = config.active_regions,
    $minCapacity = config.min_capacity
in {
  "eligible_servers": servers[?contains($activeRegions, region) && capacity >= $minCapacity && status == 'running'],
  "region_summary": $activeRegions[*].[
    let $currentRegion = @,
        $regionServers = servers[?region == $currentRegion],
        $runningServers = servers[?region == $currentRegion && status == 'running']
    in {
      region: $currentRegion,
      server_count: length($regionServers || `[]`),
      running_servers: length($runningServers || `[]`),
      total_capacity: sum($regionServers[*].capacity || `[]`)
    }
  ]
}
```

## Practical Applications

### Log Analysis Pattern

Process and analyze log data using advanced patterns:

```jmespath-interactive Log Analysis
{
  "logs": [
    {"timestamp": "2023-12-01T10:00:00Z", "level": "INFO", "service": "api", "message": "Request processed"},
    {"timestamp": "2023-12-01T10:01:00Z", "level": "ERROR", "service": "db", "message": "Connection timeout"},
    {"timestamp": "2023-12-01T10:02:00Z", "level": "WARN", "service": "api", "message": "High latency detected"},
    {"timestamp": "2023-12-01T10:03:00Z", "level": "ERROR", "service": "api", "message": "Request failed"}
  ]
}
---JMESPATH---
{
  "error_analysis": {
    "total_errors": length(logs[?level == 'ERROR']),
    "services_with_errors": logs[?level == 'ERROR'].service | sort(@),
    "error_timeline": logs[?level == 'ERROR'].{
      time: timestamp,
      service: service,
      issue: message
    }
  },
  "service_health": [
    {
      "service": "api",
      "total_logs": length(logs[?service == 'api']),
      "error_count": length(logs[?service == 'api' && level == 'ERROR']),
      "error_rate": length(logs[?service == 'api' && level == 'ERROR']) * `100` / length(logs[?service == 'api'])
    },
    {
      "service": "db",
      "total_logs": length(logs[?service == 'db']),
      "error_count": length(logs[?service == 'db' && level == 'ERROR']),
      "error_rate": length(logs[?service == 'db' && level == 'ERROR']) * `100` / length(logs[?service == 'db'])
    }
  ]
}
```

## Advanced Language Features

### Ternary Conditional Expressions

JMESPath supports ternary conditional expressions using the `condition ? true-expression : false-expression` syntax:

```jmespath-interactive Ternary Conditionals
{
  "users": [
    {"name": "Alice", "age": 25, "active": true, "score": 85},
    {"name": "Bob", "age": 17, "active": false, "score": 92},
    {"name": "Charlie", "age": 30, "active": true, "score": 78},
    {"name": "Diana", "age": 16, "active": true, "score": 95}
  ]
}
---JMESPATH---
users[*].{
  name: name,
  age: age,
  status: active ? 'Active' : 'Inactive',
  access_level: age >= `18` ? 'Adult' : 'Minor',
  performance: score >= `90` ? 'Excellent' : score >= `80` ? 'Good' : 'Needs Improvement'
}
```

### Root Reference Operator

Use `$` to reference the root document from any scope:

```jmespath-interactive Root Reference
{
  "config": {
    "environment": "production",
    "max_price": 1000
  },
  "products": [
    {"name": "Laptop", "price": 800, "category": "Electronics"},
    {"name": "Phone", "price": 1200, "category": "Electronics"},
    {"name": "Book", "price": 25, "category": "Books"}
  ]
}
---JMESPATH---
products[?price <= $.config.max_price].{
  name: name,
  price: price,
  environment: $.config.environment,
  within_budget: `true`
}
```

### String Slicing

Apply array slice syntax to strings for substring operations:

```jmespath-interactive String Slicing
{
  "data": {
    "email": "user@example.com",
    "phone": "+1-555-123-4567",
    "code": "PROD-2023-001"
  }
}
---JMESPATH---
{
  "email_username": data.email[0:4],
  "phone_area": data.phone[3:6],
  "product_year": data.code[5:9],
  "reversed_code": data.code[::-1]
}
```

## Best Practices

### Root Reference Guidelines

1. **Use Sparingly**: Root references are powerful but can make expressions harder to understand
2. **Document Context**: When using `$`, ensure the relationship to root data is clear
3. **Performance Consideration**: Root references don't impact performance significantly but complex expressions might

### Ternary Expression Guidelines

1. **Prefer Simple Conditions**: Keep ternary conditions readable and straightforward
2. **Use Parentheses**: For complex conditions, use parentheses to clarify precedence
3. **Consider Alternatives**: For very complex logic, multiple expressions might be clearer

### String Slicing Guidelines

1. **Validate Input**: Ensure strings exist before slicing to avoid errors
2. **Handle Edge Cases**: Consider empty strings and boundary conditions
3. **Combine with Functions**: Use with `length()`, `split()`, and other string functions for powerful text processing

These advanced language features provide sophisticated capabilities for handling complex data manipulation scenarios that require dynamic behavior, conditional logic, and cross-document data correlation.
