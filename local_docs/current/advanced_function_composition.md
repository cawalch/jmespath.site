---
title: Advanced Function Composition
nav_order: 3
---

# Advanced Function Composition

## Introduction

While JMESPath's built-in functions are powerful on their own, their true potential is unlocked when composed together to solve complex data transformation problems. This section explores advanced composition patterns that enable sophisticated data processing without requiring external code.

For developers with Node.js/TypeScript experience (as many JMESPath users are), these patterns will feel familiar as they mirror functional programming concepts common in modern JavaScript ecosystems.

## Chaining Transformations

The pipe operator (```|```) enables chaining multiple transformations together, creating a processing pipeline where the output of one function becomes the input to the next.

```jmespath-interactive Chaining Transformations
{
  "users": [
    {"name": "Alice", "email": "alice@example.com", "active": true},
    {"name": "Bob", "email": "bob@example.com", "active": false},
    {"name": "Charlie", "email": "charlie@example.com", "active": true}
  ]
}
---JMESPATH---
users[?active==`true`].{Name: name, Domain: split(email, '@')[1]} | sort_by(@, &Name)
```

**Pipeline breakdown:**
1. `users[?active==true]` filters to get Alice and Charlie (Bob is inactive)
2. `.{Name: name, Domain: split(email, '@')[1]}` transforms each user:
   - `Name: name` copies the name field
   - `Domain: split(email, '@')[1]` extracts domain from email (e.g., "example.com")
3. `| sort_by(@, &Name)` sorts the resulting array by the Name field
4. Final result: [{"Name": "Alice", "Domain": "example.com"}, {"Name": "Charlie", "Domain": "example.com"}]

The equivalent TypeScript implementation would be:

```typescript
interface User {
  name: string;
  email: string;
  active: boolean;
}

function processUsers(users: User[]): {Name: string, Domain: string}[] {
  return users
    .filter(user => user.active)
    .map(user => ({
      Name: user.name,
      Domain: user.email.split('@')[1]
    }))
    .sort((a, b) => a.Name.localeCompare(b.Name));
}
```

## Advanced Filtering Patterns

Building on the null filtering techniques discussed earlier, let's explore more sophisticated patterns.

### Conditional Filtering with Multiple Criteria

```jmespath-interactive Conditional Filtering
{
  "products": [
    {"id": 1, "name": "Laptop", "price": 1200, "stock": 5, "category": "electronics"},
    {"id": 2, "name": "Phone", "price": 800, "stock": 0, "category": "electronics"},
    {"id": 3, "name": "Table", "price": 300, "stock": 10, "category": "furniture"},
    {"id": 4, "name": "Chair", "price": 150, "stock": 2, "category": "furniture"}
  ]
}
---JMESPATH---
products[?price < `1000` && (stock > `0` || category == 'electronics')].{
  Name: name,
  Price: price,
  Status: (stock > `0` && (stock > `5` && 'In Stock' || 'Limited Availability')) || 'Out of Stock'
}
```

**Complex filtering logic explained:**
- **Filter condition**: `price < 1000 && (stock > 0 || category == 'electronics')`
  - Laptop ($1200): Excluded (price >= $1000)
  - Phone ($800, electronics, no stock): Included (under $1000 AND electronics)
  - Table ($300, 10 stock): Included (under $1000 AND in stock)
  - Chair ($150, 2 stock): Included (under $1000 AND in stock)
- **Status logic**: Nested conditional expressions determine availability:
  - If `stock > 0`: Check if `stock > 5` for "In Stock" vs "Limited Availability"
  - If `stock = 0`: Return "Out of Stock"

The TypeScript equivalent demonstrates how JMESPath's concise syntax abstracts complex logic:

```typescript
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
}

function filterProducts(products: Product[]) {
  return products
    .filter(p => p.price < 1000 && (p.stock > 0 || p.category === 'electronics'))
    .map(p => ({
      Name: p.name,
      Status: p.stock > 0 ? 'In Stock' : 'Limited Availability'
    }));
}
```

## Recursive Processing with Expressions

For deeply nested data structures, JMESPath's expression references (```&```) enable recursive-like processing patterns.

```jmespath-interactive Recursive Processing
{
  "organization": {
    "name": "Acme Corp",
    "departments": [
      {
        "name": "Engineering",
        "teams": [
          {"name": "Frontend", "members": 12},
          {"name": "Backend", "members": 8}
        ]
      },
      {
        "name": "Marketing",
        "teams": [
          {"name": "Content", "members": 5},
          {"name": "SEO", "members": 3}
        ]
      }
    ]
  }
}
---JMESPATH---
organization.departments[*].{Department: name, Total: sum(teams[*].members)} | sort_by(@, &Total) | reverse(@)
```

This expression:
1. For each department, calculates the total team members
2. Sorts departments by total members (descending)
3. Reverses the final result

## Security-Aware Processing

Given JMESPath's frequent use in API responses and data processing pipelines, security considerations are critical. When handling potentially sensitive data:

