---
title: Discarding nulls
nav_label: Discarding nulls
nav_order: 2
---

# Discarding Null Values

## Problem Statement

Discarding ```null``` values is a frequently requested feature in JMESPath. While the canonical approach involves using the ```merge()``` function and relying on external deserializers, the ```items()```, ```from_items()```, and ```zip()``` functions provide primitives to achieve this filtering directly within JMESPath expressions.

## Basic Object Filtering

Given this input:

```json
{ "a": 1, "b": "", "c": null }
```

The following expressions can be used:

- ``from_items(items(@)[?@[1]!=```null```])`` returns ```{ "a": 1, "b": "" }```
- ``from_items(items(@)[?@[1]!=''])`` returns ```{ "a": 1, "c": null }```
- ``from_items(items(@)[?@[1]])`` returns ```{ "a": 1 }```

### Explanation

- ```items(@)``` converts the object to an array of key-value pairs: ```[["a",1], ["b",""], ["c",null]]```
- ```[?@[1]!=```null```]``` filters out entries where the value (at index 1) is ```null```
- ```from_items()``` converts the filtered array back to an object

## Nested Object Filtering

For more complex scenarios with nested objects:

```json
{
  "key1": { "a": 1, "b": "", "c": null },
  "key2": { "a": 2, "b": "bee", "c": "" }
}
```

The solution requires:

- ```keys(@)``` to extract top-level keys
- ```values(@)[*].from_items(items(@)[?@[1]])``` to process each nested object
- ```let``` expressions to bind intermediate values

### Complete Expression

```
let $k = keys(@), $v = values(@)[*].from_items(items(@)[?@[1]]) in zip($k, $v)
```

### Step-by-Step Breakdown

- The ```let``` expression creates two bindings:
  - ```$k``` holds the top-level keys: ```["key1", "key2"]```
  - ```$v``` holds the processed nested objects:
    - For ```key1```: ```{ "a": 1 }``` (after removing falsy values)
    - For ```key2```: ```{ "a": 2, "b": "bee" }```

- ```zip($k, $v)``` combines these back into the final object:
  ```
  {
    "key1": { "a": 1 },
    "key2": { "a": 2, "b": "bee" }
  }
  ```

This pattern can be adapted for different filtering criteria by modifying the expression inside the filter ```[?@[1]]```.


