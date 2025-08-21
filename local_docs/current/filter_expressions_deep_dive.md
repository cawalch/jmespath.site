---
title: Filter Expressions Deep Dive
nav_label: Filter Expressions
nav_order: 11
id: filter-expressions
parent: core-concepts
---

# Filter Expressions Deep Dive

## Overview

Filter expressions are one of JMESPath's most powerful features, enabling sophisticated data selection based on complex criteria. They allow you to filter arrays and objects using boolean logic, comparison operators, and arbitrary expressions, making it possible to extract precisely the data you need from complex JSON structures.

Filter expressions use the syntax `[?expression]` where the expression evaluates to a boolean value for each element being filtered.

## Basic Filter Syntax

### Simple Comparisons

```jmespath-interactive Basic Filtering
{
  "products": [
    {"name": "Laptop", "price": 999, "category": "Electronics", "in_stock": true},
    {"name": "Book", "price": 15, "category": "Education", "in_stock": false},
    {"name": "Phone", "price": 699, "category": "Electronics", "in_stock": true},
    {"name": "Desk", "price": 299, "category": "Furniture", "in_stock": true}
  ]
}
---JMESPATH---
{
  "expensive_items": products[?price > `500`],
  "electronics": products[?category == 'Electronics'],
  "available_items": products[?in_stock],
  "cheap_books": products[?category == 'Education' && price < `20`]
}
```

### Comparison Operators

JMESPath supports all standard comparison operators:

```jmespath-interactive Comparison Operators
{
  "employees": [
    {"name": "Alice", "age": 30, "salary": 85000, "department": "Engineering"},
    {"name": "Bob", "age": 25, "salary": 70000, "department": "Marketing"},
    {"name": "Charlie", "age": 35, "salary": 90000, "department": "Engineering"},
    {"name": "Diana", "age": 28, "salary": 75000, "department": "Sales"}
  ]
}
---JMESPATH---
{
  "young_employees": employees[?age < `30`],
  "senior_employees": employees[?age >= `30`],
  "high_earners": employees[?salary > `80000`],
  "not_marketing": employees[?department != 'Marketing'],
  "exact_age": employees[?age == `28`]
}
```

## Boolean Logic and Complex Expressions

### AND Operations

Use `&&` to combine multiple conditions that must all be true:

```jmespath-interactive AND Logic
{
  "servers": [
    {"name": "web-1", "status": "running", "cpu": 45, "memory": 60, "region": "us-west"},
    {"name": "web-2", "status": "running", "cpu": 80, "memory": 75, "region": "us-west"},
    {"name": "db-1", "status": "stopped", "cpu": 0, "memory": 0, "region": "us-east"},
    {"name": "api-1", "status": "running", "cpu": 65, "memory": 55, "region": "us-east"}
  ]
}
---JMESPATH---
{
  "healthy_servers": servers[?status == 'running' && cpu < `70` && memory < `70`],
  "west_running": servers[?region == 'us-west' && status == 'running'],
  "high_load": servers[?status == 'running' && (cpu > `75` || memory > `70`)]
}
```

### OR Operations

Use `||` to match elements that satisfy any of the conditions:

```jmespath-interactive OR Logic
{
  "events": [
    {"type": "error", "severity": "high", "service": "api", "timestamp": "2023-08-15T10:00:00Z"},
    {"type": "warning", "severity": "medium", "service": "db", "timestamp": "2023-08-15T10:05:00Z"},
    {"type": "info", "severity": "low", "service": "web", "timestamp": "2023-08-15T10:10:00Z"},
    {"type": "error", "severity": "critical", "service": "auth", "timestamp": "2023-08-15T10:15:00Z"}
  ]
}
---JMESPATH---
{
  "critical_events": events[?type == 'error' || severity == 'critical'],
  "important_services": events[?service == 'api' || service == 'auth' || service == 'db'],
  "high_priority": events[?severity == 'high' || severity == 'critical'],
  "recent_issues": events[?type == 'error' || type == 'warning']
}
```

### NOT Operations

Use `!` to negate conditions:

```jmespath-interactive NOT Logic
{
  "users": [
    {"username": "alice", "active": true, "admin": false, "last_login": "2023-08-15"},
    {"username": "bob", "active": false, "admin": false, "last_login": "2023-07-20"},
    {"username": "charlie", "active": true, "admin": true, "last_login": "2023-08-14"},
    {"username": "diana", "active": true, "admin": false, "last_login": null}
  ]
}
---JMESPATH---
{
  "inactive_users": users[?!active],
  "non_admins": users[?!admin],
  "active_non_admins": users[?active && !admin],
  "no_recent_login": users[?!last_login || last_login < '2023-08-01']
}
```

## Advanced Filtering Patterns

### Function-Based Filtering

Combine filters with JMESPath functions for sophisticated selection:

