export class Position {
  constructor(
    public line: number,
    public character: number,
  ) {}
  setLine(line: number) {
    this.line = line
    return this
  }

  setCharacter(character: number) {
    this.character = character
    return this
  }

  clone() {
    return new Position(this.line, this.character)
  }
}

export class Range {
  constructor(
    public start: Position,
    public end: Position,
  ) {}

  setStart(start: Position) {
    this.start = start
    return this
  }

  setEnd(end: Position) {
    this.end = end
    return this
  }

  clone() {
    return new Range(this.start.clone(), this.end.clone())
  }
}

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

export function splitTokens(content: string) {
  let line = 0
  let position = 0
  // const tokens = [...(content.match(/\s+|\S+/g) ?? [content])]
  const tokens = content.split('\n')
  return tokens.map((token, index) => {
    const composed = new Token(
      index,
      new Range(new Position(line, position), new Position(line, position + token.length)),
      token,
    )
    if (token === '\n') {
      line++
      position = 0
    } else {
      position += token.length
    }
    return composed
  })
}
