---
title: Type Checking & Data Validation
nav_label: Type Checking & Validation
nav_order: 13
id: type-checking-validation
parent: core-concepts
---

# Type Checking & Data Validation

## Overview

Type checking and data validation are fundamental concepts in JMESPath that enable robust, defensive data processing. These techniques help you handle diverse data structures, validate input quality, and prevent errors by understanding and controlling the types of data you're working with.

JMESPath provides several built-in functions for type checking and validation:
- **Type Detection**: `type()` - Identify data types
- **Length Validation**: `length()` - Check sizes and counts
- **Type Conversion**: `to_string()`, `to_number()`, `to_array()` - Convert between types
- **Null Handling**: `not_null()` - Handle missing or null values

## Type Detection with type()

The `type()` function returns the JavaScript type of any value as a string.

```javascript
string type(any $value)
```

### Basic Type Detection

```jmespath-interactive Type Detection
{
  "mixed_data": {
    "user_id": 12345,
    "username": "alice_smith",
    "is_active": true,
    "profile": {"email": "alice@example.com", "age": 30},
    "tags": ["admin", "premium"],
    "last_login": null,
    "score": 95.5
  }
}
---JMESPATH---
{
  "type_analysis": {
    "user_id_type": type(mixed_data.user_id),
    "username_type": type(mixed_data.username),
    "is_active_type": type(mixed_data.is_active),
    "profile_type": type(mixed_data.profile),
    "tags_type": type(mixed_data.tags),
    "last_login_type": type(mixed_data.last_login),
    "score_type": type(mixed_data.score)
  },
  "validation_results": {
    "has_valid_user_id": type(mixed_data.user_id) == 'number',
    "has_string_username": type(mixed_data.username) == 'string',
    "has_array_tags": type(mixed_data.tags) == 'array',
    "has_object_profile": type(mixed_data.profile) == 'object'
  }
}
```

### Conditional Processing Based on Type

```jmespath-interactive Type-Based Processing
{
  "api_responses": [
    {"id": 1, "data": {"name": "Alice", "age": 30}},
    {"id": 2, "data": "Error: User not found"},
    {"id": 3, "data": ["item1", "item2", "item3"]},
    {"id": 4, "data": null},
    {"id": 5, "data": 42}
  ]
}
---JMESPATH---
{
  "processed_responses": api_responses[*].{
    "id": id,
    "data_type": type(data),
    "is_object": type(data) == 'object',
    "is_error": type(data) == 'string',
    "is_array": type(data) == 'array',
    "is_null": type(data) == 'null',
    "processed_data": type(data) == 'object' && data || 
                     type(data) == 'string' && {"error": data} ||
                     type(data) == 'array' && {"items": data} ||
                     {"raw_value": data}
  },
  "summary": {
    "object_responses": length(api_responses[?type(data) == 'object']),
    "error_responses": length(api_responses[?type(data) == 'string']),
    "array_responses": length(api_responses[?type(data) == 'array']),
    "null_responses": length(api_responses[?type(data) == 'null'])
  }
}
```

## Length Validation

The `length()` function returns the size of strings, arrays, and objects.

```javascript
number length(string|array|object $value)
```

### Data Size Validation

```jmespath-interactive Length Validation
{
  "user_submissions": [
    {"username": "alice", "password": "secret123", "tags": ["user", "premium"], "bio": "Software engineer"},
    {"username": "b", "password": "12", "tags": [], "bio": ""},
    {"username": "charlie_the_developer", "password": "super_secure_password_2023", "tags": ["admin", "developer", "senior"], "bio": "Full-stack developer with 10 years experience"},
    {"username": "diana", "password": "password", "tags": ["user"], "bio": null}
  ]
}
---JMESPATH---
{
  "validation_results": user_submissions[*].{
    "username": username,
    "validations": {
      "username_length": length(username),
      "password_length": length(password),
      "tags_count": length(tags),
      "bio_length": type(bio) == 'string' && length(bio) || `0`,
      "username_valid": length(username) >= `3` && length(username) <= `20`,
      "password_strong": length(password) >= `8`,
      "has_tags": length(tags) > `0`,
      "bio_provided": type(bio) == 'string' && length(bio) > `0`
    },
    "overall_valid": length(username) >= `3` && length(username) <= `20` &&
                    length(password) >= `8` &&
                    length(tags) > `0`
  },
  "summary": {
    "total_submissions": length(user_submissions),
    "valid_usernames": length(user_submissions[?length(username) >= `3` && length(username) <= `20`]),
    "strong_passwords": length(user_submissions[?length(password) >= `8`]),
    "users_with_tags": length(user_submissions[?length(tags) > `0`]),
    "users_with_bio": length(user_submissions[?type(bio) == 'string' && length(bio) > `0`])
  }
}
```

