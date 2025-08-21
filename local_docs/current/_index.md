---
title: Home
nav_order: 1
id: home
---

![Logo](./current/logo.svg "JMESPath Community Edition")

# A Query Language for JSON

```jmespath-interactive expanded locations[?state == 'WA'].name | sort(@)
{
  "locations": [
    {"name": "Seattle", "state": "WA"},
    {"name": "New York", "state": "NY"},
    {"name": "Bellevue", "state": "WA"},
    {"name": "Olympia", "state": "WA"}
  ],
  "people": {
    "person1": {"first": "James", "last": "Smith"},
    "person2": {"first": "Mary", "last": "Jones"}
  }
}
---JMESPATH---
locations[?state == 'WA'].name | sort(@)
```

JMESPath is a query language for JSON. You can extract and transform elements from a JSON document. The examples below are interactive. You can change the JMESPath expressions and see the results update automatically.

For each of these examples, the JMESPath expression is applied to the input JSON on the left, and the result of evaluating the JMESPath expression is shown in the JSON document on the right-hand side.

# Basic Expressions

The simplest JMESPath expression is an ```identifier```, which selects a key in a JSON object:

```jmespath-interactive Simple Identifier
{"a": "foo", "b": "bar", "c": "baz"}
---JMESPATH---
a
```

Try changing the expression above to ```b```, and ```c``` and note the updated result. Also note that if you refer to a key that does not exist, a value of ```null``` (or the language equivalent of ```null```) is returned.

You can use a ```subexpression``` to access nested values in a JSON object:

```jmespath-interactive Subexpression
{"a": {"b": {"c": {"d": "value"}}}}
---JMESPATH---
a.b.c.d
```

If you refer to a key that does not exist, a value of ```null``` is returned. Attempting to subsequently access identifiers will continue to return a value of ```null```. Try changing the expression to ```b.c.d.e``` above.

```Index Expressions``` allow you to select a specific element in a list. It should look similar:

```jmespath-interactive Index Expressions
["a", "b", "c", "d", "e", "f"]
---JMESPATH---
[1]
```

If you specify an index that's larger than the list, a value of ```null``` is returned. You can also use negative indexing to index from the end of the list. ```[-1]``` refers to the last element in the list, ```[-2]``` refers to the penultimate element. Try it out in the example above.

You can combine identifiers, sub expressions, and index expressions to access JSON elements.

```jmespath-interactive Combined Expressions
{
  "a": {
    "b": {
      "c": [
        {
          "d": [ 0, [ 1, 2 ] ]
        },
        {
          "d": [ 3, 4 ]
        }
      ]
    }
  }
}
---JMESPATH---
a.b.c[0].d[1][0]
```

# Slicing

Slices allow you to select a contiguous subset of an array. If you've ever used slicing in Python, then you already know how to use JMESPath slices. In its simplest form, you can specify the starting index and the ending index. The ending index is the first index which you do _not_ want included in the slice. Let's take a look at some examples. First, given an array of integers from 0 to 9, let's select the first half of the array:

```jmespath-interactive Slicing [0:5]
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
---JMESPATH---
[0:5]
```

This slice result contains the elements 0, 1, 2, 3, and 4. The element at index 5 is not included. If we want to select the second half of the array, we can use this expression:

```jmespath-interactive Slicing [5:10]
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
---JMESPATH---
[5:10]
```

The two examples above can be shortened. If the ```start``` or ```stop``` value is omitted, it is assumed to be the start or the end of the array. For example:

```jmespath-interactive Slicing Shortened
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
---JMESPATH---
[:5]
```

Try modifying the example above to only include the last half of the array elements without specifying the end value of ```10```.

The general form of a slice is ```[start:stop:step]```. So far we've looked at the ```[start:stop]``` form. By default, the ```step``` value is ```1```, which means to include every element in the range specified by the ```start``` and ```stop``` value. However, we can use the step value to skip over elements. For example, to select only the even elements from the array.

```jmespath-interactive Slicing Step
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
---JMESPATH---
[::2]
```

Also note in this example we are omitting the ```start``` and the ```stop``` value, which means to use the array's start for the ```start``` value and its end for the ```stop``` value. In this example, the expression ```[::2]``` is equivalent to ```[0:10:2]```.

The last thing to know about slices is that just like indexing a single value, the start, stop, and step values can be negative.

```jmespath-interactive Slicing Reverse
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
---JMESPATH---
[::-1]
```

Unlike earlier versions of JMESPath, slice expressions now create projections, so expressions like ```myarray[:10].foo.bar``` will return values rather than ```null```. This means you no longer need to write ```myarray[:10][*].foo.bar``` to project an expression onto a slice.

