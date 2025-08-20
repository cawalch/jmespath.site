---
title: String Functions Deep Dive
nav_label: String Functions
nav_order: 6
---

# String Functions Deep Dive

## Overview

JMESPath provides a comprehensive set of string manipulation functions that enable powerful text processing directly within your queries. These functions are modeled after similar functions found in popular programming languages like JavaScript and Python, making them intuitive for developers.

String functions in JMESPath can be categorized into several groups:
- **Text transformation**: `upper()`, `lower()`
- **String splitting and joining**: `split()`, `join()`
- **String searching**: `contains()`, `starts_with()`, `ends_with()`, `find_first()`, `find_last()`
- **String modification**: `replace()`, `trim()`, `trim_left()`, `trim_right()`
- **String padding**: `pad_left()`, `pad_right()`

## Text Transformation Functions

### upper() and lower()

Convert strings to uppercase or lowercase using Unicode default casing conversion.

```
string upper(string $subject)
string lower(string $subject)
```

```jmespath-interactive Case Conversion
{
  "user_data": {
    "firstName": "John",
    "lastName": "DOE",
    "email": "John.Doe@EXAMPLE.COM"
  }
}
---JMESPATH---
{
  "display_name": join(' ', [upper(user_data.firstName), lower(user_data.lastName)]),
  "normalized_email": lower(user_data.email),
  "initials": join('', [upper(user_data.firstName[:1]), upper(user_data.lastName[:1])])
}
```

**Step-by-step breakdown:**
- `upper(user_data.firstName)` converts "John" to "JOHN"
- `lower(user_data.lastName)` converts "DOE" to "doe"
- `join(' ', [...])` combines them with a space: "JOHN doe"
- `lower(user_data.email)` normalizes the email to "john.doe@example.com"
- `user_data.firstName[:1]` extracts the first character "J", then `upper()` ensures it's uppercase
- The initials example combines string slicing with case conversion to create "JD"

### Real-World Text Processing

```jmespath-interactive Text Normalization
{
  "products": [
    {"name": "laptop computer", "category": "ELECTRONICS"},
    {"name": "OFFICE CHAIR", "category": "furniture"},
    {"name": "Wireless Mouse", "category": "Electronics"}
  ]
}
---JMESPATH---
products[*].{
  name: join(' ', split(lower(name), ' ')[*].{word: join('', [upper(@[:1]), @[1:]])}[].word),
  category: lower(category)
}
```

This example demonstrates title-case conversion by splitting words, capitalizing the first letter, and rejoining them.

## String Splitting and Joining

### split()

Breaks a string into an array based on a delimiter.

```
array[string] split(string $subject, string $search[, number $count])
```

The optional `$count` parameter limits the number of splits performed.

```jmespath-interactive Basic String Splitting
{
  "log_entry": "2023-08-15 14:30:22 ERROR Database connection failed",
  "csv_data": "name,age,city,country",
  "file_path": "/home/user/documents/report.pdf"
}
---JMESPATH---
{
  "log_parts": split(log_entry, ' '),
  "csv_headers": split(csv_data, ','),
  "path_segments": split(file_path, '/')[1:],
  "limited_split": split(log_entry, ' ', `3`)
}
```

**Understanding the split operations:**
- `split(log_entry, ' ')` splits on spaces: ["2023-08-15", "14:30:22", "ERROR", "Database", "connection", "failed"]
- `split(csv_data, ',')` splits on commas: ["name", "age", "city", "country"]
- `split(file_path, '/')[1:]` splits on slashes, then removes the first empty element: ["home", "user", "documents", "report.pdf"]
- `split(log_entry, ' ', 3)` limits to 3 splits: ["2023-08-15", "14:30:22", "ERROR", "Database connection failed"]

### Advanced Splitting Patterns

