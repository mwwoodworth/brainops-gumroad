import OpenAI from 'openai';
import { AI_PROVIDER_MODE, IS_PRODUCTION_ENV } from '@/lib/env';

const VALID_MODES = new Set(['mock', 'live-openai'] as const);

export type AIProviderMode = 'mock' | 'live-openai';
export type AIProviderResolvedMode = AIProviderMode | 'disabled';

export interface ChatContentPart {
  type: string;
  [key: string]: unknown;
}

export type ChatCompletionContent = string | ChatContentPart[];

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: ChatCompletionContent;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  response_format?: { type: string };
  temperature?: number;
}

export interface ChatCompletionChoice {
  message: { content?: string | null };
}

export interface ChatCompletionResponse {
  choices: ChatCompletionChoice[];
}

export interface EmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

export interface AIClient {
  embeddings: {
    create: (params: { model: string; input: string | string[] }) => Promise<EmbeddingResponse>;
  };
  chat: {
    completions: {
      create: (params: ChatCompletionRequest) => Promise<ChatCompletionResponse>;
    };
  };
}

export interface AIProviderResolution {
  mode: AIProviderResolvedMode;
  client: AIClient | null;
  reason?: string;
}

let cachedResolution: AIProviderResolution | null = null;
let loggedMessage = false;

export const resetAIProviderCache = () => {
  cachedResolution = null;
  loggedMessage = false;
};

export const resolveAIProvider = (): AIProviderResolution => {
  if (cachedResolution) {
    return cachedResolution;
  }

  const forceDisable = process.env.AI_FORCE_DISABLE === 'true';
  if (forceDisable) {
    cachedResolution = {
      mode: 'disabled',
      reason: 'AI integrations are force disabled.',
      client: null,
    };
    return cachedResolution;
  }

  const resolvedMode: AIProviderMode = VALID_MODES.has(AI_PROVIDER_MODE as AIProviderMode)
    ? (AI_PROVIDER_MODE as AIProviderMode)
    : 'mock';

  if (resolvedMode === 'mock') {
    if (IS_PRODUCTION_ENV) {
      throw new Error('[AI] AI_PROVIDER_MODE=mock is not permitted in production environments. Configure AI_PROVIDER_MODE=live-openai with valid credentials.');
    }
    cachedResolution = {
      mode: 'mock',
      client: new MockOpenAI(),
      reason: 'Mock mode enabled',
    };
    logOnce('[AI] Mock provider active. No external AI credentials required.');
    return cachedResolution;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (IS_PRODUCTION_ENV) {
      throw new Error('[AI] OPENAI_API_KEY is required when AI_PROVIDER_MODE=live-openai in production.');
    }
    cachedResolution = {
      mode: 'mock',
      client: new MockOpenAI(),
        reason: 'OpenAI API key missing, falling back to mock mode.',
    };
    logOnce('[AI] OPENAI_API_KEY missing while live provider requested. Falling back to mock responses.');
    return cachedResolution;
  }

  try {
    const client = new OpenAI({ apiKey }) as unknown as AIClient;
    cachedResolution = {
      mode: 'live-openai',
      client,
    };
    logOnce('[AI] Live OpenAI provider initialized.');
    return cachedResolution;
  } catch (error) {
    if (IS_PRODUCTION_ENV) {
      throw new Error(`[AI] Failed to initialize OpenAI provider: ${(error as Error).message}`);
    }
    cachedResolution = {
      mode: 'mock',
      client: new MockOpenAI(),
      reason: `OpenAI init failed: ${(error as Error).message}`,
    };
    logOnce('[AI] Failed to initialize OpenAI provider. Using mock responses.');
    return cachedResolution;
  }
}

function logOnce(message: string) {
  if (loggedMessage) return;
  loggedMessage = true;
  console.warn(message);
}

class MockOpenAI implements AIClient {
  embeddings = {
    create: async ({ input }: { model: string; input: string | string[] }): Promise<EmbeddingResponse> => {
      const values = Array.isArray(input) ? input : [input];
      return {
        data: values.map((_, index) => ({
          embedding: this.generateEmbedding(index),
        })),
      };
    },
  };

  chat = {
    completions: {
      create: async (params: ChatCompletionRequest): Promise<ChatCompletionResponse> => {
        const payload = this.buildResponse(params);
        const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
        return {
          choices: [{ message: { content } }],
        };
      },
    },
  };

  private generateEmbedding(seed: number): number[] {
    const length = 10;
    return Array.from({ length }, (_, idx) =>
      Number(((seed + idx + 1) / 100).toFixed(6))
    );
  }