```jmespath-interactive Function-Based Filtering
{
  "articles": [
    {"title": "Introduction to JMESPath", "tags": ["tutorial", "json", "query"], "views": 1500},
    {"title": "Advanced JavaScript Patterns", "tags": ["javascript", "advanced"], "views": 2300},
    {"title": "Python Data Analysis", "tags": ["python", "data", "analysis"], "views": 1800},
    {"title": "JSON Processing Tips", "tags": ["json", "tips", "tutorial"], "views": 900}
  ]
}
---JMESPATH---
{
  "popular_articles": articles[?views > `1000`],
  "tutorial_content": articles[?contains(tags, 'tutorial')],
  "multi_tag_articles": articles[?length(tags) > `2`],
  "json_related": articles[?contains(title, 'JSON') || contains(tags, 'json')],
  "high_engagement": articles[?views > `1500`]
}
```

### String Pattern Matching

Use string functions within filters for text-based selection:

```jmespath-interactive String Pattern Filtering
{
  "files": [
    {"name": "document.pdf", "size": 1024000, "type": "document"},
    {"name": "image.jpg", "size": 512000, "type": "image"},
    {"name": "backup_2023.sql", "size": 5120000, "type": "database"},
    {"name": "script.js", "size": 8192, "type": "code"},
    {"name": "data.json", "size": 2048, "type": "data"}
  ]
}
---JMESPATH---
{
  "large_files": files[?size > `1000000`],
  "images": files[?ends_with(name, '.jpg') || ends_with(name, '.png')],
  "code_files": files[?ends_with(name, '.js') || ends_with(name, '.py')],
  "backup_files": files[?starts_with(name, 'backup_')],
  "small_text_files": files[?size < `10000` && (ends_with(name, '.txt') || ends_with(name, '.json'))]
}
```

### Nested Object Filtering

Filter based on nested object properties:

```jmespath-interactive Nested Object Filtering
{
  "orders": [
    {
      "id": "ORD-001",
      "customer": {"name": "Alice", "tier": "premium"},
      "items": [{"product": "Laptop", "price": 999}],
      "shipping": {"method": "express", "cost": 25}
    },
    {
      "id": "ORD-002", 
      "customer": {"name": "Bob", "tier": "standard"},
      "items": [{"product": "Book", "price": 15}, {"product": "Pen", "price": 5}],
      "shipping": {"method": "standard", "cost": 10}
    },
    {
      "id": "ORD-003",
      "customer": {"name": "Charlie", "tier": "premium"},
      "items": [{"product": "Phone", "price": 699}],
      "shipping": {"method": "express", "cost": 25}
    }
  ]
}
---JMESPATH---
{
  "premium_customers": orders[?customer.tier == 'premium'],
  "express_orders": orders[?shipping.method == 'express'],
  "high_value_orders": orders[?sum(items[*].price) > `500`],
  "premium_express": orders[?customer.tier == 'premium' && shipping.method == 'express'],
  "multi_item_orders": orders[?length(items) > `1`]
}
```

## Performance Considerations

### Early Filtering

Filter early in your pipeline to reduce data processing:

```jmespath-interactive Performance Optimization
{
  "transactions": [
    {"id": 1, "amount": 100, "status": "completed", "date": "2023-08-15", "category": "food"},
    {"id": 2, "amount": 250, "status": "pending", "date": "2023-08-15", "category": "shopping"},
    {"id": 3, "amount": 50, "status": "completed", "date": "2023-08-14", "category": "transport"},
    {"id": 4, "amount": 500, "status": "completed", "date": "2023-08-15", "category": "shopping"},
    {"id": 5, "amount": 75, "status": "failed", "date": "2023-08-13", "category": "food"}
  ]
}
---JMESPATH---
{
  "efficient_query": transactions[?status == 'completed' && date == '2023-08-15'][*].{
    "id": id,
    "amount": amount,
    "category": category
  },
  "less_efficient": transactions[*].{
    "id": id,
    "amount": amount,
    "category": category,
    "status": status,
    "date": date
  }[?status == 'completed' && date == '2023-08-15']
}
```

### Combining Filters with Projections

```jmespath-interactive Filter and Project
{
  "inventory": [
    {"sku": "LAP001", "name": "Gaming Laptop", "price": 1299, "stock": 5, "category": "Electronics"},
    {"sku": "BOO001", "name": "Programming Book", "price": 45, "stock": 20, "category": "Books"},
    {"sku": "PHO001", "name": "Smartphone", "price": 799, "stock": 0, "category": "Electronics"},
    {"sku": "DES001", "name": "Office Desk", "price": 299, "stock": 3, "category": "Furniture"}
  ]
}
---JMESPATH---
{
  "available_electronics": inventory[?category == 'Electronics' && stock > `0`][*].{
    "product": name,
    "price": price,
    "availability": stock
  },
  "low_stock_alerts": inventory[?stock > `0` && stock <= `5`][*].{
    "sku": sku,
    "name": name,
    "remaining": stock,
    "reorder_needed": stock <= `3`
  }
}
```

## Real-World Filtering Scenarios

### Log Analysis

