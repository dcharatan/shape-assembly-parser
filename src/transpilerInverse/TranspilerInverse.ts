export default class TranspilerInverse {
  private getAssemblyIndex(x: string) {
    return Number.parseInt(x.slice(x.indexOf('Program_') + 'Program_'.length));
  }

  public transpile(program: string): string {
    const assemblies: string[] = [];
    const lines = program.split('\n');
    let currentAssembly = '';
    let currentAssemblyIsRoot = true;

    const append = (text: string) => (currentAssembly += text + '\n');

    for (const line of lines) {
      // Handle assembly declarations.
      if (line.includes('Assembly Program_')) {
        // Get the assembly number.
        const assemblyNumber = Number.parseInt(line.slice('Assembly Program_'.length));
        currentAssembly = '';
        append(assemblyNumber ? '@child_assembly' : '@root_assembly');
        if (assemblyNumber) {
          append(`def make_subassembly_${assemblyNumber}(bbox):`);
        } else {
          append('def make_root_assembly():')
        }
        currentAssemblyIsRoot = assemblyNumber === 0;
      }

      // For child assemblies, skip the bbox declaration.
      else if (line.includes('bbox =') && !currentAssemblyIsRoot) {
        continue;
      }

      // Handle abstractions.
      else if (line.includes('abstraction')) {
        const equalsIndex = line.indexOf('=');
        append(`    ${line.trim().replace(new RegExp('Program_', 'g'), 'sub_bbox_')}`);
        if (equalsIndex >= 0) {
          const args = line
            .substring(0, equalsIndex)
            .split(',')
            .map((x) => x.trim());
          for (const arg of args) {
            if (arg.includes('Program_')) {
              const assemblyNumber = this.getAssemblyIndex(arg);
              append(`    make_subassembly_${assemblyNumber}(sub_bbox_${assemblyNumber})`);
            }
          }
        }
      }

      // Handle subassembly invocations.
      else if (line.includes('Program_') && line.includes('=')) {
        const assemblyNumber = this.getAssemblyIndex(line);
        append(`    sub_bbox_${assemblyNumber} ${line.slice(line.indexOf('='))}`);
        append(`    make_subassembly_${assemblyNumber}(sub_bbox_${assemblyNumber})`);
      }

      // Skip closing parentheses.
      else if (line.includes('}')) {
        assemblies.unshift(currentAssembly);
      }

      // Handle all other lines.
      else {
        append(`    ${line.trim().replace(new RegExp('Program_', 'g'), 'sub_bbox_')}`);
      }
    }

    return assemblies.join('\n');
  }
}
