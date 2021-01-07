import { ShapeAssemblyProgram } from '..';
import Definition from '../definition/Definition';
import ExpressionNode, { ExpressionNodeJSON } from '../expression/ExpressionNode';
import { TokenJSON } from '../token/Token';
import Placeholder from './Placeholder';
import PlaceholderLine from './PlaceholderLine';

// Warning: The transpiler has been changed to support the new syntax for child assemblies.

// Old:
// bbox = Cuboid(1, 1, 1, True)
// child_assembly(bbox)

// New:
// bbox = child_assembly(1, 1, 1, True)

// This has made the code a lot more confusing. Since the transpiler now has to work around the fact that child assemblies work as if affected by Python decorators (i.e. the arguments and parameters don't seem to match), there are a lot of special cases for child assemblies.

interface InvocationResult {
  inPlace: PlaceholderLine[] | Placeholder;
  appendedAssemblies: PlaceholderLine[][];
  returnedPlaceholders: Placeholder[];
}

interface Argument {
  evaluated: unknown;
  expression: ExpressionNode;
}

interface CuboidMetadata {
  assignmentToken: TokenJSON;
  transpiledLineIndex: number;
}

interface TranspileResult {
  text: string;
  expressions: {
    [key: number]: ExpressionNodeJSON[];
  };
  cuboidMetadata: CuboidMetadata[];
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
    const lines = this.transpileInvocation(rootDefinition, [], definitionMap).appendedAssemblies;

    // Fill in the placeholders.
    return this.populate(lines);
  }

  private populate(assemblies: PlaceholderLine[][]): TranspileResult {
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
    const seenPlaceholders = new Set<Placeholder>();
    const cuboidMetadata: CuboidMetadata[] = [];
    const lines = [];
    const expressions: { [key: number]: ExpressionNodeJSON[] } = {};
    let lineIndex = 0;
    for (const assembly of assemblies) {
      for (const line of assembly) {
        lines.push(line.evaluate());
        if (line.argumentExpressions.length) {
          expressions[lineIndex] = line.argumentExpressions.map((expression) => expression.toJSON());
        }

        // Add the variable metadata.
        // This assumes that the first line on which a placeholder is seen is the line where it's assigned.
        const assignment = line.getAssignmentPlaceholder();
        if (assignment && !seenPlaceholders.has(assignment) && assignment.assignmentToken) {
          seenPlaceholders.add(assignment);
          cuboidMetadata.push({
            assignmentToken: assignment.assignmentToken.toJson(),
            transpiledLineIndex: lineIndex,
          });
        }
        lineIndex++;
      }
    }
    return {
      text: lines.join('\n'),
      expressions,
      cuboidMetadata,
    };
  }

  private transpileInvocation(
    definition: Definition,
    invocationArguments: Argument[],
    definitionMap: Map<string, Definition>,
    childAssemblyParameters?: string[],
  ): InvocationResult {
    // Built-in functions don't spawn additional lines.
    if (definition.isBuiltIn) {
      return { inPlace: [], appendedAssemblies: [], returnedPlaceholders: [] };
    }

    // Map variable names to values.
    // The values are either numeric or placeholders for variables.
    const localValues = new Map<string, unknown>();
    const localExpressions = new Map<string, ExpressionNode>();

    // Handle the invocations.
    const invocationLines: PlaceholderLine[] = [];
    const appendedLines: PlaceholderLine[][] = [];

    // Child assemblies come with cuboid arguments instead of bounding boxes, so they're special-cased here.
    if (definition.isChildAssembly) {
      // For child assemblies, creating the bounding box line.
      if (childAssemblyParameters === undefined) {
        throw Error("No bounding box parameters specified for child assembly.");
      }
      localValues.set("bbox", "bbox");
      const bboxLine = new PlaceholderLine(['    ', 'bbox = Cuboid(', childAssemblyParameters.join(', '), ')'], [], undefined);
      invocationLines.push(bboxLine);
    } else {
      // For everything else, set local values using the parameters.
      definition.declaration.parameterTokens.forEach((token, index) => {
        const argument = invocationArguments[index];
        localValues.set(token.text, argument.evaluated);
        localExpressions.set(token.text, argument.expression);
      });
    }

    for (const invocation of definition.invocations) {
      // Find the corresponding definition.
      const invocationDefinition = definitionMap.get(invocation.definitionToken.text);
      if (!invocationDefinition) {
        throw new Error('Unknown invocation.');
      }

      // Child assemblies use argumennt parsing of the cuboid function.
      const cuboidDefinition = definitionMap.get("Cuboid");
      if (!cuboidDefinition) {
        throw Error('Could not find cuboid declaration.');
      }
      const adjustedInvocationDefinition = invocationDefinition.isChildAssembly ? cuboidDefinition : invocationDefinition;

      const invocationProcessedArguments = invocation.argumentExpressions.map(
        (argumentExpression, index): Argument => {
          // Evaluate the argument.
          // True and false have to be capitalized to match ShapeAssembly syntax.
          const type = adjustedInvocationDefinition.argumentTypes[index];
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
        invocationDefinition.isChildAssembly ? invocationProcessedArguments.map((a) => String(a.evaluated)) : undefined,
      );
      appendedLines.push(...appendedAssemblies);
      if (!(inPlace instanceof Placeholder)) {
        invocationLines.push(...inPlace);
      }

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
      } else if (invocationDefinition.isChildAssembly) {
        if (invocation.assignmentTokens.length !== 1) {
          throw Error("Unexpected number of assignment tokens.");
        }
        if (!(inPlace instanceof Placeholder)) {
          throw Error("Expected placeholder for assembly name.")
        }
        const text = invocation.assignmentTokens[0].text;
        localValues.set(text, inPlace);
        line.add(inPlace, ' = ');
      } else if (!definition.isBuiltIn) {
        // Add assignments for user-defined functions.
        returnedPlaceholders.forEach((placeholder, index) => {
          localValues.set(invocation.assignmentTokens[index].text, placeholder);
        });
      }

      // Add the rest of the line.
      const functionName = invocationDefinition.isChildAssembly ? "Cuboid" : invocationDefinition.declaration.nameToken.text;
      line.add(functionName, '(');
      invocationProcessedArguments.forEach((processedArgument, index) => {
        const isLastArgument = index === invocationProcessedArguments.length - 1;
        line.add(
          processedArgument.evaluated instanceof Placeholder
            ? processedArgument.evaluated
            : String(processedArgument.evaluated),
        );
        if (!isLastArgument) {
          line.add(', ');
        }
      });
      line.add(')');

      // Decide how to handle the line.
      const isMacro =
        !invocationDefinition.isBuiltIn &&
        !invocationDefinition.isChildAssembly &&
        !invocationDefinition.isRootAssembly;
      if (!isMacro) {
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
