import Statement from '../statement/Statement';
import DEF_KEYWORD from './DefKeyword';
import { annotationKeywords } from '../annotation/annotationKeywords';

export default class DefinitionSplitter {
  public splitIntoDefinitions(statements: Statement[]): Statement[][] {
    const definitions: Statement[][] = [];
    let definition: Statement[] = [];
    let lastStatementWasAnnotation = false;

    const pushValidDefinition = () => {
      if (definition.length > 0) {
        definitions.push(definition);
      }
      definition = [];
    };

    for (const statement of statements) {
      const isAnnotation = annotationKeywords.has(statement.tokens[0].text);
      if (isAnnotation) {
        pushValidDefinition();
      }
      if (statement.tokens[0].text === DEF_KEYWORD && !lastStatementWasAnnotation) {
        pushValidDefinition();
      }
      definition.push(statement);
      lastStatementWasAnnotation = isAnnotation;
    }
    pushValidDefinition();

    return definitions;
  }
}
