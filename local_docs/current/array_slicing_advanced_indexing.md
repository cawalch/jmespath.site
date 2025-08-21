---
title: Array Slicing & Advanced Indexing
nav_label: Array Slicing & Indexing
nav_order: 20
id: array-slicing
parent: data-operations
---

# Array Slicing & Advanced Indexing

## Overview

JMESPath provides powerful array slicing capabilities that allow you to extract specific portions of arrays and strings using Python-style slice notation. Combined with advanced indexing techniques, these features enable sophisticated data manipulation and extraction patterns.

Array slicing follows the general form `[start:stop:step]` where:
- **start**: The starting index (inclusive)
- **stop**: The ending index (exclusive) 
- **step**: The increment between elements

All three components are optional, and negative values are supported for reverse operations.

## Basic Array Slicing

### Simple Range Selection

```jmespath-interactive Basic Array Slicing
{
  "numbers": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  "colors": ["red", "green", "blue", "yellow", "purple", "orange"],
  "data": [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"},
    {"id": 3, "name": "Charlie"},
    {"id": 4, "name": "Diana"},
    {"id": 5, "name": "Eve"}
  ]
}
---JMESPATH---
{
  "first_five": numbers[0:5],
  "last_three": numbers[7:10],
  "middle_colors": colors[1:4],
  "first_two_users": data[0:2],
  "skip_first": numbers[1:],
  "all_but_last": numbers[:-1]
}
```

**What's happening here:**
- `numbers[0:5]` extracts elements at indices 0, 1, 2, 3, 4 (start inclusive, stop exclusive)
- `numbers[7:10]` gets the last three numbers: elements at indices 7, 8, 9
- `colors[1:4]` selects "green", "blue", "yellow" (skipping the first color)
- `data[0:2]` returns the first two user objects from the array
- `numbers[1:]` omits the stop value, so it takes everything from index 1 to the end
- `numbers[:-1]` uses negative indexing to exclude the last element

### Omitting Start and Stop Values

When start or stop values are omitted, they default to the beginning or end of the array:

```jmespath-interactive Omitted Boundaries
{
  "items": ["a", "b", "c", "d", "e", "f", "g", "h"]
}
---JMESPATH---
{
  "from_start": items[:4],
  "to_end": items[3:],
  "entire_array": items[:],
  "last_three": items[-3:],
  "all_but_first_two": items[2:]
}
```

**Understanding the shortcuts:**
- `items[:4]` is equivalent to `items[0:4]` - takes first 4 elements ("a", "b", "c", "d")
- `items[3:]` is equivalent to `items[3:8]` - takes from index 3 to end ("d", "e", "f", "g", "h")
- `items[:]` copies the entire array - useful for creating a shallow copy
- `items[-3:]` takes the last 3 elements using negative indexing ("f", "g", "h")
- `items[2:]` skips the first 2 elements and takes the rest ("c", "d", "e", "f", "g", "h")

## Step Values and Patterns

### Extracting Every Nth Element

```jmespath-interactive Step Patterns
{
  "sequence": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  "alphabet": ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"]
}
---JMESPATH---
{
  "every_second": sequence[::2],
  "every_third": sequence[::3],
  "even_indices": sequence[0::2],
  "odd_indices": sequence[1::2],
  "every_fourth_letter": alphabet[::4],
  "middle_every_second": sequence[2:10:2]
}
```

**Step patterns explained:**
- `sequence[::2]` starts at beginning, no end limit, step by 2: [0, 2, 4, 6, 8, 10, 12, 14]
- `sequence[::3]` takes every third element: [0, 3, 6, 9, 12, 15]
- `sequence[0::2]` explicitly starts at index 0, step by 2 (same as `[::2]`)
- `sequence[1::2]` starts at index 1, step by 2: [1, 3, 5, 7, 9, 11, 13, 15]
- `alphabet[::4]` takes every fourth letter: ["a", "e", "i"]
- `sequence[2:10:2]` starts at index 2, stops before index 10, step by 2: [2, 4, 6, 8]