```jmespath-interactive Log Analysis
{
  "logs": [
    {"timestamp": "2023-08-15T10:00:00Z", "level": "INFO", "service": "api", "message": "Request processed", "duration": 120},
    {"timestamp": "2023-08-15T10:01:00Z", "level": "ERROR", "service": "db", "message": "Connection timeout", "duration": 5000},
    {"timestamp": "2023-08-15T10:02:00Z", "level": "WARN", "service": "api", "message": "High latency detected", "duration": 800},
    {"timestamp": "2023-08-15T10:03:00Z", "level": "INFO", "service": "cache", "message": "Cache hit", "duration": 5},
    {"timestamp": "2023-08-15T10:04:00Z", "level": "ERROR", "service": "api", "message": "Rate limit exceeded", "duration": 0}
  ]
}
---JMESPATH---
{
  "error_logs": logs[?level == 'ERROR'],
  "slow_requests": logs[?duration > `500`],
  "api_issues": logs[?service == 'api' && (level == 'ERROR' || level == 'WARN')],
  "performance_problems": logs[?(level == 'ERROR' || level == 'WARN') && duration > `100`],
  "recent_errors": logs[?level == 'ERROR' && timestamp > '2023-08-15T10:01:00Z']
}
```

### E-commerce Analytics

```jmespath-interactive E-commerce Analytics
{
  "sales": [
    {"product_id": "P001", "category": "Electronics", "price": 299, "quantity": 2, "customer_type": "premium", "region": "US"},
    {"product_id": "P002", "category": "Books", "price": 25, "quantity": 1, "customer_type": "standard", "region": "EU"},
    {"product_id": "P003", "category": "Electronics", "price": 599, "quantity": 1, "customer_type": "premium", "region": "US"},
    {"product_id": "P004", "category": "Clothing", "price": 89, "quantity": 3, "customer_type": "standard", "region": "ASIA"},
    {"product_id": "P005", "category": "Electronics", "price": 199, "quantity": 1, "customer_type": "premium", "region": "EU"}
  ]
}
---JMESPATH---
{
  "high_value_sales": sales[?price * quantity > `500`],
  "premium_electronics": sales[?category == 'Electronics' && customer_type == 'premium'],
  "bulk_orders": sales[?quantity >= `3`],
  "us_premium_sales": sales[?region == 'US' && customer_type == 'premium'],
  "electronics_performance": {
    "total_sales": length(sales[?category == 'Electronics']),
    "revenue": sum(sales[?category == 'Electronics'][*].price),
    "avg_order_value": avg(sales[?category == 'Electronics'][*].price)
  }
}
```

### User Management

```jmespath-interactive User Management
{
  "users": [
    {"id": 1, "name": "Alice", "roles": ["admin", "user"], "active": true, "last_login": "2023-08-15T09:00:00Z"},
    {"id": 2, "name": "Bob", "roles": ["user"], "active": false, "last_login": "2023-07-20T14:30:00Z"},
    {"id": 3, "name": "Charlie", "roles": ["moderator", "user"], "active": true, "last_login": "2023-08-14T16:45:00Z"},
    {"id": 4, "name": "Diana", "roles": ["user"], "active": true, "last_login": null}
  ]
}
---JMESPATH---
{
  "active_admins": users[?active && contains(roles, 'admin')],
  "inactive_users": users[?!active],
  "privileged_users": users[?contains(roles, 'admin') || contains(roles, 'moderator')],
  "recent_logins": users[?last_login && last_login > '2023-08-01T00:00:00Z'],
  "users_needing_attention": users[?!active || !last_login || last_login < '2023-08-01T00:00:00Z']
}
```

## Best Practices

1. **Filter Early**: Apply filters as early as possible in your expression to reduce processing overhead.

2. **Use Appropriate Operators**: Choose the right comparison operators and boolean logic for your use case.

3. **Combine with Functions**: Leverage JMESPath functions within filters for more sophisticated selection criteria.

4. **Consider Performance**: For large datasets, simple filters generally perform better than complex nested conditions.

5. **Use Parentheses**: When combining multiple boolean operators, use parentheses to make precedence explicit.

6. **Test Edge Cases**: Consider null values, empty arrays, and missing properties in your filter expressions.

## Operator Precedence

Understanding operator precedence is crucial for complex filters:

1. **Pipe** (`|`) - Lowest precedence
2. **OR** (`||`)
3. **AND** (`&&`)
4. **NOT** (`!`) - Highest precedence

Example: `a || b && !c` is evaluated as `a || (b && (!c))`

## Error Handling

Filter expressions handle various edge cases gracefully:

- **Type mismatches**: Comparison operators return `null` for incompatible types, excluding the element
- **Missing properties**: References to non-existent properties return `null`
- **Null values**: Comparisons with `null` follow standard equality rules

```jmespath-interactive Error Handling
{
  "mixed_data": [
    {"name": "Alice", "age": 30, "score": 85},
    {"name": "Bob", "score": "excellent"},
    {"name": "Charlie", "age": "unknown", "score": 92},
    {"name": "Diana", "age": 25}
  ]
}
---JMESPATH---
{
  "numeric_ages": mixed_data[?type(age) == 'number'],
  "has_score": mixed_data[?score],
  "valid_numeric_scores": mixed_data[?type(score) == 'number' && score > `80`]
}
```

Filter expressions provide the foundation for sophisticated data selection in JMESPath, enabling precise control over which elements are included in your results based on complex, real-world criteria.
