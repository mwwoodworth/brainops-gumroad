export interface ProposalSection {
  heading: string;
  body: string;
}

type TokenRecord = Record<string, string>;

const TOKEN_PATTERN = /{{\s*([\w\d_.-]+)\s*}}/g;

function applyTokensToString(input: string, tokens: TokenRecord): string {
  return input.replace(TOKEN_PATTERN, (_, key) => tokens[key] ?? '');
}

function applyTokens(value: unknown, tokens: TokenRecord): unknown {
  if (typeof value === 'string') {
    return applyTokensToString(value, tokens);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => applyTokens(entry, tokens));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        applyTokens(v, tokens),
      ])
    );
  }
  return value;
}

export function resolveProposalSections(
  content: unknown,
  fallbackSections: ProposalSection[],
  tokens: TokenRecord
): ProposalSection[] {
  const resolvedContent = applyTokens(content ?? {}, tokens);
  const rawSections = Array.isArray((resolvedContent as any)?.sections)
    ? ((resolvedContent as any).sections as unknown[])
    : fallbackSections;

  const sections: ProposalSection[] = [];

  for (const rawEntry of rawSections) {
    if (!rawEntry || typeof rawEntry !== 'object') continue;
    const heading = String((rawEntry as any).heading ?? '').trim();
    const body = String((rawEntry as any).body ?? '').trim();
    if (!heading && !body) continue;

    sections.push({
      heading: heading || 'Proposal Section',
      body: body || '',
    });
  }

  return sections.length > 0 ? sections : fallbackSections;
}

export function buildProposalTokens(
  base: Record<string, string | number | null | undefined>
): TokenRecord {
  const entries = Object.entries(base).map(([key, value]) => [
    key,
    value === undefined || value === null ? '' : String(value),
  ]);
  return Object.fromEntries(entries);
}