If you want all the details about how slices work, check out the [```slices```](https://jmespath.site/#spec-slices) in the specification.

# Projections

Projections are one of the key features of JMESPath. It allows you to apply an expression to a collection of elements. There are five kinds of projections:

- List Projections
- Slice Projections
- Object Projections
- Flatten Projections
- Filter Projections

## List and Slice Projections

A ```wildcard expression``` creates a list projection, which is a projection over a JSON array. This example describes people, and each array element is a JSON object with ```first```, ```last```, and ```age``` keys.

```jmespath-interactive List Projections
{
  "people": [
    {
      "first": "James",
      "last": "d"
    },
    {
      "first": "Jacob",
      "last": "e"
    },
    {
      "first": "Jayden",
      "last": "f"
    },
    {
      "missing": "different"
    }
  ],
  "foo": {
    "bar": "baz"
  }
}
---JMESPATH---
people[*].first
```

In the example above, the ```first``` expression, which is just an identifier, is applied to each element in the ```people``` array. The results are collected into a JSON array and returned as the result of the expression. The expression can be more complex than a basic ```identifier```. For example, the expression ```foo[*].bar.baz[0]``` would project the ```bar.baz[0]``` expression to each element in the ```foo``` array.

There are a few things to keep in mind when working with projections. These are discussed in more detail in the [```wildcards```](https://jmespath.site/#spec-wildcards) section of the spec, but the main points are:

- Projections are evaluated as two steps. The left-hand side (LHS) creates a JSON array of initial values. The right-hand side (RHS) of a projection is the expression to project for each element in the JSON array created by the left-hand side. Each projection type has slightly different semantics when evaluating either the left-hand side and/or the right-hand side.
- If the result of the expression projected onto an individual array element is ```null```, then that value is omitted from the collected set of results.
- You can stop a projection with a Pipe Expression (discussed later).
- A list projection is only valid for a JSON array. If the value is not a list, then the result of the expression is ```null```.

You can try this out in the demo above. Notice how ```people[*].first``` only included three elements, even though the people array has four elements. This is because the last element, ```{"missing": "different"}``` evaluates to ```null``` when the expression ```first``` is applied, and ```null``` values are not added to the collected result array. If you try the expression ```foo[*].bar``` you'll see a result of ```null```, because the value associated with the ```foo``` key is a JSON object, not an array, and a list projection is only defined for JSON arrays.

Slice projections work identically to list projections but with a slice as the left-hand side:

```jmespath-interactive Slice Projections
{
  "people": [
    {
      "first": "James",
      "last": "d"
    },
    {
      "first": "Jacob",
      "last": "e"
    },
    {
      "first": "Jayden",
      "last": "f"
    },
    {
      "missing": "different"
    }
  ],
  "foo": {
    "bar": "baz"
  }
}
---JMESPATH---
people[:2].first
```

## Object Projections

Whereas a list projection is defined for a JSON array, an object projection is defined for a JSON object. You can create an object projection using the ```*``` syntax. This will create a list of the values of the JSON object, and project the right-hand side of the projection onto the list of values.

```jmespath-interactive Object Projections
{
  "ops": {
    "functionA": {
      "numArgs": 2
    },
    "functionB": {
      "numArgs": 3
    },
    "functionC": {
      "variadic": true
    }
  }
}
---JMESPATH---
ops.*.numArgs
```

In the example above the ```*``` creates a JSON array of the values associated with the ```ops``` JSON object. The RHS of the projection, ```numArgs```, is then applied to the JSON array, resulting in the final value.

A typical implementation could evaluate an object projection as:

- **LHS**: ```ops```
- **RHS**: ```numArgs```

First, the LHS is evaluated to create the initial array to be projected:

    evaluate(ops, inputData) → [{"numArgs": 2}, {"numArgs": 3}, {"variadic": true}]

Then the RHS is applied to each element in the array:

    evaluate(numArgs, {numArgs: 2}) → 2
    evaluate(numArgs, {numArgs: 3}) → 3
    evaluate(numArgs, {variadic: true}) → null

Any ```null``` values are not included in the final result, so the result of the entire expression is therefore ```[2, 3]```.

## Flatten Projections

More than one projection can be used in a JMESPath expression. In the case of a List/Object projection, the structure of the original document is preserved when creating projection within a projection. For example, let's take the expression ```reservations[*].instances[*].state```. This expression is saying that the top level key ```reservations``` has an array as a value. For each of those array elements, project the ```instances``` key. Each contains an ```instances``` key whose value is an array, and we create a sub projection for each element in that array. Here's an example of that:

```jmespath-interactive Flatten Projections
{
  "reservations": [
    {
      "instances": [
        {
          "state": "running"
        },
        {
          "state": "stopped"
        }
      ]
    },
    {
      "instances": [
        {
          "state": "terminated"
        },
        {
          "state": "running"
        }
      ]
    }
  ]
}
---JMESPATH---
reservations[*].instances[*].state
```

The result of this expression is ```[["running", "stopped"], ["terminated", "running"]]```, which is a list of lists. The outer list is from the projection of ```reservations[*]```, and the inner list is a projection of ```state``` created from ```instances[*]```:

    1st       r0                         r1
    2nd i0          i1             i0            i1
    [["running", "stopped"], ["terminated", "running"]]

What if we just want a list of all the states of our instances? We'd ideally like a result ```["running", "stopped", "terminated", "running"]```. In this situation, we don't care which reservation the instance belonged to, we just want a list of states.

This is the problem that a ```Flatten Projection``` solves. To get the desired result, you can use ```[]``` instead of ```[*]``` to flatten a list: ```reservations[].instances[].state```. Try changing ```[*]``` to ```[]``` in the expression above and see how the result changes.

While the ```flatten``` spec goes into more detail, a simple rule of thumb to use for the flatten operator, ```[]```, is that:

- It flattens sublists into the parent list (not recursively, just one level).
- It creates a projection, so anything on the RHS of the flatten projection is projected onto the newly created flattened list.

You can also just use ```[]``` on its own to flatten a list:

```jmespath-interactive Flatten Projections
[[0, 1], 2, [3], 4, [5, [6, 7]]]
---JMESPATH---
[]
```

If you flattened the result of the expression again, ```[][]```, you'd then get a result of ```[0, 1, 2, 3, 4, 5, 6, 7]```. Try it out in the example above.

## Filter Projections

Up to this point we've looked at:

- List/Slice projections
- Object projections
- Flatten projections

Evaluating the RHS of a projection is a basic type of filter. If the result of the expression evaluated against an individual element results in ```null```, then the element is excluded from the final result.

A filter projection allows you to filter the LHS of the projection _before_ evaluating the RHS of a projection.

For example, let's say we have a list of machines, each has a ```name``` and a ```state```. We'd like the name of all machines that are running. In pseudocode, this would be:

    result = []
    foreach machine in inputData['machines']
      if machine['state'] == 'running'
        result.insert_at_end(machine['name'])
    return result

A filter projection can be used to accomplish this:

```jmespath-interactive Filter Projections
{
  "machines": [
    {
      "name": "a",
      "state": "running"
    },
    {
      "name": "b",
      "state": "stopped"
    },
    {
      "name": "b",
      "state": "running"
    }
  ]
}
---JMESPATH---
machines[?state=='running'].name
```

Try changing ```running``` to ```stopped``` in the example above. You can also remove the ```.name``` at the end of the expression if you just want the entire JSON object of each machine that has the specified state.

Filter expressions now support logical operators for more complex filtering:

```jmespath-interactive Advanced Filter Projections
{
  "machines": [
    {
      "name": "a",
      "state": "running",
      "type": "web"
    },
    {
      "name": "b",
      "state": "stopped",
      "type": "db"
    },
    {
      "name": "c",
      "state": "running",
      "type": "db"
    }
  ]
}
---JMESPATH---
machines[?state=='running' && type=='db'].name
```

The filter expression has the general form ```LHS[?expression]RHS```. Filter expressions now support:

- Comparison operators: ```==```, ```!=```, ```<```, ```<=```, ```>```, ```>=```
- Logical operators: ```&&``` (AND), ```||``` (OR), ```!``` (NOT)
- Parentheses for grouping: ```(expression)```

For example, to find machines that are either running web servers or stopped database servers:

```
machines[?(state=='running' && type=='web') || (state=='stopped' && type=='db')]
```

# Pipe Expressions

Projections are an important concept in JMESPath. However, there are scenarios when you want to operate on the _result_ of a projection rather than projecting an expression onto each element in the array. For example, the expression ```people[*].first``` will give you an array containing the first names of everyone in the people array. What if you wanted the first element in that list? If you tried ```people[*].first[0]``` that would evaluate ```first[0]``` for each element in the people array, and because indexing is not defined for strings, the final result would be an empty array, ```[]```. To accomplish the desired result, you can use a pipe expression, ```<expression> | <expression>```, to indicate that a projection must stop. This is shown in the example below:

```jmespath-interactive Pipe Expressions
{
  "people": [
    {
      "first": "James",
      "last": "d"
    },
    {
      "first": "Jacob",
      "last": "e"
    },
    {
      "first": "Jayden",
      "last": "f"
    },
    {
      "missing": "different"
    }
  ],
  "foo": {
    "bar": "baz"
  }
}
---JMESPATH---
people[*].first | [0]
```

In the example above, the RHS of the list projection is ```first```. When a pipe is encountered, the result up to that point is passed to the RHS of the pipe expression. The pipe expression is evaluated as:

    evaluate(people[*].first, inputData) → ["James", "Jacob", "Jayden"]
    evaluate([0], ["James", "Jacob", "Jayden"]) → "James"

# MultiSelect

Up to this point, we've looked at JMESPath expressions that help to pare down a JSON document into just the elements you're interested in. This next concept, [```multiselect lists```](https://jmespath.site/#spec-multiselectlist) and [```multiselect hashes```](https://jmespath.site/#spec-multiselecthash) allow you to create JSON elements. This allows you to create elements that don't exist in a JSON document. A multiselect list creates a list and a multiselect hash creates a JSON object.

This is an example of a multiselect list:

```jmespath-interactive Multiselect Lists
{
  "people": [
    {
      "name": "a",
      "state": {
        "name": "up"
      }
    },
    {
      "name": "b",
      "state": {
        "name": "down"
      }
    },
    {
      "name": "c",
      "state": {
        "name": "up"
      }
    }
  ]
}
---JMESPATH---
people[].[name, state.name]
```

In the expression above, the ```[name, state.name]``` portion is a multiselect list. It says to create a list of two elements for each item in the ```people``` list: the first element is the result of evaluating the ```name``` expression against the item, and the second element is the result of evaluating the ```state.name``` expression. The final result of the entire expression is a list of two-element lists.

Unlike a projection, the result of the expression is always included, even if the result is null. If you change the above expression to ```people[].[foo, bar]``` each two-element list will be ```[null, null]```.

If you instead wanted to create a two-element hash that had two keys, ```Name``` and ```State```, we could use this:

```jmespath-interactive Multiselect Hashes
{
  "people": [
    {
      "name": "a",
      "state": {
        "name": "up"
      }
    },
    {
      "name": "b",
      "state": {
        "name": "down"
      }
    },
    {
      "name": "c",
      "state": {
        "name": "up"
      }
    }
  ]
}
---JMESPATH---
people[].{Name: name, State: state.name}
```

# Functions

JMESPath supports function expressions, for example:

```jmespath-interactive Functions
{
  "people": [
    {
      "name": "b",
      "age": 30,
      "state": {
        "name": "up"
      }
    },
    {
      "name": "a",
      "age": 50,
      "state": {
        "name": "down"
      }
    },
    {
      "name": "c",
      "age": 40,
      "state": {
        "name": "up"
      }
    }
  ]
}
---JMESPATH---
length(people)
```

[Functions](https://jmespath.site/#functions) can be used to transform and filter data in powerful ways.

Below are a few examples of functions.

This example prints the name of the oldest person in the ```people``` array:

```jmespath-interactive Functions with Projections
{
  "people": [
    {
      "name": "b",
      "age": 30
    },
    {
      "name": "a",
      "age": 50
    },
    {
      "name": "c",
      "age": 40
    }
  ]
}
---JMESPATH---
max_by(people, &age).name
```

Notice the ```&``` operator before ```age```. This creates an expression reference that allows the function to evaluate the expression against each element.

Below, the JMESPath expression finds all elements in ```myarray``` that contain the string ```foo```:

```jmespath-interactive Functions with Projections
{
  "myarray": [
    "foo",
    "foobar",
    "barfoo",
    "bar",
    "baz",
    "barbaz",
    "barfoobaz"
  ]
}
---JMESPATH---
myarray[?contains(@, 'foo')]
```

The ```@``` character in the example above refers to the current element being evaluated in ```myarray```. The expression ```contains(@, 'foo')``` will return ```true``` if the current element in the ```myarray``` array contains the string ```foo```.

While the ```function expression``` spec has all the details, there are a few things to keep in mind when working with functions:

- Function arguments have types. If an argument for a function has the wrong type, an ```invalid-type``` error will occur. There are functions that can do type conversions (```to_string```, ```to_number```) to help get arguments converted to their proper type.
- If a function is called with the wrong number of arguments, an ```invalid-arity``` will occur.
- Some functions like ```sort_by```, ```max_by```, and ```min_by``` require expression references (using the ```&``` prefix) to specify how to evaluate elements.

# Next Steps

We've now seen an overview of the JMESPath language. The next things to do are:

- See the [examples](https://jmespath.site/#examples). You'll see common JMESPath expressions that go beyond the tutorial. You'll also see you how to combine multiple features together in order to best leverage JMESPath expressions.
- To actually start using JMESPath, pick the language of your choice, and check out the [libraries](https://jmespath.site/#libraries) page for more information on using JMESPath in the language of your choice.
- Read the [JMESPath Spec](https://jmespath.site/#specification), which has the official ABNF grammar and full details of the semantics of the language.


