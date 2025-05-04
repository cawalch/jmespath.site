---
title: Discarding nulls
nav_label: Discarding nulls
nav_order: 2
---

## Problem statement

Discarding `null` values is a surprisingly frequently requested feature from JMESPath.
The canonical answer is to use the `merge()` function and let external deserializers discard / ignore those values.

That said, the `items()`, `from_items()` and `zip()` functions let you build primitives to achieve this.

## How to

Given:

```json
{ "a": 1, "b": "", "c": null }
```

The following expressions can be useful:

- ``from_items( items(@) [? @[1]!=`null` ]  )`` returns `{ "a": 1, "b": "" }`
- `from_items( items(@) [? @[1]!='' ]  )` returns `{ "a": 1, "c": null }`
- `from_items( items(@) [? @[1] ]  )` returns `{ "a": 1 }`

### More complex objects

The previous primitives can be used in more complex scenarios where the discarded values are in nested object structures.

Given:

```json
{
  "key1": { "a": 1, "b": "", "c": null },
  "key2": { "a": 2, "b": "bee", "c": "" }
}
```

This requires a way to split keys from their values, operate on the values using one of the primitives referred to above, and reconstruct the object.

The following expressions are needed:

- `keys(@)` to extract the key from the object.
- `values(@)[*].from_items( items(@)[?@[1]] )` to discard all _falsy_ values, that include both `null` and empty strings.

Given those two expressions, the `let-expression` lets you create a scope to hold both keys and computed values, and operate on them:

`let $k = keys(@), $v = values(@)[*].from_items( items(@)[?@[1]] ) in … `

The first part of the `let-expression` creates two named bindings, `$k` and `$v` that hold the keys from the original input and the newly computed values respectively.

The second part to the `let-expression` is an `expression` that can be used to operate on said named bindings.

To reconstruct an object from a given set of keys and values, use the following expression:

`zip($k, $v)`

Here is the full expression:

`let $k = keys(@), $v = values(@)[*].from_items( items(@)[?@[1]] ) in zip($k, $v)`
