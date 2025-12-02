import { NextResponse } from 'next/server';

export type ApiStatus = 'success' | 'error';

export type ApiResponsePayload<T> = {
  status: ApiStatus;
  success?: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false;
  return Object.getPrototypeOf(value) === Object.prototype;
};

export function apiSuccess<T>(
  data: T,
  init?: ResponseInit,
  meta?: ApiResponsePayload<T>['meta']
) {
  const payload: ApiResponsePayload<T> & Record<string, unknown> = {
    status: 'success',
    success: true,
    data,
  };

  if (meta && Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  if (isPlainObject(data)) {
    Object.assign(payload, data as Record<string, unknown>);
  }

  return NextResponse.json(payload, init);
}

export function apiError(
  error: string,
  init?: ResponseInit,
  meta?: ApiResponsePayload<never>['meta']
) {
  const payload: ApiResponsePayload<never> & Record<string, unknown> = {
    status: 'error',
    success: false,
    error,
  };

  if (meta && Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  return NextResponse.json(payload, init ?? { status: 500 });
}
