/**
 * Utility helpers for working with unknown error values.
 * Provides consistent messaging for logging and user feedback.
 */
export type UnknownError = unknown;

export const getErrorMessage = (error: UnknownError): string => {
  if (error instanceof Error && typeof error.message === 'string') {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
};

export const getErrorStack = (error: UnknownError): string | undefined => {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
};

export const normalizeError = (error: UnknownError): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(getErrorMessage(error));
};

export class DatabaseError extends Error {
  public readonly cause: UnknownError;

  constructor(message: string, cause?: UnknownError) {
    super(message);
    this.name = 'DatabaseError';
    this.cause = cause ?? null;
  }
}