```jmespath-interactive Security-Aware Processing
{
  "users": [
    {
      "id": "usr_123",
      "name": "Alice Smith",
      "email": "alice@example.com",
      "ssn": "123-45-6789",
      "api_key": "sk_test_12345",
      "roles": ["admin", "billing"]
    },
    {
      "id": "usr_456",
      "name": "Bob Jones",
      "email": "bob@example.com",
      "ssn": "987-65-4321",
      "api_key": "sk_test_67890",
      "roles": ["user"]
    }
  ]
}
---JMESPATH---
users[].from_items(items(@)[?!contains(['ssn', 'api_key'], @[0])])
```

**What this security filtering accomplishes:**

1. **`users[]`** - Iterates through each user object in the array

2. **`items(@)`** - Converts each user object to key-value pairs:
   - Alice: `[["id", "usr_123"], ["name", "Alice Smith"], ["email", "alice@example.com"], ["ssn", "123-45-6789"], ["api_key", "sk_test_12345"], ["roles", ["admin", "billing"]]]`

3. **`[?!contains(['ssn', 'api_key'], @[0])]`** - Filters out sensitive fields:
   - `@[0]` refers to the key (first element of each pair)
   - `contains(['ssn', 'api_key'], @[0])` checks if the key is in the sensitive list
   - `!` negates the condition, keeping only non-sensitive fields
   - Result for Alice: `[["id", "usr_123"], ["name", "Alice Smith"], ["email", "alice@example.com"], ["roles", ["admin", "billing"]]]`

4. **`from_items(...)`** - Reconstructs clean objects without sensitive data

**Final sanitized result**:
```
[
  {"id": "usr_123", "name": "Alice Smith", "email": "alice@example.com", "roles": ["admin", "billing"]},
  {"id": "usr_456", "name": "Bob Jones", "email": "bob@example.com", "roles": ["user"]}
]
```

**Security benefits:**
- **Automatic PII removal**: Eliminates SSN and API keys from responses
- **Whitelist approach**: Only explicitly safe fields are included
- **Audit trail**: Clear visibility into what data is being filtered
- **Consistent sanitization**: Same logic applied to all user records

The TypeScript equivalent would require careful handling to avoid accidental data leakage:

```typescript
function sanitizeUser(user: any) {
  const safeFields = ['id', 'name', 'email', 'roles'];
  return Object.keys(user)
    .filter(key => safeFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = user[key];
      return obj;
    }, {} as Record<string, any>);
}

function sanitizeUsers(users: any[]) {
  return users.map(sanitizeUser);
}
```

## Performance Optimization

For large datasets, JMESPath expressions can be optimized by:

1. Filtering early in the pipeline
2. Avoiding unnecessary projections
3. Using appropriate functions for the task

```jmespath-interactive Performance Optimization
{
  "logs": [
    {"timestamp": "2023-01-01T08:00:00Z", "level": "info", "message": "System started"},
    {"timestamp": "2023-01-01T08:05:23Z", "level": "error", "message": "Database connection failed"},
    {"timestamp": "2023-01-01T08:10:45Z", "level": "warning", "message": "High memory usage"},
    {"timestamp": "2023-01-01T08:15:12Z", "level": "error", "message": "API timeout"}
  ]
}
---JMESPATH---
logs[?level=='error'] | sort_by(@, &timestamp) | [0]
```

This optimized expression:
- Filters for errors first (reducing the dataset size immediately)
- Projects only needed fields
- Sorts the smaller dataset
- Takes only the first result

The anti-pattern would be:

```
logs[*].{Time: timestamp, Message: message, Level: level} | sort_by(@, &Time) | [?Level==`error`] | [0]
```

Which processes all logs through every stage before filtering.

## Real-World API Processing

Here's a practical example of processing a GitHub API response:

```jmespath-interactive GitHub API Processing
{
  "items": [
    {
      "name": "jmespath.js",
      "owner": {"login": "jmespath"},
      "stargazers_count": 1500,
      "forks_count": 200,
      "language": "JavaScript",
      "updated_at": "2023-08-15T12:30:00Z"
    },
    {
      "name": "aws-sdk-js",
      "owner": {"login": "aws"},
      "stargazers_count": 8500,
      "forks_count": 2100,
      "language": "JavaScript",
      "updated_at": "2023-08-14T09:15:00Z"
    },
    {
      "name": "typescript",
      "owner": {"login": "microsoft"},
      "stargazers_count": 75000,
      "forks_count": 9500,
      "language": "TypeScript",
      "updated_at": "2023-08-15T14:20:00Z"
    }
  ]
}
---JMESPATH---
items[?language=='JavaScript']
  | sort_by(@, &stargazers_count)
  | reverse(@)
  | [].{
    Repo: join('/', [owner.login, name]),
    Stars: to_string(stargazers_count),
    Ratio: to_string(ceil(stargazers_count / forks_count))
  }
```

This expression:
1. Filters for JavaScript repositories
2. Creates a readable repository path
3. Converts numbers to strings for display
4. Calculates a stars-to-forks ratio
5. Sorts by star count (descending)

The equivalent TypeScript would be significantly more verbose, demonstrating JMESPath's value for quick data transformations.

## Next Steps

Now that you've seen advanced function composition techniques:

- Try implementing complex data transformations for your specific use cases
- Consider how these patterns can simplify your Node.js/TypeScript data processing pipelines

