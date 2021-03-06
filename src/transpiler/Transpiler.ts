import { ShapeAssemblyProgram } from '..';
import Definition from '../definition/Definition';
import ExpressionNode, { ExpressionNodeJSON } from '../expression/ExpressionNode';
import Token from '../token/Token';
import BlockType from '../type/BlockType';
import Placeholder from './Placeholder';
import PlaceholderLine from './PlaceholderLine';

type HighlightVariant = 'primary' | 'secondary';
type Highlight = {
  placeholderLine: PlaceholderLine;
  variant: HighlightVariant;
};
type LineHighlight = {
  line: number;
  variant: HighlightVariant;
};
type MegaMap = Map<string, Highlight[]>;
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
  metadata: Map<string, LineHighlight[]>;
  assemblyMap: Map<string, string>, // This maps transpiled assembly names to their original assembly names.
}

interface TranspilerOptions {
  doBboxAttachPostprocessing: boolean | undefined;
  doBboxParamSubstitution: boolean | undefined;
}

export default class Transpiler {
  public transpile(program: ShapeAssemblyProgram, options?: TranspilerOptions): TranspileResult | undefined {
    if (program.errors.length) {
      return undefined;
    }
    const transpiled = this.transpileValidProgram(program);
    if (!transpiled) {
      return transpiled;
    }
    if (options?.doBboxParamSubstitution) {
      transpiled.text = this.doBboxParamSubstitution(transpiled.text);
    }
    if (options?.doBboxAttachPostprocessing) {
      transpiled.text = this.doBboxAttachPostprocessing(transpiled.text);
    }
    return transpiled;
  }

  private doBboxParamSubstitution(transpiled: string): string {
    // Record the assembly dependency order.
    // Also track bbox param values for each assembly.
    const parentMap = new Map<string, string>();
    const childMap = new Map<string, string[]>();
    const bboxParamValues = new Map<string, Map<string, string>>();
    let currentAssembly: string | undefined;
    for (const line of transpiled.split('\n')) {
      if (line.includes('Assembly')) {
        currentAssembly = line.split(' ')[1];
      } else if (line.includes('Program_') && line.includes('=')) {
        const dependent = line.split('=')[0].trim();
        if (!currentAssembly) {
          throw new Error('Could not find parent for assembly.');
        }
        parentMap.set(dependent, currentAssembly);
        if (!childMap.has(currentAssembly)) {
          childMap.set(currentAssembly, []);
        }
        childMap.get(currentAssembly)?.push(dependent);
      } else if (line.includes('bbox = Cuboid')) {
        const components = line.split(',');
        const bboxParams = new Map<string, string>();
        bboxParams.set('f_bb_x', components[0].split('(')[1].trim());
        bboxParams.set('f_bb_y', components[1].trim());
        bboxParams.set('f_bb_z', components[2].trim());
        if (!currentAssembly) {
          throw new Error('Could not find parent for assembly.');
        }
        bboxParamValues.set(currentAssembly, bboxParams);
      }
    }

    // Do a topsort to update f_bb_x/y/z bbox parameters with their parents' values.
    const queue = ['Program_0'];
    while (queue.length > 0) {
      const parent = queue.pop();
      if (!parent) {
        throw new Error('This should literally never happen.');
      }
      const parentBboxParams = bboxParamValues.get(parent);
      if (!parentBboxParams) {
        throw new Error('This should literally never happen.');
      }

      // Go to the parent's children.
      for (const child of childMap.get(parent) ?? []) {
        const childBboxParams = bboxParamValues.get(child);
        childBboxParams?.forEach((value, key) => {
          if (key.includes('f_bb') && value.includes('f_bb')) {
            childBboxParams.set(key, parentBboxParams.get(key) ?? '');
          }
        });
        queue.push(child);
      }
    }

    const postprocessedLines: string[] = [];
    currentAssembly = undefined;
    for (const line of transpiled.split('\n')) {
      // Record the current assembly.
      if (line.includes('Assembly')) {
        currentAssembly = line.split(' ')[1];
      }

      // Choose the parent assembly for the substitution.
      // For bounding box declarations, it's the parent bounding box.
      // For everything else, it's the current bounding box.
      let parentAssembly = currentAssembly;
      if (line.includes('bbox = Cuboid')) {
        if (!currentAssembly) {
          throw new Error('Could not find current assembly.');
        }
        parentAssembly = parentMap.get(currentAssembly);
      }

      // Make the substitutions.
      const bboxParams = parentAssembly ? bboxParamValues.get(parentAssembly) : bboxParamValues.get('Program_0');
      if (!bboxParams) {
        throw new Error('Could not find bbox param values.');
      }
      let postprocessedLine = line;
      bboxParams.forEach((newValue, oldValue) => {
        postprocessedLine = postprocessedLine.replace(oldValue, newValue);
      });
      postprocessedLines.push(postprocessedLine);
    }
    return postprocessedLines.join('\n');
  }

  private doBboxAttachPostprocessing(transpiled: string): string {
    const postprocessedLines: string[] = [];
    for (const line of transpiled.split('\n')) {
      // Flip the 7th attach parameter if the 2nd cuboid is a bounding box.
      const components = line.split(',');
      if (line.includes('attach') && components[1].includes('bbox')) {
        components[6] = ` ${1 - parseFloat(components[6])}`;
        postprocessedLines.push(components.join(','));
      } else {
        postprocessedLines.push(line);
      }
    }
    return postprocessedLines.join('\n');
  }

  private tokenToKey(token: Token) {
    return `${token.start}/${token.end}`;
  }