## Type Conversion Functions

Convert between different data types safely and predictably.

### String Conversion

```jmespath-interactive String Conversion
{
  "mixed_values": {
    "number": 42,
    "boolean": true,
    "array": [1, 2, 3],
    "object": {"key": "value"},
    "null_value": null,
    "existing_string": "hello"
  }
}
---JMESPATH---
{
  "string_conversions": {
    "number_to_string": to_string(mixed_values.number),
    "boolean_to_string": to_string(mixed_values.boolean),
    "array_to_string": to_string(mixed_values.array),
    "object_to_string": to_string(mixed_values.object),
    "null_to_string": to_string(mixed_values.null_value),
    "string_unchanged": to_string(mixed_values.existing_string)
  },
  "type_verification": {
    "all_strings": type(to_string(mixed_values.number)) == 'string' &&
                   type(to_string(mixed_values.boolean)) == 'string' &&
                   type(to_string(mixed_values.array)) == 'string'
  }
}
```

### Number Conversion and Validation

```jmespath-interactive Number Conversion
{
  "input_data": {
    "valid_numbers": ["123", "45.67", "0", "-89"],
    "invalid_numbers": ["abc", "12.34.56", "", "not_a_number"],
    "mixed_array": ["100", 200, "300.5", "invalid", null, true]
  }
}
---JMESPATH---
{
  "number_processing": {
    "converted_valid": input_data.valid_numbers[*].to_number(@),
    "converted_invalid": input_data.invalid_numbers[*].to_number(@),
    "filtered_valid_numbers": input_data.mixed_array[*].to_number(@)[?@ != null],
    "validation_results": input_data.mixed_array[*].{
      "original": @,
      "original_type": type(@),
      "converted": to_number(@),
      "is_valid_number": to_number(@) != null,
      "final_value": to_number(@) != null && to_number(@) || `0`
    }
  },
  "statistics": {
    "total_inputs": length(input_data.mixed_array),
    "valid_conversions": length(input_data.mixed_array[*].to_number(@)[?@ != null]),
    "conversion_success_rate": length(input_data.mixed_array[*].to_number(@)[?@ != null]) * `100` / length(input_data.mixed_array)
  }
}
```

### Array Conversion and Normalization

```jmespath-interactive Array Conversion
{
  "diverse_data": {
    "single_values": [42, "hello", true, null],
    "existing_array": [1, 2, 3],
    "object_value": {"name": "Alice", "age": 30},
    "nested_structure": {
      "items": ["a", "b"],
      "count": 5,
      "active": true
    }
  }
}
---JMESPATH---
{
  "array_conversions": {
    "single_to_arrays": diverse_data.single_values[*].to_array(@),
    "array_unchanged": to_array(diverse_data.existing_array),
    "object_to_array": to_array(diverse_data.object_value),
    "normalize_all": [
      to_array(diverse_data.nested_structure.items),
      to_array(diverse_data.nested_structure.count),
      to_array(diverse_data.nested_structure.active)
    ]
  },
  "practical_usage": {
    "ensure_arrays": diverse_data.single_values[*].{
      "original": @,
      "as_array": to_array(@),
      "array_length": length(to_array(@)),
      "first_element": to_array(@)[0]
    }
  }
}
```

## Error Handling with not_null()

The `not_null()` function returns the first non-null argument, providing fallback values.

```javascript
any not_null(any $arg1[, any $arg2, ...])
```

### Defensive Data Access

```jmespath-interactive Null Handling
{
  "user_profiles": [
    {"name": "Alice", "email": "alice@example.com", "phone": "555-1234"},
    {"name": "Bob", "email": null, "phone": "555-5678", "backup_email": "bob.backup@example.com"},
    {"name": "Charlie", "phone": null, "backup_phone": "555-9999"},
    {"name": "Diana", "email": "", "phone": "", "backup_email": "diana@example.com"}
  ]
}
---JMESPATH---
{
  "safe_contact_info": user_profiles[*].{
    "name": name,
    "primary_email": not_null(email, backup_email, "no-email@example.com"),
    "primary_phone": not_null(phone, backup_phone, "000-000-0000"),
    "has_email": not_null(email, backup_email) != null,
    "has_phone": not_null(phone, backup_phone) != null,
    "contact_methods": length([not_null(email, backup_email), not_null(phone, backup_phone)][?@ != null])
  },
  "contact_summary": {
    "users_with_email": length(user_profiles[?not_null(email, backup_email) != null]),
    "users_with_phone": length(user_profiles[?not_null(phone, backup_phone) != null]),
    "fully_contactable": length(user_profiles[?not_null(email, backup_email) != null && not_null(phone, backup_phone) != null])
  }
}
```

