import Placeholder from './Placeholder';

type PlaceholderComponent = string | Placeholder;

export default class PlaceholderLine {
  constructor(private content: PlaceholderComponent[] = []) {}

  public add(...components: PlaceholderComponent[]) {
    this.content.push(...components);
  }

  public replacePlaceholder(find: Placeholder, replace: Placeholder) {
    this.content.forEach((entry, index) => {
      if (entry === find) {
        this.content[index] = replace;
      }
    });
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
