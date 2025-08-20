---
title: Discarding nulls
nav_label: Discarding nulls
nav_order: 2
---

# Discarding Null Values

## Problem Statement

Discarding ```null``` values is a frequently requested feature in JMESPath. While the canonical approach involves using the ```merge()``` function and relying on external deserializers, the ```items()```, ```from_items()```, and ```zip()``` functions provide primitives to achieve this filtering directly within JMESPath expressions.

## Basic Object Filtering

Let's work through practical examples of filtering null and empty values from objects.

```jmespath-interactive Basic Null Filtering
{
  "user_data": { "a": 1, "b": "", "c": null, "d": "valid", "e": 0 }
}
---JMESPATH---
{
  "remove_nulls": from_items(items(user_data)[?@[1]!=`null`]),
  "remove_empty_strings": from_items(items(user_data)[?@[1]!='']),
  "remove_falsy": from_items(items(user_data)[?@[1]]),
  "keep_only_strings": from_items(items(user_data)[?type(@[1])=='string' && @[1]!=''])
}
```

**Step-by-step breakdown:**

1. **`items(user_data)`** converts the object to key-value pairs:
   ```
   [["a",1], ["b",""], ["c",null], ["d","valid"], ["e",0]]
   ```

2. **Filter conditions:**
   - `[?@[1]!=null]` keeps: [["a",1], ["b",""], ["d","valid"], ["e",0]]
   - `[?@[1]!='']` keeps: [["a",1], ["c",null], ["d","valid"], ["e",0]]
   - `[?@[1]]` keeps only truthy values: [["a",1], ["d","valid"]]
   - `[?type(@[1])=='string' && @[1]!='']` keeps non-empty strings: [["d","valid"]]

3. **`from_items()`** converts the filtered arrays back to objects

## Nested Object Filtering

For complex scenarios with nested objects, we need to filter each nested object individually:

```jmespath-interactive Nested Object Filtering
{
  "user_profiles": {
    "alice": { "name": "Alice", "email": "", "phone": null, "age": 30 },
    "bob": { "name": "Bob", "email": "bob@example.com", "phone": "555-0123", "age": null },
    "charlie": { "name": "Charlie", "email": null, "phone": "", "age": 25 }
  }
}
---JMESPATH---
let $keys = keys(user_profiles),
    $filtered_values = values(user_profiles)[*].from_items(items(@)[?@[1]])
in from_items(zip($keys, $filtered_values))
```

**Complex filtering breakdown:**

1. **`keys(user_profiles)`** extracts top-level keys: ["alice", "bob", "charlie"]

2. **`values(user_profiles)[*]`** gets each nested object and applies the filtering:
   - For alice: `{ "name": "Alice", "age": 30 }` (removes empty email, null phone)
   - For bob: `{ "name": "Bob", "email": "bob@example.com", "phone": "555-0123" }` (removes null age)
   - For charlie: `{ "name": "Charlie", "age": 25 }` (removes null email, empty phone)

3. **`zip($keys, $filtered_values)`** creates key-value pairs: [["alice", {...}], ["bob", {...}], ["charlie", {...}]]

4. **`from_items()`** converts back to the final nested object structure

## Real-World Applications

```jmespath-interactive API Response Cleaning
{
  "api_response": {
    "user": { "id": 123, "name": "John", "email": null, "avatar": "", "verified": true },
    "settings": { "theme": "dark", "notifications": true, "beta_features": null, "language": "" },
    "metadata": { "created_at": "2023-01-01", "updated_at": null, "version": "1.0" }
  }
}
---JMESPATH---
let $clean_response = let $k = keys(api_response),
                          $v = values(api_response)[*].from_items(items(@)[?@[1] && @[1] != ''])
                      in from_items(zip($k, $v))
in $clean_response
```

This pattern is especially useful for:
- **API response cleaning**: Remove null/empty fields before sending to frontend
- **Database record preparation**: Filter out incomplete data before storage
- **Configuration validation**: Remove invalid or empty configuration values
- **Data export**: Clean datasets before generating reports or exports