```jmespath-interactive Complex Splitting
{
  "data_string": "user:john|role:admin|dept:engineering|level:senior",
  "email_list": "alice@company.com;bob@company.com;charlie@company.com",
  "version_string": "v2.1.3-beta.1"
}
---JMESPATH---
{
  "user_attributes": split(data_string, '|')[*].{
    key: split(@, ':')[0],
    value: split(@, ':')[1]
  },
  "email_domains": split(email_list, ';')[*].split(@, '@')[1],
  "version_parts": {
    "major": split(split(version_string, '-')[0], '.')[0][1:],
    "minor": split(split(version_string, '-')[0], '.')[1],
    "patch": split(split(version_string, '-')[0], '.')[2],
    "prerelease": split(version_string, '-')[1]
  }
}
```

### join()

Combines an array of strings into a single string using a separator.

```
string join(string $glue, array[string] $stringsarray)
```

```jmespath-interactive String Joining
{
  "user": {
    "firstName": "Jane",
    "middleName": "Marie",
    "lastName": "Smith"
  },
  "tags": ["javascript", "react", "frontend", "web-development"],
  "path_parts": ["api", "v1", "users", "123", "profile"]
}
---JMESPATH---
{
  "full_name": join(' ', [user.firstName, user.middleName, user.lastName]),
  "tag_string": join(', ', tags),
  "api_endpoint": join('', ['/', join('/', path_parts)]),
  "breadcrumb": join(' > ', path_parts)
}
```

## String Searching Functions

### contains()

Checks if a string contains a substring (already covered in basic examples).

### starts_with() and ends_with()

Check if a string starts or ends with a specific substring.

```
boolean starts_with(string $subject, string $prefix)
boolean ends_with(string $subject, string $suffix)
```

```jmespath-interactive String Pattern Matching
{
  "files": [
    "document.pdf",
    "image.jpg",
    "script.js",
    "style.css",
    "data.json",
    "backup_2023.sql"
  ],
  "urls": [
    "https://api.example.com/users",
    "http://legacy.example.com/data",
    "ftp://files.example.com/uploads"
  ]
}
---JMESPATH---
{
  "image_files": files[?ends_with(@, '.jpg') || ends_with(@, '.png') || ends_with(@, '.gif')],
  "web_files": files[?ends_with(@, '.js') || ends_with(@, '.css') || ends_with(@, '.html')],
  "secure_urls": urls[?starts_with(@, 'https://')],
  "backup_files": files[?starts_with(@, 'backup_')]
}
```

### find_first() and find_last()

Find the position of substrings within a string.

```
number find_first(string $subject, string $sub[, number $start[, number $end]])
number find_last(string $subject, string $sub[, number $start[, number $end]])
```

```jmespath-interactive String Position Finding
{
  "text": "The quick brown fox jumps over the lazy dog",
  "code": "function calculateTotal(items) { return items.reduce((sum, item) => sum + item.price, 0); }"
}
---JMESPATH---
{
  "first_the": find_first(text, 'the'),
  "last_the": find_last(text, 'the'),
  "first_o": find_first(text, 'o'),
  "last_o": find_last(text, 'o'),
  "function_start": find_first(code, 'function'),
  "paren_positions": {
    "first": find_first(code, '('),
    "last": find_last(code, ')')
  }
}
```

## String Modification Functions

### replace()

Replace occurrences of a substring with another string.

```
string replace(string $subject, string $old, string $new[, number $count])
```

```jmespath-interactive String Replacement
{
  "template": "Hello {{name}}, welcome to {{company}}! Your role is {{role}}.",
  "messy_data": "  extra   spaces    everywhere  ",
  "file_content": "// TODO: Fix this\n// TODO: Add validation\n// FIXME: Handle edge case"
}
---JMESPATH---
{
  "personalized": replace(replace(replace(template, '{{name}}', 'Alice'), '{{company}}', 'TechCorp'), '{{role}}', 'Developer'),
  "cleaned_spaces": replace(replace(messy_data, '  ', ' '), '  ', ' '),
  "updated_comments": replace(replace(file_content, '// TODO:', '// DONE:'), '// FIXME:', '// FIXED:'),
  "first_todo_only": replace(file_content, '// TODO:', '// DONE:', `1`)
}
```