### Reverse Operations

```jmespath-interactive Reverse Slicing
{
  "original": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "words": ["first", "second", "third", "fourth", "fifth"]
}
---JMESPATH---
{
  "reversed": original[::-1],
  "last_five_reversed": original[-5::-1],
  "every_second_reversed": original[::-2],
  "middle_reversed": original[7:2:-1],
  "words_reversed": words[::-1]
}
```

## Negative Indexing

Negative indices count from the end of the array, with -1 being the last element:

```jmespath-interactive Negative Indexing
{
  "logs": [
    {"time": "09:00", "level": "INFO", "message": "System started"},
    {"time": "09:15", "level": "WARN", "message": "High memory usage"},
    {"time": "09:30", "level": "ERROR", "message": "Database timeout"},
    {"time": "09:45", "level": "INFO", "message": "System recovered"},
    {"time": "10:00", "level": "INFO", "message": "Backup completed"}
  ]
}
---JMESPATH---
{
  "last_entry": logs[-1],
  "second_to_last": logs[-2],
  "last_three": logs[-3:],
  "all_but_last_two": logs[:-2],
  "recent_errors": logs[-4:-1][?level=='ERROR']
}
```

## String Slicing

JMESPath also supports slicing strings, treating them as arrays of characters:

```jmespath-interactive String Slicing
{
  "text": "Hello, World!",
  "filename": "document.pdf",
  "url": "https://api.example.com/v1/users",
  "code": "function calculateTotal() { return sum; }"
}
---JMESPATH---
{
  "first_five_chars": text[0:5],
  "last_six_chars": text[-6:],
  "every_second_char": text[::2],
  "reversed_text": text[::-1],
  "file_extension": filename[-3:],
  "domain": url[8:19],
  "function_name": code[9:22]
}
```

### Advanced String Manipulation

```jmespath-interactive Advanced String Slicing
{
  "email": "user.name@company.com",
  "path": "/home/user/documents/file.txt",
  "version": "v2.1.3-beta.1",
  "timestamp": "2023-08-15T14:30:22Z"
}
---JMESPATH---
{
  "email_parts": split(email, '@'),
  "path_parts": split(path, '/'),
  "version_parts": split(version, '.'),
  "date_part": timestamp[:10],
  "time_part": timestamp[11:19],
  "email_full": email,
  "path_full": path
}
```

## Complex Slicing Patterns

### Multi-dimensional Array Processing

```jmespath-interactive Multi-dimensional Slicing
{
  "matrix": [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16]
  ],
  "table": [
    {"name": "Alice", "scores": [85, 92, 78, 95]},
    {"name": "Bob", "scores": [78, 85, 88, 82]},
    {"name": "Charlie", "scores": [92, 89, 94, 87]},
    {"name": "Diana", "scores": [88, 91, 85, 93]}
  ]
}
---JMESPATH---
{
  "first_two_rows": matrix[0:2],
  "last_two_columns": matrix[*][2:],
  "diagonal": [matrix[0][0], matrix[1][1], matrix[2][2], matrix[3][3]],
  "first_half_scores": table[*].{name: name, scores: scores[0:2]},
  "top_students": table[0:2][*].name,
  "recent_scores": table[*].scores[-2:]
}
```

### Pagination and Chunking

```jmespath-interactive Pagination Patterns
{
  "items": [
    {"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"},
    {"id": 3, "name": "Item 3"}, {"id": 4, "name": "Item 4"},
    {"id": 5, "name": "Item 5"}, {"id": 6, "name": "Item 6"},
    {"id": 7, "name": "Item 7"}, {"id": 8, "name": "Item 8"},
    {"id": 9, "name": "Item 9"}, {"id": 10, "name": "Item 10"}
  ],
  "page_size": 3,
  "current_page": 2
}
---JMESPATH---
{
  "page_1": items[0:3],
  "page_2": items[3:6],
  "page_3": items[6:9],
  "current_page_items": items[3:6],
  "odd_pages": items[0::6],
  "even_pages": items[3::6]
}
```

