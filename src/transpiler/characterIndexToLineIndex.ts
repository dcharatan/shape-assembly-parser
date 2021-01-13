export default function characterIndexToLineIndex(characterIndex: number, lineBreaks: number[]) {
  let lineIndex = 0;
  for (const lineBreak of lineBreaks) {
    if (characterIndex > lineBreak) {
      lineIndex++;
    } else {
      break;
    }
  }
  return lineIndex;
}