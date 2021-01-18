import { ShapeAssemblyProgram } from '..';
import Definition from '../definition/Definition';
import ExpressionNode, { ExpressionNodeJSON } from '../expression/ExpressionNode';
import Token from '../token/Token';
import BlockType from '../type/BlockType';
import Placeholder from './Placeholder';
import PlaceholderLine from './PlaceholderLine';

type MegaMap = Map<string, PlaceholderLine[]>;
type LineAlias = Map<PlaceholderLine, PlaceholderLine>;
interface InvocationResult {
  inPlace: PlaceholderLine[] | Placeholder;
  appendedAssemblies: PlaceholderLine[][];
  returnedPlaceholders: Placeholder[];

  // Each returned cuboid is associated with placeholder lines.
  returnedPlaceholderLines: PlaceholderLine[][];

  // This contains the placeholder lines for all cuboids a function call creates.
  // It includes both cuboids from the cuboid command and clones from reflect and translate.
  // In other words, this is broader than just the returned cuboids.
  createdPlaceholderLines: PlaceholderLine[];
}

interface Argument {
  evaluated: unknown;
  expression: ExpressionNode;
  placeholderLines: PlaceholderLine[] | undefined;
}

interface TranspileResult {
  text: string;
  expressions: {
    [key: number]: ExpressionNodeJSON[];
  };
  metadata: Map<string, number[]>;
}

export default class Transpiler {
  public transpile(program: ShapeAssemblyProgram): TranspileResult | undefined {
    if (program.errors.length) {
      return undefined;
    }
    return this.transpileValidProgram(program);
  }

  private tokenToKey(token: Token) {
    return `${token.start}/${token.end}`;
  }

  private extendMegaMap(megaMap: MegaMap, key: Token, value: PlaceholderLine[]) {
    const keyString = this.tokenToKey(key);
    if (!megaMap.has(keyString)) {
      megaMap.set(keyString, []);
    }
    megaMap.get(keyString)?.push(...value);
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

    // This directly maps highlightable tokens to the transpiled lines they represent.
    // The keys are token keys, i.e. `${token.start}/${token.end}`
    const megaMap = new Map<string, PlaceholderLine[]>();

    // This aliasing is needed for bounding box highlights to work properly.
    // When Python ShapeAssembly is transpiled, it first sees a subassembly's bounding box cuboid.
    // This cuboid line placeholder is eventually moved to inside the subassembly.
    // However, the server creates the bbox cuboid from the line that's outside the subassembly (the call).
    // This call line placeholder is a modified copy of the original that's created after the call.
    // Thus, at calling time, there's no valid placeholder that represents the bbox parameter.
    // This is why aliasing is applied after the fact to fix up the megaMap.
    const lineAlias = new Map<PlaceholderLine, PlaceholderLine>();

    // Get a transpiled version of an invocation of the root assembly's definition (with placeholders).
    const lines = this.transpileInvocation(rootDefinition, [], definitionMap, megaMap, lineAlias, program)
      .appendedAssemblies;

    // Fill in the placeholders.
    return this.populate(lines, megaMap, lineAlias);
  }

  private convertMegaMap(
    megaMap: MegaMap,
    assemblies: PlaceholderLine[][],
    lineAlias: LineAlias,
  ): Map<string, number[]> {
    // Map PlaceholderLine to number.
    const placeholderToLineIndex = new Map<PlaceholderLine, number>();
    let lineIndex = 0;
    for (const assembly of assemblies) {
      for (const line of assembly) {
        placeholderToLineIndex.set(line, lineIndex);
        lineIndex++;
      }
    }

    // Convert the megaMap.
    const converted = new Map<string, number[]>();
    megaMap.forEach((placeholderLines, key) => {
      const lineIndices: number[] = [];
      const addToLineIndices = (placeholderLine: PlaceholderLine) => {
        const lineIndex = placeholderToLineIndex.get(placeholderLine);
        if (lineIndex === undefined) {
          throw new Error('Could not find line index for placeholder line.');
        }
        lineIndices.push(lineIndex);
      };

      placeholderLines.forEach((placeholderLine) => {
        // Add the original line index.
        addToLineIndices(placeholderLine);

        // Add an alias if it exists.
        const alias = lineAlias.get(placeholderLine);
        if (alias) {
          addToLineIndices(alias);
        }
      });
      converted.set(key, lineIndices);
    });
    return converted;
  }

