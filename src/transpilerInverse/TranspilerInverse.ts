export default class TranspilerInverse {
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
        append(`def assembly_fn_${assemblyNumber}(${assemblyNumber ? 'bbox' : ''}):`);
        currentAssemblyIsRoot = assemblyNumber === 0;
      }

      // For child assemblies, skip the bbox declaration.
      else if (line.includes('bbox =') && currentAssemblyIsRoot) {
        continue;
      }

      // Handle subassembly invocations.
      else if (line.includes('Program_') && line.includes('=')) {
        const assemblyNumber = Number.parseInt(line.slice(line.indexOf('Program_') + 'Program_'.length));
        append(`    bbox_fn_${assemblyNumber} ${line.slice(line.indexOf('='))}`);
        append(`    assembly_fn_${assemblyNumber}(bbox_fn_${assemblyNumber})`);
      }

      // Skip closing parentheses.
      else if (line.includes('}')) {
        assemblies.unshift(currentAssembly);
      }

      // Handle all other lines.
      else {
        append(`    ${line.trim().replace('Program_', 'bbox_fn_')}`);
      }
    }

    return assemblies.join('\n');
  }
}