## Advanced Indexing Techniques

### Conditional Slicing

```jmespath-interactive Conditional Slicing
{
  "sales_data": [
    {"month": "Jan", "sales": 1000, "target": 1200},
    {"month": "Feb", "sales": 1500, "target": 1300},
    {"month": "Mar", "sales": 800, "target": 1100},
    {"month": "Apr", "sales": 1800, "target": 1400},
    {"month": "May", "sales": 2000, "target": 1600},
    {"month": "Jun", "sales": 1200, "target": 1500}
  ]
}
---JMESPATH---
{
  "q1_data": sales_data[0:3],
  "q2_data": sales_data[3:6],
  "recent_performance": sales_data[-3:][*].{
    month: month,
    sales: sales,
    target: target,
    above_target: sales > target
  },
  "first_three_months": sales_data[:3][*].month
}
```

### Dynamic Slicing

```jmespath-interactive Dynamic Slicing
{
  "data": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  "config": {
    "window_size": 4,
    "offset": 2,
    "sample_rate": 2
  }
}
---JMESPATH---
{
  "windowed_data": data[2:6],
  "sampled_data": data[::2],
  "last_window": data[-4:],
  "middle_section": data[2:7],
  "config_info": config
}
```

## Performance Considerations

### Efficient Slicing Strategies

```jmespath-interactive Performance Patterns
{
  "large_dataset": [
    {"id": 1, "category": "A", "value": 100},
    {"id": 2, "category": "B", "value": 200},
    {"id": 3, "category": "A", "value": 150},
    {"id": 4, "category": "C", "value": 300},
    {"id": 5, "category": "B", "value": 250},
    {"id": 6, "category": "A", "value": 175}
  ]
}
---JMESPATH---
{
  "efficient_filter_then_slice": large_dataset[?category=='A'][0:2],
  "slice_then_filter": large_dataset[0:4][?category=='A'],
  "top_values": large_dataset[:3][*].value,
  "category_sample": large_dataset[::2][*].category
}
```

## Error Handling and Edge Cases

### Handling Invalid Slices

```jmespath-interactive Edge Cases
{
  "small_array": [1, 2, 3],
  "empty_array": [],
  "single_item": [42],
  "text": "Hi"
}
---JMESPATH---
{
  "out_of_bounds": small_array[10:20],
  "negative_beyond_length": small_array[-10:-5],
  "empty_slice": small_array[2:2],
  "empty_array_slice": empty_array[0:5],
  "single_item_slice": single_item[0:1],
  "short_string": text[0:10]
}
```

## Best Practices

1. **Use Negative Indexing**: Access elements from the end using negative indices for more readable code.

2. **Combine with Filters**: Apply filters before slicing for better performance on large datasets.

3. **Leverage String Slicing**: Use string slicing for substring operations instead of complex string functions when possible.

4. **Consider Step Values**: Use step values to sample data or extract patterns efficiently.

5. **Handle Edge Cases**: Always consider empty arrays, out-of-bounds indices, and null values.

6. **Optimize for Performance**: Slice early in your pipeline to reduce the amount of data processed by subsequent operations.

## Slice Expression Reference

| Pattern | Description | Example |
|---------|-------------|---------|
| `[start:stop]` | Elements from start to stop-1 | `[1:4]` → indices 1, 2, 3 |
| `[start:]` | Elements from start to end | `[2:]` → from index 2 to end |
| `[:stop]` | Elements from beginning to stop-1 | `[:3]` → indices 0, 1, 2 |
| `[::step]` | Every step-th element | `[::2]` → every 2nd element |
| `[start:stop:step]` | Range with step | `[1:8:2]` → indices 1, 3, 5, 7 |
| `[::-1]` | Reverse entire array/string | `[::-1]` → reversed order |
| `[-n:]` | Last n elements | `[-3:]` → last 3 elements |
| `[:-n]` | All but last n elements | `[:-2]` → all except last 2 |

Array slicing and advanced indexing are fundamental tools for data manipulation in JMESPath, enabling precise control over data extraction and transformation patterns.
