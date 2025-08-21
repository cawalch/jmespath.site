---
title: Let Expressions & Lexical Scoping
nav_label: Let Expressions
nav_order: 12
id: let-expressions
parent: core-concepts
---

# Let Expressions & Lexical Scoping

## Overview

Let expressions introduce lexical scoping to JMESPath, enabling you to bind variables that can be referenced throughout an expression. This powerful feature allows queries to refer to elements defined outside of their current context, solving one of the most commonly requested limitations of JMESPath.

The syntax follows the familiar pattern from functional programming languages:
```
let $variable = expression in expression
```

Variables are prefixed with `$` and are only visible within the scope of the `in` clause.

## Basic Let Expressions

### Simple Variable Binding

```jmespath-interactive Basic Variable Binding
{
  "user": {
    "name": "Alice",
    "profile": {
      "email": "alice@example.com",
      "preferences": {
        "theme": "dark",
        "language": "en"
      }
    }
  }
}
---JMESPATH---
{
  "simple_binding": let $name = user.name in $name,
  "nested_access": let $email = user.profile.email in $email,
  "multiple_references": let $theme = user.profile.preferences.theme in [$theme, $theme, $theme]
}
```

**Breaking down the syntax:**
- `let $name = user.name in $name` - binds the value "Alice" to variable `$name`, then returns it
- `let $email = user.profile.email in $email` - captures the nested email value for reuse
- The `$theme` example shows how you can reference the same variable multiple times within the `in` clause
- Variables must be prefixed with `$` and are only accessible within their scope

### Multiple Variable Assignments

You can bind multiple variables in a single let expression using comma separation:

```jmespath-interactive Multiple Variables
{
  "order": {
    "id": "ORD-12345",
    "customer": "John Doe",
    "items": [
      {"name": "Laptop", "price": 999, "quantity": 1},
      {"name": "Mouse", "price": 25, "quantity": 2}
    ],
    "shipping": {
      "address": "123 Main St",
      "method": "express"
    }
  }
}
---JMESPATH---
let $orderId = order.id,
    $customer = order.customer,
    $total = sum(order.items[*].price)
in {
  "order_summary": $orderId,
  "customer_name": $customer,
  "total_amount": $total,
  "formatted": join(' - ', [$orderId, $customer, to_string($total)])
}
```

**Multiple variable binding walkthrough:**
1. `$orderId = order.id` - captures "ORD-12345" for reuse
2. `$customer = order.customer` - stores "John Doe" in a variable
3. `$total = sum(order.items[*].price)` - calculates total price (999 + 25 = 1024) and stores it
4. The `in` clause then uses all three variables to build the result object
5. Notice how `$orderId` and `$customer` are used multiple times in the `formatted` field
6. Variables are separated by commas and can span multiple lines for readability

## Solving Parent Reference Problems

### Accessing Parent Context

One of the primary use cases for let expressions is accessing parent elements when drilling down into nested structures:

```jmespath-interactive Parent Context Access
{
  "regions": [
    {
      "name": "US-West",
      "preferred_zone": "us-west-1a",
      "zones": [
        {"id": "us-west-1a", "capacity": 100},
        {"id": "us-west-1b", "capacity": 75},
        {"id": "us-west-1c", "capacity": 50}
      ]
    },
    {
      "name": "US-East", 
      "preferred_zone": "us-east-1b",
      "zones": [
        {"id": "us-east-1a", "capacity": 80},
        {"id": "us-east-1b", "capacity": 120},
        {"id": "us-east-1c", "capacity": 60}
      ]
    }
  ]
}
---JMESPATH---
regions[*].[
  let $preferred = preferred_zone
  in {
    "region": name,
    "preferred_zone": $preferred,
    "preferred_capacity": zones[?id == $preferred].capacity | [0],
    "total_capacity": sum(zones[*].capacity)
  }
]
```

### Complex Nested Scenarios

