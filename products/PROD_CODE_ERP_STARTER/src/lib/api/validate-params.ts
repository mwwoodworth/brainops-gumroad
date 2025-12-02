import { NextRequest } from 'next/server';

export function validateJobIdParam(request: NextRequest): string | null {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return null;
  }

  return id;
}

export function validateRequiredParams(params: Record<string, any>, required: string[]): string | null {
  for (const param of required) {
    if (!params[param]) {
      return `Missing required parameter: ${param}`;
    }
  }
  return null;
}
