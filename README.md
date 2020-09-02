# shape-assembly-parser

This parses ShapeAssembly (with syntactic sugar, similar to what was presented in the original ShapeAssembly paper) into a simple abstract syntax tree (AST). This AST can be used for validation and syntax highlighting or be transpiled into ShapeAssembly that the original Python executor understands.

## ShapeAssembly Specification
ShapeAssembly uses a Python-like syntax. The core ShapeAssembly functions are `Cuboid`, which creates a cuboid, and `attach`, which is used to position and resize cuboids. Their signatures are expressed below in TypeScript syntax.

```
// Create a cuboid with the given dimensions.
Cuboid: (length: PositiveFloat, width: PositiveFloat, height: PositiveFloat, aligned: boolean) => CuboidType

// Attach the child cuboid to the base cuboid. The child cuboid moves.
attach: (child: CuboidType, base: CuboidType, childX: UnitFloat, childY: UnitFloat, childZ: UnitFloat, baseX: UnitFloat, baseY: UnitFloat, baseZ: UnitFloat) => void
```

### Root Assemblies
To create an object using ShapeAssembly, you must define a root assembly using the `@root_assembly` decorator. Root assembly functions cannot take arguments and must define a cuboid named `bbox`. Note that `bbox` is invisible when a ShapeAssembly program is executed.

```
@root_assembly
def my_root_assembly():
  bbox = Cuboid(1, 1, 1, True)
  ...
```

Beyond using `Cuboid` and `attach` in the root assembly, you can define abstractions and child assemblies.

### Abstractions
These are groups of statements. Think of them like functions in a programming language—an abstraction can have an arbitrary number of parameters, and parameter types are inferred based on usage.

```
def my_abstraction(some_positive_float, some_boolean):
  Cuboid(5 * some_positive_float, 1, 1, some_boolean)
```

### Child Assemblies
A child assembly (subassembly) completely replaces a cuboid with more fine-grained geometry. The decorator `@child_assembly` denotes that a function is a child assembly. A child assembly function's single argument is its bounding box (of type cuboid).

```
@child_assembly
def my_child_assembly(bbox):
  ...

@root_assembly
def my_root_assembly():
  bbox = Cuboid(2, 2, 2, True)
  ...
  child_bbox = Cuboid(1, 1, 1, True)
  my_child_assembly(child_bbox)
  ...
```

### Notes
Inside function arguments, ShapeAssembly supports the use of mathematical expressions that contain parentheses and the operators `*`, `/`, `+` and `-` (e.g. `Cuboid(-3 * (some_float - 1), ...)`). However, it does not support nested function calls (e.g. `attach(Cuboid(...), ...)` or the assignment of arbitrary expressions to variables (e.g. `x = 3`). These features would be relatively easy to add by modifying the expression parser to support functions and parsing the right-hand side of assignment statements using the expression parser, but would make transpilation more complicated. Beyond a certain point, it would be easier to hack Python to create ShapeAssembly ASTs.