  private buildResponse({ messages }: ChatCompletionRequest): Record<string, unknown> | string {
    const systemMessage = (messages.find(msg => msg.role === 'system')?.content ?? '').toString();
    const lastMessage = messages[messages.length - 1];

    if (systemMessage.includes('expert estimating assistant')) {
      return this.mockEstimatorAssistant(lastMessage);
    }

    if (systemMessage.includes('construction drawings')) {
      return this.mockDrawingAnalysis();
    }

    if (systemMessage.includes('construction specifications')) {
      return this.mockSpecificationAnalysis();
    }

    if (systemMessage.includes('experienced roofing estimator')) {
      return this.mockLineItemSuggestions();
    }

    if (systemMessage.includes('building code compliance expert')) {
      return this.mockComplianceCheck();
    }

    // Generic fallback
    return {
      message: 'Mock AI response generated. Configure live provider for real output.',
    };
  }

  private mockEstimatorAssistant(lastMessage: ChatCompletionMessage | undefined) {
    const question = typeof lastMessage?.content === 'string' ? lastMessage.content.slice(0, 160) : 'Estimator question';
    return {
      answer: `Mock analysis for: ${question}`,
      confidence: 0.72,
      sources: [
        { type: 'document', reference: 'roofing-best-practices.pdf', excerpt: 'Refer to section 4.2 for installation guidance.' },
      ],
      related_assemblies: ['ROOF-SHINGLE-ARCH-30YR'],
      related_documents: ['mock-manual.pdf'],
      warnings: ['Verify site-specific wind uplift requirements with local jurisdiction.'],
    };
  }

  private mockDrawingAnalysis() {
    return {
      extracted_text: '',
      analysis: null,
      drawing_analysis: {
        scale_ratio: '1/4" = 1\'-0"',
        measurements: [
          {
            item: 'Roof ridge length',
            dimension: '48\'-0"',
            calculated_quantity: 48,
            unit: 'LF',
          },
        ],
        detail_callouts: ['Detail A: Ridge vent', 'Detail B: Step flashing'],
        notes: ['Confirm substrate condition before installation.'],
        material_callouts: [
          {
            material: 'Architectural shingles',
            specification: 'ASTM D3161 Class F',
            manufacturer: 'Any approved equal',
          },
        ],
      },
    };
  }

  private mockSpecificationAnalysis() {
    return {
      extracted_text: 'Mock specification content for offline analysis.',
      analysis: {
        document_structure: ['Section 01 - General', 'Section 07 31 00 - Asphalt Shingles'],
        key_sections: [
          {
            section_number: '07 31 00',
            title: 'Asphalt Shingles',
            content: 'Install laminated architectural shingles per manufacturer instructions.',
            requirements: [
              '30-year architectural shingles',
              'Ice and water shield at eaves and valleys',
            ],
          },
        ],
        materials_specified: [
          {
            name: 'Architectural Shingles',
            specification: 'Class A fire rating, ASTM D3462',
            quantity_mentioned: false,
            manufacturer: 'GAF or approved equal',
          },
        ],
        code_references: [
          {
            code: 'IBC',
            section: '1507.2',
            requirement: 'Installation shall comply with ASTM D7158',
          },
        ],
        scope_items: [
          {
            description: 'Remove existing roofing down to deck',
            confidence: 0.65,
          },
        ],
      },
      drawing_analysis: null,
    };
  }

  private mockLineItemSuggestions() {
    return {
      suggested_items: [
        {
          description: 'Remove existing asphalt shingles',
          quantity: 0,
          unit: 'SQ',
          source: 'Section 07 31 00 - Demolition',
          confidence: 0.7,
          category: 'demolition',
          notes: 'Quantity dependent on verified roof measurements.',
        },
        {
          description: 'Install ice and water shield at eaves and valleys',
          quantity: 120,
          unit: 'LF',
          source: 'Section 07 31 00 - Underlayment',
          confidence: 0.8,
          category: 'underlayment',
          notes: 'Assumes 120 LF perimeter; adjust per takeoff.',
        },
      ],
      assembly_recommendations: [
        'ROOF-SHINGLE-ARCH-30YR',
      ],
      missing_information: [
        'Total roof squares not provided',
      ],
      clarifications_needed: [
        'Confirm color/finish requirements with homeowner.',
      ],
      disclaimer: 'Mock AI suggestion. Estimator review required.',
    };
  }

  private mockComplianceCheck() {
    return {
      compliant: false,
      violations: [
        {
          code: 'IBC-2021',
          section: '1507.2.8.1',
          requirement: 'Ice barrier required in locations with average daily temperature below 25°F',
          issue: 'Estimate missing ice and water shield line item',
          suggestion: 'Add ice and water shield at eaves extending 24" inside warm wall.',
        },
      ],
      warnings: [
        'Flashing details require verification against local amendments.',
      ],
      recommendations: [
        'Document manufacturer warranty information in final proposal.',
      ],
    };
  }
}
