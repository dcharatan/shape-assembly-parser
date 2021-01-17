import { ShapeAssemblyProgram } from '..';
import Definition from '../definition/Definition';
import ExpressionNode, { ExpressionNodeJSON } from '../expression/ExpressionNode';
import characterIndexToLineIndex from './characterIndexToLineIndex';
import Placeholder from './Placeholder';
import PlaceholderLine from './PlaceholderLine';
import TranspilerMetadata from './TranspilerMetadata';

interface InvocationResult {
  inPlace: PlaceholderLine[] | Placeholder;
  appendedAssemblies: PlaceholderLine[][];
  returnedPlaceholders: Placeholder[];
}

interface Argument {
  evaluated: unknown;
  expression: ExpressionNode;
}

interface TranspileResult {
  text: string;
  expressions: {
    [key: number]: ExpressionNodeJSON[];
  };
  metadata: TranspilerMetadata;
}

export default class Transpiler {
  public transpile(program: ShapeAssemblyProgram): TranspileResult | undefined {
    if (program.errors.length) {
      return undefined;
    }
    return this.transpileValidProgram(program);
  }

  private transpileValidProgram(program: ShapeAssemblyProgram): TranspileResult | undefined {
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
    // Map Python line numbers to placeholder lines.
    const lineMap = new Map<number, PlaceholderLine[]>();
    const descendantLineMap = new Map<number, PlaceholderLine[]>();
    const lines = this.transpileInvocation(rootDefinition, [], definitionMap, lineMap, descendantLineMap, program)
      .appendedAssemblies;

    // Fill in the placeholders.
    return this.populate(lines, lineMap, descendantLineMap, program);
  }

  private populate(
    assemblies: PlaceholderLine[][],
    lineMap: Map<number, PlaceholderLine[]>,
    descendantLineMap: Map<number, PlaceholderLine[]>,
    program: ShapeAssemblyProgram,
  ): TranspileResult {
    const placeholderMap = new Map<Placeholder, string>();

    // Map assembly placeholders.
    assemblies.forEach((assembly, index) => {
      const placeholder = assembly[0].firstAssemblyPlaceholder();
      placeholderMap.set(placeholder, `Program_${index}`);
    });

    // Map cuboid placeholders.
    assemblies.forEach((assembly) => {
      let cuboidIndex = 0;
      assembly.forEach((line) => {
        const assignmentPlaceholder = line.getAssignmentPlaceholder();
        if (assignmentPlaceholder) {
          if (!assignmentPlaceholder.forAssembly) {
            placeholderMap.set(assignmentPlaceholder, `cube${cuboidIndex}`);
          }
          cuboidIndex++;
        } else if (line.invocation && line.invocation.definitionToken.text === 'reflect') {
          cuboidIndex++;
        }
      });
    });

    // Make the substitutions.
    assemblies.forEach((assembly) => {
      assembly.forEach((line) => {
        line.fillPlaceholders(placeholderMap);
      });
    });

    // Assemble the returned lines.
    const lines = [];
    const expressions: { [key: number]: ExpressionNodeJSON[] } = {};
    let lineIndex = 0;
    for (const assembly of assemblies) {
      for (const line of assembly) {
        lines.push(line.evaluate());
        if (line.argumentExpressions.length) {
          expressions[lineIndex] = line.argumentExpressions.map((expression) => expression.toJSON());
        }
        lineIndex++;
      }
    }
    return {
      text: lines.join('\n'),
      expressions,
      metadata: new TranspilerMetadata(program, assemblies, lineMap, descendantLineMap),
    };
  }