```jmespath-interactive Complex Nesting
{
  "departments": [
    {
      "name": "Engineering",
      "budget": 500000,
      "teams": [
        {
          "name": "Frontend",
          "members": [
            {"name": "Alice", "salary": 85000, "level": "senior"},
            {"name": "Bob", "salary": 70000, "level": "mid"}
          ]
        },
        {
          "name": "Backend",
          "members": [
            {"name": "Charlie", "salary": 90000, "level": "senior"},
            {"name": "Diana", "salary": 75000, "level": "mid"}
          ]
        }
      ]
    }
  ]
}
---JMESPATH---
departments[*].[
  let $deptName = name,
      $budget = budget
  in {
    "department": $deptName,
    "budget": $budget,
    "teams": teams[*].[
      let $teamName = name
      in {
        "team": $teamName,
        "department": $deptName,
        "team_cost": sum(members[*].salary),
        "budget_utilization": sum(members[*].salary) / $budget * `100`,
        "senior_count": length(members[?level == 'senior'])
      }
    ]
  }
]
```

## Advanced Scoping Patterns

### Nested Let Expressions

Let expressions can be nested, creating multiple levels of scope:

```jmespath-interactive Nested Scoping
{
  "config": {
    "environment": "production",
    "services": [
      {
        "name": "api-service",
        "instances": [
          {"id": "api-1", "status": "running", "cpu": 45},
          {"id": "api-2", "status": "running", "cpu": 60},
          {"id": "api-3", "status": "stopped", "cpu": 0}
        ]
      },
      {
        "name": "db-service",
        "instances": [
          {"id": "db-1", "status": "running", "cpu": 80},
          {"id": "db-2", "status": "running", "cpu": 75}
        ]
      }
    ]
  }
}
---JMESPATH---
let $env = config.environment
in config.services[*].[
  let $serviceName = name,
      $runningInstances = instances[?status == 'running']
  in {
    "environment": $env,
    "service": $serviceName,
    "health_check": let $avgCpu = avg($runningInstances[*].cpu)
                   in {
                     "running_instances": length($runningInstances),
                     "average_cpu": $avgCpu,
                     "status": $avgCpu > `70` && 'high_load' || 'normal'
                   }
  }
]
```

### Variable Shadowing

Inner scopes can shadow variables from outer scopes:

```jmespath-interactive Variable Shadowing
{
  "data": {
    "global_value": "outer",
    "items": [
      {"local_value": "inner1", "data": "item1"},
      {"local_value": "inner2", "data": "item2"}
    ]
  }
}
---JMESPATH---
let $value = data.global_value
in {
  "outer_scope": $value,
  "shadowing_example": data.items[*].[
    let $value = local_value
    in {
      "inner_value": $value,
      "data": data,
      "nested_shadow": let $value = 'deeply_nested'
                      in $value
    }
  ]
}
```

## Practical Applications

### Data Transformation with Context

```jmespath-interactive Data Transformation
{
  "sales_report": {
    "quarter": "Q3-2023",
    "target": 1000000,
    "regions": [
      {
        "name": "North America",
        "sales": [
          {"month": "Jul", "amount": 120000},
          {"month": "Aug", "amount": 135000},
          {"month": "Sep", "amount": 145000}
        ]
      },
      {
        "name": "Europe",
        "sales": [
          {"month": "Jul", "amount": 80000},
          {"month": "Aug", "amount": 95000},
          {"month": "Sep", "amount": 110000}
        ]
      }
    ]
  }
}
---JMESPATH---
let $quarter = sales_report.quarter,
    $target = sales_report.target
in {
  "report_period": $quarter,
  "company_target": $target,
  "regional_performance": sales_report.regions[*].[
    let $regionName = name,
        $regionTotal = sum(sales[*].amount)
    in {
      "region": $regionName,
      "quarter": $quarter,
      "total_sales": $regionTotal,
      "target_percentage": $regionTotal / $target * `100`,
      "performance": $regionTotal >= $target,
      "monthly_breakdown": sales[*].{
        "month": month,
        "amount": amount,
        "region": $regionName,
        "quarter": $quarter
      }
    }
  ]
}
```

### API Response Processing