  private populate(assemblies: PlaceholderLine[][], megaMap: MegaMap, lineAlias: LineAlias): TranspileResult {
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
      metadata: this.convertMegaMap(megaMap, assemblies, lineAlias),
    };
  }

  private transpileInvocation(
    definition: Definition,
    invocationArguments: Argument[],
    definitionMap: Map<string, Definition>,
    megaMap: MegaMap,
    lineAlias: LineAlias,
    program: ShapeAssemblyProgram,
  ): InvocationResult {
    // Built-in functions don't spawn additional lines.
    if (definition.isBuiltIn) {
      // User-defined functions will return all of their transpiled lines here.
      // However, built-in functions don't, since a PlaceholderLine is created for them by the caller.
      return {
        inPlace: [],
        appendedAssemblies: [],
        returnedPlaceholders: [],
        returnedPlaceholderLines: [],
        createdPlaceholderLines: [],
      };
    }
    const createdPlaceholderLines: PlaceholderLine[] = [];

    // Map variable names to values.
    // The values are either numeric or placeholders for variables.
    const localValues = new Map<string, unknown>();
    const localExpressions = new Map<string, ExpressionNode>();
    const localPlaceholderLines = new Map<string, PlaceholderLine[]>();
    const mapLocalValueToPlaceholderLines = (token: Token, lines: PlaceholderLine[]) =>
      localPlaceholderLines.set(token.text, lines);

    definition.declaration.parameterTokens.forEach((token, index) => {
      const argument = invocationArguments[index];
      localValues.set(token.text, argument.evaluated);
      localExpressions.set(token.text, argument.expression);

      // Add the argument tokens to the megaMap.
      // The value of transpiledLines is non-undefined when the parameter is a cuboid.
      const placeholderLines = invocationArguments[index].placeholderLines;
      if (placeholderLines) {
        this.extendMegaMap(megaMap, token, placeholderLines);
        mapLocalValueToPlaceholderLines(token, placeholderLines);
      }
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

          // Add arguments to the megaMap.
          let placeholderLines: PlaceholderLine[] | undefined;
          if (invocation.argumentTypes[index] instanceof BlockType) {
            placeholderLines = localPlaceholderLines.get(argumentExpression.token.text);
            if (!placeholderLines) {
              throw new Error('Could not find transpiled lines for cuboid function argument.');
            }
            this.extendMegaMap(megaMap, argumentExpression.token, placeholderLines);
          }

          return {
            evaluated: evaluatedArgument,
            expression: substitutedArgument,
            placeholderLines,
          };
        },
      );

      const line = new PlaceholderLine(
        ['    '],
        invocationProcessedArguments.map((argument) => argument.expression),
        invocation,
      );

      // Invoke the function.
      const {
        inPlace,
        appendedAssemblies,
        returnedPlaceholders,
        returnedPlaceholderLines,
        createdPlaceholderLines: returnedCreatedPlaceholderLines,
      } = this.transpileInvocation(
        invocationDefinition,
        invocationProcessedArguments,
        definitionMap,
        megaMap,
        lineAlias,
        program,
      );
      appendedLines.push(...appendedAssemblies);
      createdPlaceholderLines.push(...returnedCreatedPlaceholderLines);

      // Manage megaMap mapping to subassemblies and functions/abstractions.
      // First, ensure that createdPlaceholderLines is updated.
      if (["Cuboid", "reflect", "translate"].includes(invocation.definitionToken.text)) {
        createdPlaceholderLines.push(line);
      }
      // Next, update the megaMap.
      if (!invocationDefinition.isBuiltIn && !invocationDefinition.isRootAssembly) {
        this.extendMegaMap(megaMap, invocation.definitionToken, returnedCreatedPlaceholderLines);
      }

      // If inPlace is a placeholder, it's a placeholder for an assembly.
      // This means that there's a bounding box cuboid call that needs to be replaced with the assembly placeholder.
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

            // Add the placeholder's declaration (the bbox creation line) to the assembly that needs it.
            for (const appendedAssembly of appendedLines) {
              if (appendedAssembly[0].containsPlaceholder(assemblyPlaceholder)) {
                const bboxLine = declarationLine.copy();
                bboxLine.replacePlaceholder(cuboidPlaceholder, 'bbox');
                appendedAssembly.splice(1, 0, bboxLine);

                // Add to the lineAlias.
                // This is necessary because the bbox is "created" in two places:
                // 1. Inside the subassembly. This is the original line the megaMap and localPlaceholderLines point to.
                // 2. At the call location. megaMap and localPlaceholderLines need to point here too, since this is the cuboid that the server ends up creating.
                lineAlias.set(declarationLine, bboxLine);
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

      // Add assignment if necessary.
      let isBoundingBoxLine = false;
      if (invocation.definitionToken.text === 'Cuboid') {
        const assignmentToken = invocation.assignmentTokens[0];
        const placeholder = assignmentToken.text === 'bbox' ? 'bbox' : new Placeholder(false, assignmentToken);
        isBoundingBoxLine = placeholder === 'bbox';
        if (assignmentToken) {
          localValues.set(assignmentToken.text, placeholder);
        }
        line.add(placeholder, ' = ');

        // Add to the megaMap for the assignment token itself.
        this.extendMegaMap(megaMap, assignmentToken, [line]);
        mapLocalValueToPlaceholderLines(assignmentToken, [line]);

        // Add to the megaMap for the function name.
        this.extendMegaMap(megaMap, invocation.definitionToken, [line]);
      } else if (!definition.isBuiltIn) {
        // Add assignments for user-defined functions.
        returnedPlaceholders.forEach((placeholder, index) => {
          const assignmentToken = invocation.assignmentTokens[index];
          const assignmentPlaceholders = returnedPlaceholderLines[index];
          localValues.set(assignmentToken.text, placeholder);
          this.extendMegaMap(megaMap, assignmentToken, assignmentPlaceholders);
          mapLocalValueToPlaceholderLines(assignmentToken, assignmentPlaceholders);
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

      // Add return tokens to the megaMap.
      const returnedPlaceholderLines: PlaceholderLine[][] = [];
      for (const returnedToken of definition.returnStatement?.tokens ?? []) {
        const returnedPlaceholderLinesForToken = localPlaceholderLines.get(returnedToken.text);
        if (!returnedPlaceholderLinesForToken) {
          throw new Error('Could not find placeholder lines for return token.');
        }
        this.extendMegaMap(megaMap, returnedToken, returnedPlaceholderLinesForToken);
        returnedPlaceholderLines.push(returnedPlaceholderLinesForToken);
      }
      return {
        inPlace: invocationLines,
        appendedAssemblies: appendedLines,
        returnedPlaceholders,
        returnedPlaceholderLines,
        createdPlaceholderLines,
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

        // Subassemblies don't return any cuboids, but they can still return created placeholder lines.
        // See the description of each of these for more details.
        returnedPlaceholderLines: [],
        createdPlaceholderLines,
      };
    }
  }
}
