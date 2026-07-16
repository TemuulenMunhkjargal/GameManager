const ID_PREFIX = /^[a-z][a-z0-9_]*$/;

export function createId(prefix: string): string {
  if (!ID_PREFIX.test(prefix)) throw new Error("ID prefixes must use lowercase letters, numbers, and underscores.");
  return `${prefix}_${crypto.randomUUID()}`;
}