### Trimming Functions

Remove whitespace or specific characters from strings.

```
string trim(string $subject[, string $chars])
string trim_left(string $subject[, string $chars])
string trim_right(string $subject[, string $chars])
```

```jmespath-interactive String Trimming
{
  "user_input": "   john.doe@example.com   ",
  "csv_row": "  Alice  ,  30  ,  Engineer  ",
  "quoted_string": "\"'Hello World'\"",
  "file_extension": "...document.pdf..."
}
---JMESPATH---
{
  "clean_email": trim(user_input),
  "csv_fields": split(csv_row, ',')[*].trim(@),
  "unquoted": trim(quoted_string, '\"\''),
  "clean_filename": trim(file_extension, '.'),
  "left_trimmed": trim_left(user_input),
  "right_trimmed": trim_right(user_input)
}
```

## String Padding Functions

Add characters to the beginning or end of strings to reach a desired length.

```
string pad_left(string $subject, number $width[, string $pad])
string pad_right(string $subject, number $width[, string $pad])
```

```jmespath-interactive String Padding
{
  "numbers": [1, 42, 123, 1000],
  "names": ["Alice", "Bob", "Christopher"],
  "codes": ["A1", "B22", "C333"]
}
---JMESPATH---
{
  "numbers_as_strings": numbers[*].to_string(@),
  "name_lengths": names[*].length(@),
  "codes_info": codes[*].{
    "code": @,
    "length": length(@)
  }
}
```

## Practical Text Processing Examples

### Log Processing

```jmespath-interactive Log Analysis
{
  "log_entries": [
    "2023-08-15 14:30:22 [ERROR] Database connection timeout in UserService.authenticate()",
    "2023-08-15 14:30:25 [WARN] High memory usage detected: 85%",
    "2023-08-15 14:30:28 [INFO] User login successful: user_id=12345",
    "2023-08-15 14:30:30 [ERROR] API rate limit exceeded for client 192.168.1.100"
  ]
}
---JMESPATH---
log_entries[*].{
  "timestamp": join(' ', split(@, ' ')[:2]),
  "level_part": split(@, '[')[1],
  "message_part": split(@, '] ')[1],
  "full_entry": @,
  "has_service": contains(@, 'Service')
}
```

### Data Cleaning and Validation

```jmespath-interactive Data Validation
{
  "user_registrations": [
    {"email": "  ALICE@EXAMPLE.COM  ", "phone": "+1-555-123-4567", "name": "alice smith"},
    {"email": "bob@company.org", "phone": "555.987.6543", "name": "Bob Johnson"},
    {"email": "charlie@test.co.uk", "phone": "(555) 111-2222", "name": "Charlie Brown"}
  ]
}
---JMESPATH---
user_registrations[*].{
  "email": lower(email),
  "phone": phone,
  "name": name,
  "email_parts": split(lower(email), '@'),
  "name_parts": split(name, ' '),
  "phone_cleaned": phone
}
```

### Template Processing

```jmespath-interactive Template Engine
{
  "template": "Dear {{customer.name}}, your order #{{order.id}} for {{order.total}} has been {{order.status}}.",
  "data": {
    "customer": {"name": "John Doe"},
    "order": {"id": "ORD-12345", "total": "$299.99", "status": "shipped"}
  }
}
---JMESPATH---
{
  "rendered": replace(
    replace(
      replace(
        replace(template, '{{customer.name}}', data.customer.name),
        '{{order.id}}', data.order.id
      ),
      '{{order.total}}', data.order.total
    ),
    '{{order.status}}', data.order.status
  ),
  "variables_found": split(template, '{{')[1:][*].split(@, '}}')[0]
}
```

### URL and Path Processing

