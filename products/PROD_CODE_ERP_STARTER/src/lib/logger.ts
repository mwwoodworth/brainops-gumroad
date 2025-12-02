import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface TraceMetadata {
  traceId?: string;
  spanId?: string;
  requestId?: string;
}

interface NormalizedLog {
  message: string;
  context: Record<string, unknown>;
  error?: Error;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info');

type MaybeHub = {
  getClient?: () => unknown;
  getScope?: () => {
    getSpan?: () => { traceId?: string; spanId?: string };
    getTags?: () => Record<string, unknown>;
  };
};

const getHub = (): MaybeHub | null => {
  try {
    const namespace = Sentry as Record<string, unknown>;
    const candidate = namespace?.['getCurrentHub'];
    if (typeof candidate === 'function') {
      return (candidate as () => MaybeHub)();
    }
  } catch {
    // ignore
  }
  return null;
};

const hasSentryClient = (): boolean => {
  try {
    return Boolean(getHub()?.getClient?.());
  } catch {
    return false;
  }
};

const shouldLog = (level: LogLevel): boolean => LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];

const safeSerialize = (value: unknown): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }

  return value;
};

const normaliseLogArgs = (args: unknown[]): NormalizedLog => {
  if (!args.length) {
    return { message: '', context: {} };
  }

  const argList = [...args];
  let message = '';

  if (typeof argList[0] === 'string') {
    message = argList.shift() as string;
  }

  const context: Record<string, unknown> = {};
  let error: Error | undefined;

  argList.forEach((value, index) => {
    if (value instanceof Error) {
      if (!error) {
        error = value;
        if (!message) {
          message = value.message ?? 'Error';
        }
      }
      context[`error_${index}`] = safeSerialize(value);
      return;
    }

    if (typeof value === 'object' && value !== null) {
      Object.assign(context, safeSerialize(value) as Record<string, unknown>);
      return;
    }

    context[`arg_${index}`] = safeSerialize(value);
  });

  return {
    message,
    context,
    error,
  };
};

const getTraceMetadata = (context: Record<string, unknown>): TraceMetadata => {
  const trace: TraceMetadata = {};

  if (typeof context.traceId === 'string') {
    trace.traceId = context.traceId;
  }

  if (typeof context.requestId === 'string') {
    trace.requestId = context.requestId;
  }

  try {
    type SentryScope = {
      getSpan?: () => { traceId?: string; spanId?: string };
      getTags?: () => Record<string, string | undefined>;
    };
    const scope = getHub()?.getScope?.() as SentryScope | undefined;
    const span = scope?.getSpan?.();
    if (span) {
      trace.traceId ??= span.traceId;
      trace.spanId = span.spanId;
    }

    const dynamicScope = scope as unknown as {
      getTransaction?: () => { traceId?: string };
    };
    const transactionTraceId = dynamicScope?.getTransaction?.()?.traceId;
    if (transactionTraceId) {
      trace.traceId ??= transactionTraceId;
    }

    const tags = scope?.getTags?.();
    const requestIdTag = tags?.request_id || tags?.requestId;
    if (typeof requestIdTag === 'string') {
      trace.requestId ??= requestIdTag;
    }
  } catch {
    // Ignore Sentry access failures
  }

  return trace;
};

const emitToConsole = (level: LogLevel, payload: Record<string, unknown>, error?: Error) => {
  const serialized = JSON.stringify(payload);

  switch (level) {
    case 'debug':
      console.debug(serialized);
      break;
    case 'info':
      console.info(serialized);
      break;
    case 'warn':
      console.warn(serialized);
      break;
    case 'error':
      console.error(serialized);
      if (error?.stack) {
        console.error(error.stack);
      }
      break;
  }
};

const mapLevelToSentry = (level: LogLevel): Sentry.SeverityLevel => {
  if (level === 'warn') {
    return 'warning';
  }
  return level as Sentry.SeverityLevel;
};

const captureWithSentry = (
  level: LogLevel,
  message: string,
  context: Record<string, unknown>,
  trace: TraceMetadata,
  error?: Error,
  scope?: string
) => {
  if (!hasSentryClient()) {
    return;
  }

  const captureContext: Parameters<typeof Sentry.captureException>[1] = {
    tags: {
      ...(scope ? { 'logger.scope': scope } : {}),
      ...(trace.traceId ? { trace_id: trace.traceId } : {}),
      ...(trace.spanId ? { span_id: trace.spanId } : {}),
      ...(trace.requestId ? { request_id: trace.requestId } : {}),
    },
    extra: context,
    level: mapLevelToSentry(level),
  };

  if (error) {
    Sentry.captureException(error, captureContext);
  } else if (message) {
    Sentry.captureMessage(message, captureContext);
  }
};

class StructuredLogger {
  constructor(private readonly scope?: string) {}

  debug(...args: unknown[]) {
    this.log('debug', args);
  }

  info(...args: unknown[]) {
    this.log('info', args);
  }

  warn(...args: unknown[]) {
    this.log('warn', args);
  }

  error(...args: unknown[]) {
    this.log('error', args);
  }

  private log(level: LogLevel, args: unknown[]) {
    if (!shouldLog(level)) {
      return;
    }

    const { message, context, error } = normaliseLogArgs(args);
    const trace = getTraceMetadata(context);
    const timestamp = new Date().toISOString();

    const payload: Record<string, unknown> = {
      ts: timestamp,
      level,
      message,
      ...(this.scope ? { scope: this.scope } : {}),
      ...trace,
      ...context,
    };

    emitToConsole(level, payload, error);

    if (level === 'error') {
      captureWithSentry(level, message, context, trace, error, this.scope);
    }
  }
}

export const logger = new StructuredLogger();

export const createLogger = (scope: string) => new StructuredLogger(scope);