```jmespath-interactive API Processing
{
  "api_response": {
    "metadata": {
      "request_id": "req-12345",
      "timestamp": "2023-08-15T14:30:22Z",
      "version": "v2.1"
    },
    "data": {
      "users": [
        {
          "id": 1,
          "username": "alice",
          "profile": {
            "email": "alice@example.com",
            "roles": ["admin", "user"]
          },
          "activity": {
            "last_login": "2023-08-15T10:00:00Z",
            "login_count": 45
          }
        },
        {
          "id": 2,
          "username": "bob",
          "profile": {
            "email": "bob@example.com", 
            "roles": ["user"]
          },
          "activity": {
            "last_login": "2023-08-14T16:30:00Z",
            "login_count": 12
          }
        }
      ]
    }
  }
}
---JMESPATH---
let $requestId = api_response.metadata.request_id,
    $timestamp = api_response.metadata.timestamp
in {
  "response_metadata": {
    "request_id": $requestId,
    "processed_at": $timestamp
  },
  "processed_users": api_response.data.users[*].[
    let $userId = id,
        $username = username
    in {
      "user_id": $userId,
      "username": $username,
      "request_context": $requestId,
      "processed_at": $timestamp,
      "user_summary": {
        "email": profile.email,
        "is_admin": contains(profile.roles, 'admin'),
        "activity_score": activity.login_count,
        "recent_activity": activity.last_login
      }
    }
  ]
}
```

### Configuration Processing

```jmespath-interactive Configuration Processing
{
  "app_config": {
    "environment": "production",
    "database": {
      "host": "prod-db.example.com",
      "port": 5432,
      "ssl": true
    },
    "features": [
      {
        "name": "user_analytics",
        "enabled": true,
        "config": {
          "retention_days": 90,
          "sampling_rate": 0.1
        }
      },
      {
        "name": "advanced_search",
        "enabled": false,
        "config": {
          "index_refresh": 300,
          "cache_size": 1000
        }
      }
    ]
  }
}
---JMESPATH---
let $env = app_config.environment,
    $dbConfig = app_config.database
in {
  "deployment_config": {
    "environment": $env,
    "database_url": join(':', [$dbConfig.host, to_string($dbConfig.port)]),
    "ssl_enabled": $dbConfig.ssl
  },
  "feature_flags": app_config.features[*].[
    let $featureName = name,
        $isEnabled = enabled
    in {
      "feature": $featureName,
      "environment": $env,
      "enabled": $isEnabled,
      "config_key": join('_', [$env, $featureName, 'config']),
      "runtime_config": $isEnabled && config || null
    }
  ]
}
```

## Error Handling

### Undefined Variable Errors

Variables must be defined before use, or an `undefined-variable` error occurs:

```jmespath-interactive Error Examples
{
  "data": {"value": 42}
}
---JMESPATH---
{
  "valid_usage": let $val = data.value in $val,
  "scoped_correctly": let $temp = 'test' in [$temp, let $inner = 'inner' in $inner]
}
```

## Best Practices

1. **Use Descriptive Variable Names**: Choose clear, descriptive names for variables to improve readability.

2. **Minimize Scope**: Keep variable scope as narrow as possible to avoid confusion and potential shadowing issues.

3. **Leverage for Parent Access**: Use let expressions primarily when you need to access parent context or complex nested scenarios.

4. **Combine with Other Functions**: Let expressions work well with all JMESPath functions and can be combined for powerful transformations.

5. **Handle Projections Carefully**: Remember that binding a projection to a variable stops the projection - the variable contains the evaluated result.

## Syntax Reference

| Pattern | Description | Example |
|---------|-------------|---------|
| `let $var = expr in expr` | Basic variable binding | `let $name = user.name in $name` |
| `let $a = expr1, $b = expr2 in expr` | Multiple bindings | `let $x = foo, $y = bar in [$x, $y]` |
| `let $outer = expr in let $inner = expr in expr` | Nested scoping | Variable shadowing and nested access |
| `$variable` | Variable reference | Must be defined in current or parent scope |

Let expressions provide powerful lexical scoping capabilities that enable complex data transformations and solve the parent reference problem that was previously impossible in JMESPath.