  private transpileInvocation(
    definition: Definition,
    invocationArguments: Argument[],
    definitionMap: Map<string, Definition>,
    lineMap: Map<number, PlaceholderLine[]>,
    descendantLineMap: Map<number, PlaceholderLine[]>,
    program: ShapeAssemblyProgram,
  ): InvocationResult {
    // Built-in functions don't spawn additional lines.
    if (definition.isBuiltIn) {
      return { inPlace: [], appendedAssemblies: [], returnedPlaceholders: [] };
    }

    // Map variable names to values.
    // The values are either numeric or placeholders for variables.
    const localValues = new Map<string, unknown>();
    const localExpressions = new Map<string, ExpressionNode>();
    definition.declaration.parameterTokens.forEach((token, index) => {
      const argument = invocationArguments[index];
      localValues.set(token.text, argument.evaluated);
      localExpressions.set(token.text, argument.expression);
    });

    // Handle the invocations.
    const invocationLines: PlaceholderLine[] = [];
    const appendedLines: PlaceholderLine[][] = [];

    // For everything else, set local values using the parameters.
    definition.declaration.parameterTokens.forEach((token, index) => {
      const argument = invocationArguments[index];
      localValues.set(token.text, argument.evaluated);
      localExpressions.set(token.text, argument.expression);
    });

    for (const invocation of definition.invocations) {
      // Find the corresponding definition.
      const invocationDefinition = definitionMap.get(invocation.definitionToken.text);
      if (!invocationDefinition) {
        throw new Error('Unknown invocation.');
      }

      const invocationProcessedArguments = invocation.argumentExpressions.map(
        (argumentExpression, index): Argument => {
          // Evaluate the argument.
          // True and false have to be capitalized to match ShapeAssembly syntax.
          const type = invocationDefinition.argumentTypes[index];
          let evaluatedArgument = argumentExpression.evaluate(type, localValues);
          if (evaluatedArgument === true) {
            evaluatedArgument = 'True';
          } else if (evaluatedArgument === false) {
            evaluatedArgument = 'False';
          }

          // Substitute for the argument.
          const substitutedArgument = argumentExpression.substitute(localExpressions);

          return {
            evaluated: evaluatedArgument,
            expression: substitutedArgument,
          };
        },
      );

      const line = new PlaceholderLine(
        ['    '],
        invocationProcessedArguments.map((argument) => argument.expression),
        invocation,
      );

      // Invoke the function.
      const { inPlace, appendedAssemblies, returnedPlaceholders } = this.transpileInvocation(
        invocationDefinition,
        invocationProcessedArguments,
        definitionMap,
        lineMap,
        descendantLineMap,
        program,
      );
      appendedLines.push(...appendedAssemblies);

      const pythonLineIndex = characterIndexToLineIndex(invocation.definitionToken.start, program.lineBreaks);

      // If inPlace is a placeholder, it's a placeholder for an assembly.
      // This means that there's a bounding box cuboid call that needs to be replaced with the assembly placeholder.
      let bboxCuboidPythonLineIndex: number | undefined;
      if (inPlace instanceof Placeholder) {
        if (
          invocationProcessedArguments.length !== 1 ||
          !(invocationProcessedArguments[0].evaluated instanceof Placeholder)
        ) {
          throw new Error('Unable to replace placeholder.');
        }
        const assemblyPlaceholder = inPlace;
        const cuboidPlaceholder = invocationProcessedArguments[0].evaluated;

        // Find the placeholder in the local value map and replace it.
        for (const [text, placeholder] of Array.from(localValues)) {
          if (placeholder === cuboidPlaceholder) {
            // Find the placeholder's declaration.
            const declarationLine = invocationLines.find((line) => line.containsPlaceholder(cuboidPlaceholder));
            if (!declarationLine) {
              throw new Error('Could not find declaration for cuboid.');
            }

            // Map the Python line index for the subassembly's bbox creation to the in-assembly bbox creation line.
            for (const [lineIndex, placeholderLines] of lineMap.entries()) {
              if (placeholderLines.includes(declarationLine)) {
                bboxCuboidPythonLineIndex = lineIndex;
              }
            }

            // Add the placeholder's declaration (the bbox creation line) to the assembly that needs it.
            for (const appendedAssembly of appendedLines) {
              if (appendedAssembly[0].containsPlaceholder(assemblyPlaceholder)) {
                const bboxLine = declarationLine.copy();
                bboxLine.replacePlaceholder(cuboidPlaceholder, 'bbox');
                appendedAssembly.splice(1, 0, bboxLine);
              }
            }

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

      // Map the Python line number to the placeholder lines (for invocations).
      // This will later allow Python line numbers to be mapped to transpiled line numbers.
      // Note that this is a one-to-many mapping because Python functions can be reused.
      if (!lineMap.has(pythonLineIndex)) {
        lineMap.set(pythonLineIndex, []);
      }
      if (!descendantLineMap.has(pythonLineIndex)) {
        descendantLineMap.set(pythonLineIndex, []);
      }
      const descendants = [];
      appendedAssemblies.forEach((appendedAssembly, index) => {
        if (invocationDefinition.isChildAssembly) {
          if (index === 0) {
            // The bbox, which is the first line, is direct (not descendant).
            // This is only for the first appended assembly though (the rest are descendants of that one).
            const bbox = appendedAssembly[1];
            lineMap.get(pythonLineIndex)?.push(bbox);
            if (bboxCuboidPythonLineIndex) {
              if (!lineMap.has(bboxCuboidPythonLineIndex)) {
                lineMap.set(bboxCuboidPythonLineIndex, []);
              }
              lineMap.get(bboxCuboidPythonLineIndex)?.push(bbox);
            }
            descendants.push(...[appendedAssembly[0], ...appendedAssembly.slice(2)]);

            // The bbox should also be given to the declaration line (not just the invocation line) so that highlights for
            // the bbox argument work.
            const declarationPythonLine = characterIndexToLineIndex(
              invocationDefinition.declaration.nameToken.start,
              program.lineBreaks,
            );
            if (!lineMap.has(declarationPythonLine)) {
              lineMap.set(declarationPythonLine, []);
            }
            lineMap.get(declarationPythonLine)?.push(bbox);
          } else {
            descendants.push(...appendedAssembly);
          }
        } else {
          descendants.push(...appendedAssembly);
        }
      });
      if (Array.isArray(inPlace)) {
        descendants.push(...inPlace);
      }
      descendantLineMap.get(pythonLineIndex)?.push(...descendants);
      lineMap.get(pythonLineIndex)?.push(line);

      // Add assignment if necessary.
      let isBoundingBoxLine = false;
      if (invocation.definitionToken.text === 'Cuboid') {
        const placeholder =
          invocation.assignmentTokens[0].text === 'bbox'
            ? 'bbox'
            : new Placeholder(false, invocation.assignmentTokens[0]);
        isBoundingBoxLine = placeholder === 'bbox';
        if (invocation.assignmentTokens[0]) {
          localValues.set(invocation.assignmentTokens[0].text, placeholder);
        }
        line.add(placeholder, ' = ');
      } else if (!definition.isBuiltIn) {
        // Add assignments for user-defined functions.
        returnedPlaceholders.forEach((placeholder, index) => {
          localValues.set(invocation.assignmentTokens[index].text, placeholder);
        });
      }

      // Add the rest of the line.
      line.add(invocationDefinition.declaration.nameToken.text, '(');
      invocationProcessedArguments.forEach((processedArguemnt, index) => {
        const isLastArgument = index === invocationProcessedArguments.length - 1;
        line.add(
          processedArguemnt.evaluated instanceof Placeholder
            ? processedArguemnt.evaluated
            : String(processedArguemnt.evaluated),
        );
        if (!isLastArgument) {
          line.add(', ');
        }
      });
      line.add(')');

      // Decide how to handle the line.
      // There are two special cases:
      // 1. Since function calls are expanded into macros, the call itself is hidden.
      // 2. Child assemblies need to be reconciled with their bounding box's cuboid calls.
      const isMacro =
        !invocationDefinition.isBuiltIn &&
        !invocationDefinition.isChildAssembly &&
        !invocationDefinition.isRootAssembly;
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

    // Handle assignment.
    let returnedPlaceholders: Placeholder[] = [];
    if (!definition.isBuiltIn) {
      returnedPlaceholders =
        (definition.returnStatement?.tokens.map((token) => localValues.get(token.text)) as Placeholder[]) ?? [];
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
        returnedPlaceholders,
      };
    } else {
      // Assemblies don't add lines to the place where they're called.
      // Instead, an assembly's invocations are wrapped in an assembly call.
      const placeholder = new Placeholder(true);
      invocationLines.unshift(new PlaceholderLine(['Assembly ', placeholder, ' {'], []));
      invocationLines.push(new PlaceholderLine(['}'], []));
      return {
        inPlace: placeholder,
        appendedAssemblies: [[...invocationLines], ...appendedLines],
        returnedPlaceholders,
      };
    }
  }
}
