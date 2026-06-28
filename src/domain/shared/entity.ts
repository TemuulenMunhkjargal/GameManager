export abstract class Entity<TId extends string> {
  protected constructor(public readonly id: TId) {}

  public equals(other: Entity<TId> | null | undefined): boolean {
    return !!other && this.id === other.id;
  }
}