## Real-World Validation Patterns

### API Response Validation

```jmespath-interactive API Validation
{
  "api_data": [
    {"user_id": 123, "username": "alice", "profile": {"age": 30, "city": "Seattle"}, "permissions": ["read", "write"]},
    {"user_id": "invalid", "username": "", "profile": null, "permissions": []},
    {"user_id": 456, "username": "bob", "profile": {"age": "unknown", "city": ""}, "permissions": "admin"},
    {"username": "charlie", "profile": {"age": 25}, "permissions": ["read"]},
    {"user_id": 789, "username": "diana", "profile": {"age": 35, "city": "Portland"}, "permissions": ["read", "write", "admin"]}
  ]
}
---JMESPATH---
{
  "validation_report": api_data[*].{
    "original_data": @,
    "validations": {
      "has_user_id": user_id != null,
      "user_id_is_number": type(user_id) == 'number',
      "has_username": username != null && username != '',
      "username_length_ok": type(username) == 'string' && length(username) >= `3`,
      "has_profile": type(profile) == 'object',
      "profile_has_age": type(profile) == 'object' && type(profile.age) == 'number',
      "has_permissions": type(permissions) == 'array' && length(permissions) > `0`
    },
    "is_valid": user_id != null && type(user_id) == 'number' &&
                username != null && username != '' && length(username) >= `3` &&
                type(profile) == 'object' && type(profile.age) == 'number' &&
                type(permissions) == 'array' && length(permissions) > `0`
  },
  "summary": {
    "total_records": length(api_data),
    "valid_records": length(api_data[?user_id != null && type(user_id) == 'number' && username != null && username != '' && length(username) >= `3`]),
    "records_with_profile": length(api_data[?type(profile) == 'object']),
    "records_with_permissions": length(api_data[?type(permissions) == 'array' && length(permissions) > `0`])
  }
}
```

### Configuration Validation

```jmespath-interactive Config Validation
{
  "app_configs": [
    {"database": {"host": "localhost", "port": 5432, "ssl": true}, "cache": {"ttl": 3600, "size": 1000}},
    {"database": {"host": "", "port": "invalid", "ssl": "yes"}, "cache": {"ttl": -1}},
    {"database": {"host": "prod-db.com", "port": 5432}, "cache": null},
    {"database": null, "cache": {"ttl": 7200, "size": 2000, "enabled": true}}
  ]
}
---JMESPATH---
{
  "config_validation": app_configs[*].{
    "database_valid": type(database) == 'object' &&
                     type(database.host) == 'string' && length(database.host) > `0` &&
                     type(database.port) == 'number' && database.port > `0`,
    "cache_valid": type(cache) == 'object' &&
                  type(cache.ttl) == 'number' && cache.ttl > `0`,
    "safe_database": type(database) == 'object' && {
      "host": not_null(database.host, "localhost"),
      "port": type(database.port) == 'number' && database.port || `5432`,
      "ssl": type(database.ssl) == 'boolean' && database.ssl || false
    } || {"host": "localhost", "port": `5432`, "ssl": false},
    "safe_cache": type(cache) == 'object' && {
      "ttl": type(cache.ttl) == 'number' && cache.ttl > `0` && cache.ttl || `3600`,
      "size": type(cache.size) == 'number' && cache.size > `0` && cache.size || `1000`,
      "enabled": type(cache.enabled) == 'boolean' && cache.enabled || true
    } || {"ttl": `3600`, "size": `1000`, "enabled": true}
  }
}
```

## Best Practices

1. **Always Validate Input Types**: Use `type()` to check data types before processing
2. **Provide Fallback Values**: Use `not_null()` and conditional expressions for robust defaults
3. **Validate Lengths**: Check string, array, and object sizes to prevent processing errors
4. **Convert Types Safely**: Use conversion functions and check for null results
5. **Combine Validations**: Use boolean logic to create comprehensive validation rules
6. **Document Expectations**: Make validation logic clear and maintainable

## Function Reference Summary

| Function | Purpose | Returns |
|----------|---------|---------|
| `type(value)` | Get data type | `"string"`, `"number"`, `"boolean"`, `"array"`, `"object"`, `"null"` |
| `length(value)` | Get size/count | Number of characters, elements, or properties |
| `to_string(value)` | Convert to string | String representation or original string |
| `to_number(value)` | Convert to number | Parsed number or `null` if invalid |
| `to_array(value)` | Convert to array | Single-element array or original array |
| `not_null(arg1, ...)` | First non-null value | First argument that isn't `null` |

Type checking and validation form the foundation of robust JMESPath queries, enabling you to handle diverse data safely and predictably while providing meaningful fallbacks for missing or invalid data.
