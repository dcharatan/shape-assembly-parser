import { ShapeAssemblyProgram } from "..";

export default class Transpiler {
  public transpile(program: ShapeAssemblyProgram): string | undefined {
    if (program.errors.length) {
      return undefined;
    }
    try {
      return this.transpileValidProgram(program);
    } catch (e) {
      return undefined;
    }
  }

  private transpileValidProgram(program: ShapeAssemblyProgram): string | undefined {
    // Find the root assembly.
    const rootDefinition = program.definitions.find((definition) => definition.isRootAssembly);
    if (!rootDefinition) {
      return undefined;
    }

    // Process the root.
    const lines: string[] = [];
    for (const invocation of rootDefinition.invocations) {
      let line = '';

      // Add assignment to the line.
      if (invocation.assignmentToken) {
        line += `${invocation.assignmentToken.text} = `;
      }

      // Add function call to the line.
      line += `${invocation.definitionToken.text}(`;

      // Add arguments to the line.
      invocation.argumentExpressions.forEach((argument, index) => {
        line += argument.token; // TODO: Evaluate expressions instead of using the tokens directly.
        const isLastArgument = index === invocation.argumentExpressions.length;
        if (!isLastArgument) {
          line += ', ';
        }
      });

      // Add the closing parenthesis to the line.
      line += ')';
      lines.push(line);
    }

    return `Assembly Program_0 {\n${lines.join('\n')}\n}`
  }
}