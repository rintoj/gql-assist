import { Position, Range } from '../position'

export class Token {
  constructor(
    public index: number,
    public range: Range,
    public text: string,
  ) {}

  toString() {
    return this.text
  }

  setIndex(index: number) {
    this.index = index
    return this
  }

  setStart(start: Position) {
    this.range.start = start
    return this
  }

  setEnd(end: Position) {
    this.range.end = end
    return this
  }

  setStartLine(line: number) {
    this.range.start.line = line
    return this
  }

  setStartCharacter(character: number) {
    this.range.start.character = character
    return this
  }

  setEndLine(line: number) {
    this.range.end.line = line
    return this
  }

  setEndCharacter(character: number) {
    this.range.end.character = character
    return this
  }

  setRange(start: Position, end: Position) {
    this.range = new Range(start, end)
    return this
  }

  setText(text: string) {
    this.text = text
    return this
  }

  clone() {
    return new Token(
      this.index,
      new Range(
        new Position(this.range.start.line, this.range.start.character),
        new Position(this.range.end.line, this.range.end.character),
      ),
      this.text,
    )
  }
}
