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