  private makeHighlight(placeholderLines: PlaceholderLine[], variant: HighlightVariant): Highlight[] {
    return placeholderLines.map((placeholderLine) => ({ placeholderLine, variant }));
  }

  private extendMegaMap(megaMap: MegaMap, key: Token, value: Highlight[]) {
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
    const megaMap = new Map<string, Highlight[]>();

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
  ): Map<string, LineHighlight[]> {
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
    const converted = new Map<string, LineHighlight[]>();
    megaMap.forEach((highlights, key) => {
      const lineIndices: LineHighlight[] = [];
      const addToLineIndices = ({ placeholderLine, variant }: Highlight) => {
        const lineIndex = placeholderToLineIndex.get(placeholderLine);
        if (lineIndex === undefined) {
          throw new Error('Could not find line index for placeholder line.');
        }
        lineIndices.push({
          line: lineIndex,
          variant,
        });
      };

      highlights.forEach((highlight) => {
        // Add the original line index.
        addToLineIndices(highlight);

        // Add an alias if it exists.
        const alias = lineAlias.get(highlight.placeholderLine);
        if (alias) {
          addToLineIndices({
            placeholderLine: alias,
            variant: highlight.variant,
          });
        }
      });
      converted.set(key, lineIndices);
    });
    return converted;
  }

  private populate(assemblies: PlaceholderLine[][], megaMap: MegaMap, lineAlias: LineAlias): TranspileResult {
    const placeholderMap = new Map<Placeholder, string>();

    // Map assembly placeholders.
    const assemblyMap = new Map<string, string>();
    assemblies.forEach((assembly, index) => {
      const placeholder = assembly[0].firstAssemblyPlaceholder();
      const transpiledAssemblyName = `Program_${index}`;
      placeholderMap.set(placeholder, transpiledAssemblyName);
      if (placeholder.assemblyName) {
        assemblyMap.set(transpiledAssemblyName, placeholder.assemblyName);
      }
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
      assemblyMap,
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
        this.extendMegaMap(megaMap, token, this.makeHighlight(placeholderLines, 'primary'));
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
            this.extendMegaMap(megaMap, argumentExpression.token, this.makeHighlight(placeholderLines, 'primary'));
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
      if (['Cuboid', 'reflect', 'translate'].includes(invocation.definitionToken.text)) {
        createdPlaceholderLines.push(line);
      }
      // Next, update the megaMap.
      if (!invocationDefinition.isBuiltIn && !invocationDefinition.isRootAssembly) {
        this.extendMegaMap(
          megaMap,
          invocation.definitionToken,
          this.makeHighlight(returnedCreatedPlaceholderLines, 'primary'),
        );
      }

      // Manage megaMap mappings for attach, squeeze, reflect and translate.
      if (invocationDefinition.isBuiltIn) {
        const functionNameToken = invocation.definitionToken;
        const functionName = functionNameToken.text;
        const argumentTokens = invocation.argumentExpressions.map((expression) => expression.token);
        const lines = argumentTokens.map((token) => localPlaceholderLines.get(token.text));
        if (functionName === 'attach') {
          if (!lines[0] || !lines[1]) {
            throw new Error('Could not find placeholder lines for attach arguments.');
          }
          this.extendMegaMap(megaMap, functionNameToken, this.makeHighlight(lines[0], 'primary'));
          this.extendMegaMap(megaMap, functionNameToken, this.makeHighlight(lines[1], 'secondary'));
        } else if (functionName === 'squeeze') {
          if (!lines[0] || !lines[1] || !lines[2]) {
            throw new Error('Could not find placeholder lines for squeeze arguments.');
          }
          this.extendMegaMap(megaMap, functionNameToken, this.makeHighlight(lines[0], 'primary'));
          this.extendMegaMap(megaMap, functionNameToken, this.makeHighlight([...lines[1], ...lines[2]], 'secondary'));
        } else if (functionName === 'translate' || functionName === 'reflect') {
          if (!lines[0]) {
            throw new Error(`Could not find placeholder lines for ${functionName} arguments.`);
          }
          this.extendMegaMap(megaMap, functionNameToken, this.makeHighlight(lines[0], 'primary'));
          this.extendMegaMap(megaMap, functionNameToken, this.makeHighlight([line], 'secondary'));
        }
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
        const placeholder = assignmentToken.text === 'bbox' ? 'bbox' : new Placeholder(undefined, assignmentToken);
        isBoundingBoxLine = placeholder === 'bbox';
        if (assignmentToken) {
          localValues.set(assignmentToken.text, placeholder);
        }
        line.add(placeholder, ' = ');

        // Add to the megaMap for the assignment token itself.
        this.extendMegaMap(megaMap, assignmentToken, this.makeHighlight([line], 'primary'));
        mapLocalValueToPlaceholderLines(assignmentToken, [line]);

        // Add to the megaMap for the function name.
        this.extendMegaMap(megaMap, invocation.definitionToken, this.makeHighlight([line], 'primary'));
      } else if (!definition.isBuiltIn) {
        // Add assignments for user-defined functions.
        returnedPlaceholders.forEach((placeholder, index) => {
          const assignmentToken = invocation.assignmentTokens[index];
          const assignmentPlaceholders = returnedPlaceholderLines[index];
          localValues.set(assignmentToken.text, placeholder);
          this.extendMegaMap(megaMap, assignmentToken, this.makeHighlight(assignmentPlaceholders, 'primary'));
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
        this.extendMegaMap(megaMap, returnedToken, this.makeHighlight(returnedPlaceholderLinesForToken, 'primary'));
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
      const placeholder = new Placeholder(definition.declaration.nameToken.text);
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
