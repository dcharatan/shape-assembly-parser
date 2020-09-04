import { ShapeAssemblyProgram } from "..";
import Definition from "../definition/Definition";

// WARNING: This code is really hacky. It wasn't supposed to get this bad.
// This code has no tests because it's completely impractical to test.
// Ideally, we would improve the native ShapeAssembly parser to more closely resemble "syntax sugar" ShapeAssembly.
// Until that's done, this transpiles "syntax sugar" ShapeAssembly into normal ShapeAssembly.
// However, expanding functions as macros and adding subassemblies messes with the cuboid numbering, so
// subassemblies and functions can mess with the cuboid numbering and produce invalid results.

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

    // Define transpilation for a function call.
    let assemblyIndex = 0;
    const processInvocation = (definition: Definition, args: Map<string, unknown>, addedFirstLine?: string, doNotIncrementAssemblyIndex: boolean = false): [number, string, string] => {
      const index = assemblyIndex;
      if (!doNotIncrementAssemblyIndex) {
        assemblyIndex++;
      }
      const lines: string[] = addedFirstLine ? [addedFirstLine] : [];
      let cubeIndex = 0;
      const variableNameToCubeName = new Map<string, string>();
      let appendText = '';
      for (const invocation of definition.invocations) {
        // Find the corresponding definition.
        const definition = program.definitions.find((d) => d.declaration.nameToken.text === invocation.definitionToken.text);
        if (!definition) {
          throw new Error('definition not found for invocation');
        }
        let line = '    ';

        // Add assignment to the line.
        if (invocation.assignmentToken) {
          const variableName = invocation.assignmentToken.text;
          if (variableName === 'bbox') {
            line += 'bbox = ';
          } else {
            // Translate any non-bbox assignment tokens.
            // TODO: Don't assume that all assignments are cuboids.
            const cubeName = `cube${cubeIndex}`;
            variableNameToCubeName.set(variableName, cubeName);
            line += `${cubeName} = `;
            cubeIndex++;
          }
        } else if (invocation.definitionToken.text === 'Cuboid') {
          // Cuboid statements without a reference still need a number in original ShapeAssembly.
          const cubeName = `cube${cubeIndex}`;
          line += `${cubeName} = `;
          cubeIndex++;
        }

        // Evaluate the arguments.
        const evaluatedArguments = invocation.argumentExpressions.map((argument, index) => {
          const argumentType = definition.argumentTypes[index];
          return argument.evaluate(argumentType, args);
        });

        // Add the function call to the line.
        if (definition.isBuiltIn) {
          // Add function call itself to the line (for basic functions).
          line += `${invocation.definitionToken.text}(`;
        } else if (definition.isChildAssembly) {
          // Expand into subassembly for child assemblies.
          const argMap = new Map<string, unknown>();
          evaluatedArguments.forEach((arg, index) => argMap.set(definition.declaration.parameterTokens[index].text, arg));

          // Spooky hacks incoming!!
          // Remove the line that made the bbox cuboid, update all cuboid indices, and decrement cubeIndex.
          let found = false;
          const zappedCubeName = variableNameToCubeName.get(invocation.argumentExpressions[0].token.text);
          if (!zappedCubeName) {
            throw new Error('how did u expect this hacky transpiler thing to even work lmao');
          }
          let zappedLineIndex: number = -1;
          const needsFix: Set<number> = new Set();
          lines.forEach((prevLine, index) => {
            // Get the zapped cuboid.
            if (!found && prevLine.includes(zappedCubeName + ' =')) {
              zappedLineIndex = index;
              found = true;
            }

            // "Fix" all of the following cuboid indices by lowering them by one.
            else if (found) {
              const parts = prevLine.trim().split(' ');
              if (parts.length >= 2 && parts[1] === '=' && parts[0].includes('cube')) {
                const cubeIndex = Number.parseFloat(parts[0].slice(4));
                if (isNaN(cubeIndex)) {
                  throw new Error('bad number parsing uh oh');
                }
                needsFix.add(cubeIndex);
                parts[0] = `***TEMPCUBE***${cubeIndex - 1}`;
                lines[index] = '    ' + parts.join(' ');
              }
            }
          });
          lines.forEach((line, index) => {
            for (const fix of Array.from(needsFix)) {
              lines[index] = line.replace(`cube${fix}`, `***TEMPCUBE***${fix - 1}`);
            }
          });
          lines.forEach((line, index) => {
            lines[index] = line.replace('***TEMPCUBE***', 'cube');
          });

          // Get the zapped line's arguments.
          const zappedLine = lines[zappedLineIndex];
          const leftInclusive = zappedLine.indexOf('(') + 1;
          const rightExclusive = zappedLine.length - 1;
          if (zappedLine.charAt(zappedLine.length - 1) !== ')') {
            throw new Error('bad assumption, closing ) is not there');
          }
          const zappedLineArgs = zappedLine.slice(leftInclusive, rightExclusive);

          // Zap the line.
          lines.splice(zappedLineIndex, 1);
          cubeIndex--;

          // Make the child.
          const [childAssemblyIndex, childText, moreAppendText] = processInvocation(definition, argMap, `    bbox = Cuboid(${zappedLineArgs})`);
          appendText += childText + moreAppendText;
          line += `Program_${childAssemblyIndex} = Cuboid(${zappedLineArgs}`;
        }

        if (!definition.isBuiltIn && !definition.isChildAssembly && !definition.isRootAssembly) {
          // Functions work like macros.
          const argMap = new Map<string, unknown>();
          evaluatedArguments.forEach((arg, index) => argMap.set(definition.declaration.parameterTokens[index].text, arg));
          const res = processInvocation(definition, argMap, undefined, true);
          appendText += res[2];

          // The first and last lines have to be discarded.
          const parts = res[1].trim().split('\n');
          const usedParts = parts.slice(1, parts.length - 1);

          // The used parts' cuboid indices need to be updated to match.
          ////////////////////////////
          // THE FIXER
          let macroIndex = 0;
          let found = true;
          while (found) {
            found = false;
            const oldCube = `cube${macroIndex}`;
            const newCube = `***TEMPCUBE***${macroIndex + cubeIndex}`;
            usedParts.forEach((usedPart, index) => {
              found = found || usedPart.includes(oldCube);
              usedParts[index] = usedPart.replace(oldCube, newCube);
            });
            if (found) {
              macroIndex++;
            }
          }
          cubeIndex += macroIndex;
          usedParts.forEach((usedPart, index) => {
            usedParts[index] = usedPart.replace('***TEMPCUBE***', 'cube');
          });
          ////////////////////////////
          lines.push(...usedParts);
        } else {
          // Add arguments to the line.
          if (!definition.isChildAssembly) {
            invocation.argumentExpressions.forEach((argument, index) => {
              // Replace cuboid arguments with the corresponding cuboid names.
              const argumentIsCuboid = definition.argumentTypes[index].name === 'block';
              const fix = (arg: any) => {
                if (arg === true) {
                  return 'True';
                }
                if (arg === false) {
                  return 'False';
                }
                return arg;
              }
              line += argumentIsCuboid ? variableNameToCubeName.get(argument.token.text) ?? 'bbox' : fix(evaluatedArguments[index]);
              const isLastArgument = index === invocation.argumentExpressions.length - 1;
              if (!isLastArgument) {
                line += ', ';
              }
            });
          }

          // Add the closing parenthesis to the line.
          line += ')';

          // bbox needs to be the first line
          if (line.trim().split(' ')[0] === 'bbox') {
            lines.unshift(line);
          } else {
            lines.push(line);
          }
        }
      }
      return [index, `Assembly Program_${index} {\n${lines.join('\n')}\n}\n`, appendText];
    };

    // Recursively process all function calls.
    const result = processInvocation(rootDefinition, new Map());
    return result[1] + result[2];
  }
}