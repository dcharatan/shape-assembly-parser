import Placeholder from './Placeholder';
import Invocation from '../invocation/Invocation';

type PlaceholderComponent = string | Placeholder;

export default class PlaceholderLine {
  constructor(private content: PlaceholderComponent[] = [], public readonly invocation?: Invocation) {}

  public add(...components: PlaceholderComponent[]) {
    this.content.push(...components);
  }

  public replacePlaceholder(find: Placeholder, replace: PlaceholderComponent) {
    this.content.forEach((entry, index) => {
      if (entry === find) {
        this.content[index] = replace;
      }
    });
  }

  public getAssignmentPlaceholder(): Placeholder | undefined {
    if (this.content.length >= 3 && this.content[1] instanceof Placeholder && this.content[2] === ' = ') {
      return this.content[1];
    }
    return undefined;
  }

  public fillPlaceholders(fill: Map<Placeholder, string>) {
    this.content.forEach((entry, index) => {
      if (entry instanceof Placeholder) {
        this.content[index] = fill.get(entry) ?? 'bbox';
      }
    });
  }

  public firstAssemblyPlaceholder(): Placeholder {
    const placeholder = this.content.find((entry) => entry instanceof Placeholder && entry.forAssembly);
    if (!placeholder || !(placeholder instanceof Placeholder)) {
      throw new Error('No assembly placeholder found.');
    }
    return placeholder;
  }

  public containsPlaceholder(placeholder: Placeholder) {
    return this.content.some((entry) => entry === placeholder);
  }

  public copy(): PlaceholderLine {
    return new PlaceholderLine([...this.content]);
  }

  public evaluate(): string {
    let line = '';
    for (const component of this.content) {
      if (component instanceof Placeholder) {
        line += component.getText();
      } else {
        line += component;
      }
    }
    return line;
  }
}