```jmespath-interactive URL Processing
{
  "urls": [
    "https://api.example.com/v1/users/123?include=profile&format=json",
    "http://legacy.site.org/data/reports/2023/summary.html",
    "ftp://files.company.net/uploads/documents/contract.pdf"
  ]
}
---JMESPATH---
urls[*].{
  "protocol": split(@, '://')[0],
  "domain": split(split(@, '://')[1], '/')[0],
  "path_parts": split(split(@, '://')[1], '/')[1:],
  "filename": split(@, '/')[-1],
  "url_parts": split(@, '/'),
  "has_query": contains(@, '?'),
  "full_url": @
}
```

## Best Practices

1. **Chain Functions Efficiently**: Combine multiple string functions to perform complex transformations in a single expression.

2. **Handle Edge Cases**: Always consider empty strings, null values, and unexpected input when designing string processing expressions.

3. **Use Appropriate Functions**: Choose the right function for the task - `contains()` for searching, `starts_with()`/`ends_with()` for pattern matching, `split()`/`join()` for array operations.

4. **Validate Input Types**: String functions expect string inputs and will raise `invalid-type` errors for other types. Use `to_string()` when necessary.

5. **Consider Performance**: For large datasets, filter early in your pipeline before applying expensive string operations.

6. **Leverage Optional Parameters**: Use optional parameters like `count` in `split()` and `replace()` to control function behavior precisely.

## Error Handling

String functions can produce several types of errors:

- **invalid-type**: When non-string arguments are passed to functions expecting strings
- **invalid-value**: When numeric parameters (like `count` or `width`) are negative or not integers
- **invalid-arity**: When the wrong number of arguments is provided

```jmespath-interactive Error Examples
{
  "data": {
    "text": "hello world",
    "number": 42,
    "array": ["a", "b", "c"]
  }
}
---JMESPATH---
{
  "valid_operation": upper(data.text),
  "type_conversion": upper(to_string(data.number)),
  "array_join": join(' ', data.array)
}
```

## Function Reference Summary

| Function | Syntax | Purpose |
|----------|--------|---------|
| `upper(string)` | `string upper(string $subject)` | Convert to uppercase |
| `lower(string)` | `string lower(string $subject)` | Convert to lowercase |
| `split(string, string[, number])` | `array[string] split(string $subject, string $search[, number $count])` | Split string into array |
| `join(string, array[string])` | `string join(string $glue, array[string] $stringsarray)` | Join array into string |
| `contains(string, string)` | `boolean contains(string $subject, string $search)` | Check if string contains substring |
| `starts_with(string, string)` | `boolean starts_with(string $subject, string $prefix)` | Check if string starts with prefix |
| `ends_with(string, string)` | `boolean ends_with(string $subject, string $suffix)` | Check if string ends with suffix |
| `find_first(string, string[, number[, number]])` | `number find_first(string $subject, string $sub[, number $start[, number $end]])` | Find first occurrence position |
| `find_last(string, string[, number[, number]])` | `number find_last(string $subject, string $sub[, number $start[, number $end]])` | Find last occurrence position |
| `replace(string, string, string[, number])` | `string replace(string $subject, string $old, string $new[, number $count])` | Replace substring occurrences |
| `trim(string[, string])` | `string trim(string $subject[, string $chars])` | Remove leading/trailing characters |
| `trim_left(string[, string])` | `string trim_left(string $subject[, string $chars])` | Remove leading characters |
| `trim_right(string[, string])` | `string trim_right(string $subject[, string $chars])` | Remove trailing characters |
| `pad_left(string, number[, string])` | `string pad_left(string $subject, number $width[, string $pad])` | Pad string on the left |
| `pad_right(string, number[, string])` | `string pad_right(string $subject, number $width[, string $pad])` | Pad string on the right |

String functions are essential tools for text processing in JMESPath, enabling sophisticated data transformation and analysis directly within your queries. By mastering these functions, you can handle complex text manipulation tasks without requiring external processing.
