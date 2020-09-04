import { ShapeAssemblyProgram } from '..';
import Definition from '../definition/Definition';
import Placeholder from './Placeholder';
import PlaceholderLine from './PlaceholderLine';

interface InvocationResult {
  inPlace: PlaceholderLine[] | Placeholder;
  appendedAssemblies: PlaceholderLine[];
}

export default class Transpiler {
  public transpile(program: ShapeAssemblyProgram): string | undefined {
    if (program.errors.length) {
      return undefined;
    }
    try {
      return this.transpileValidProgram(program);
    } catch (e) {
      throw e;
    }
  }

  private transpileValidProgram(program: ShapeAssemblyProgram): string | undefined {
    // Find the root assembly.
    const rootDefinition = program.definitions.find((definition) => definition.isRootAssembly);
    if (!rootDefinition) {
      return undefined;
    }

    // Map definition names to their definitions.
    const definitionMap = new Map<string, Definition>();
    for (const definition of program.definitions) {
      definitionMap.set(definition.declaration.nameToken.text, definition);
    }

    // Get a transpiled version of an invocation of the root assembly's definition (with placeholders).
    const lines = this.transpileInvocation(rootDefinition, [], definitionMap).appendedAssemblies;

    // Fill in the placeholders.
    return this.populate(lines);
  }

  private populate(lines: PlaceholderLine[]): string {
    return lines.map((line) => line.evaluate()).join('\n');
  }

  private transpileInvocation(
    definition: Definition,
    evaluatedArguments: unknown[],
    definitionMap: Map<string, Definition>,
  ): InvocationResult {
    // Built-in functions don't spawn additional lines.
    if (definition.isBuiltIn) {
      return { inPlace: [], appendedAssemblies: [] };
    }

    // Map variable names to values.
    // The values are either numeric or placeholders for variables.
    const localValues = new Map<string, unknown>();
    definition.declaration.parameterTokens.forEach((token, index) => {
      localValues.set(token.text, evaluatedArguments[index]);
    });

    // Handle the invocations.
    const invocationLines: PlaceholderLine[] = [];
    const appendedLines: PlaceholderLine[] = [];
    for (const invocation of definition.invocations) {
      const line = new PlaceholderLine(['    ']);

      // Find the corresponding definition.
      const invocationDefinition = definitionMap.get(invocation.definitionToken.text);
      if (!invocationDefinition) {
        throw new Error('Unknown invocation.');
      }

      // Evaluate the arguments.
      const invocationEvaluatedArguments = invocation.argumentExpressions.map((argumentExpression, index) => {
        const type = invocationDefinition.argumentTypes[index];
        const evaluatedArgument = argumentExpression.evaluate(type, localValues);

        // True and false have to be capitalized to match ShapeAssembly syntax.
        if (evaluatedArgument === true) {
          return 'True';
        } else if (evaluatedArgument === false) {
          return 'False';
        }
        return evaluatedArgument;
      });

      // Invoke the function.
      const { inPlace, appendedAssemblies } = this.transpileInvocation(
        invocationDefinition,
        invocationEvaluatedArguments,
        definitionMap,
      );
      appendedLines.push(...appendedAssemblies);

      // If inPlace is a placeholder, it's a placeholder for an assembly.
      // This means that there's a bounding box cuboid call that needs to be replaced with the assembly placeholder.
      if (inPlace instanceof Placeholder) {
        if (invocationEvaluatedArguments.length !== 1 || !(invocationEvaluatedArguments[0] instanceof Placeholder)) {
          throw new Error("Unable to replace placeholder.");
        }
        const assemblyPlaceholder = inPlace;
        const cuboidPlaceholder = invocationEvaluatedArguments[0];

        // Find the placeholder in the local value map and replace it.
        for (const [text, placeholder] of Array.from(localValues)) {
          if (placeholder === cuboidPlaceholder) {
            // Find all previous placeholder usages.
            invocationLines.forEach((line) => line.replacePlaceholder(cuboidPlaceholder, assemblyPlaceholder));

            // Replace the placeholder for future usage.
            localValues.set(text, assemblyPlaceholder);
            break;
          }
        }
      } else {
        invocationLines.push(...inPlace);
      }
      
      // Add assignment if necessary.
      let isBoundingBoxLine = false;
      if (invocation.assignmentToken) {
        const placeholder = invocation.assignmentToken.text === 'bbox' ? 'bbox' : new Placeholder();
        isBoundingBoxLine = placeholder === 'bbox';
        localValues.set(invocation.assignmentToken.text, placeholder);
        line.add(placeholder, ' = ');
      }

      // Add the rest of the line.
      line.add(invocationDefinition.declaration.nameToken.text, '(');
      invocationEvaluatedArguments.forEach((evaluatedArgument, index) => {
        const isLastArgument = index === invocationEvaluatedArguments.length - 1;
        line.add(evaluatedArgument instanceof Placeholder ? evaluatedArgument : String(evaluatedArgument));
        if (!isLastArgument) {
          line.add(', ');
        }
      });
      line.add(')');

      // Decide how to handle the line.
      // There are two special cases:
      // 1. Since function calls are expanded into macros, the call itself is hidden.
      // 2. Child assemblies need to be reconciled with their bounding box's cuboid calls.
      const isMacro = !invocationDefinition.isBuiltIn && !invocationDefinition.isChildAssembly && !invocationDefinition.isRootAssembly;
      if (invocationDefinition.isChildAssembly) {

      } else if (!isMacro) {
        if (isBoundingBoxLine) {
          // The line that declares the bounding box always goes first.
          invocationLines.unshift(line);
        } else {
          invocationLines.push(line);
        }
      }
    }

    // Decide what to return.
    const isMacro = !definition.isChildAssembly && !definition.isRootAssembly;
    if (isMacro) {
      // Normal functions are treated like macros when they're transpiled.
      // In other words, all of their lines are expanded into the calling function.
      // However, if they call subassemblies, they can still have appendedAssemblies lines.
      return {
        inPlace: invocationLines,
        appendedAssemblies: appendedLines,
      };
    } else {
      // Assemblies don't add lines to the place where they're called.
      // Instead, an assembly's invocations are wrapped in an assembly call.
      const placeholder = new Placeholder(true);
      invocationLines.unshift(new PlaceholderLine(['Assembly ', placeholder, ' {']));
      invocationLines.push(new PlaceholderLine(['}']));
      return {
        inPlace: placeholder,
        appendedAssemblies: [...invocationLines, ...appendedLines],
      };
    }
  }
}
