export type Result<T> = Success<T> | Failure;

export type Success<T> = {
  ok: true;
  value: T;
};

export type Failure = {
  ok: false;
  error: string;
};

export const success = <T>(value: T): Result<T> => ({ ok: true, value });

export const failure = (error: string): Result<never> => ({ ok: false, error });

