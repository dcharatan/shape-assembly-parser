import Statement from '../statement/Statement';
import DEF_KEYWORD from './DefKeyword';

export default class DefinitionSplitter {
  public splitIntoDefinitions(statements: Statement[]): Statement[][] {
    const definitions: Statement[][] = [];
    let definition: Statement[] = [];

    const pushValidDefinition = () => {
      if (definition.length > 0) {
        definitions.push(definition);
      }
      definition = [];
    };

    statements.forEach((statement) => {
      if (statement.tokens[0].text === DEF_KEYWORD) {
        pushValidDefinition();
      }
      definition.push(statement);
    });
    pushValidDefinition();

    return definitions;
  }
}
