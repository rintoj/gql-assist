import { Position } from '../diff'

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
