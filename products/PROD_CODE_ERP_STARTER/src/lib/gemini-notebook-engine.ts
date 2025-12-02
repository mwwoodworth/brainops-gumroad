/**
 * NotebookLM+ Integration using Gemini API
 * Per-project AI notebook that learns from and contributes to all job aspects
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export interface ProjectKnowledge {
  id: string;
  projectId: string;
  category: 'estimate' | 'drawing' | 'specification' | 'meeting' | 'inspection' | 'closeout';
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface NotebookQuery {
  projectId: string;
  question: string;
  context?: string;
}

export interface NotebookResponse {
  answer: string;
  sources: ProjectKnowledge[];
  confidence: number;
}

export class GeminiNotebookEngine {
  private model: GenerativeModel;
  private embeddingModel: GenerativeModel;

  constructor() {
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    this.embeddingModel = genAI.getGenerativeModel({
      model: 'text-embedding-004'
    });
  }

  /**
   * Add knowledge to project notebook
   */
  async addKnowledge(knowledge: Omit<ProjectKnowledge, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Generate embedding using Gemini
      const embedding = await this.generateEmbedding(knowledge.content);

      // Store in Supabase vector database
      const { data, error } = await supabase
        .from('project_knowledge')
        .insert({
          project_id: knowledge.projectId,
          category: knowledge.category,
          content: knowledge.content,
          embedding,
          metadata: knowledge.metadata,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to add knowledge:', error);
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('addKnowledge error:', error);
      throw error;
    }
  }

  /**
   * Query project notebook
   */
  async query(query: NotebookQuery): Promise<NotebookResponse> {
    try {
      // 1. Find relevant knowledge using vector similarity search
      const queryEmbedding = await this.generateEmbedding(query.question);
      const relevantKnowledge = await this.findSimilarKnowledge(query.projectId, queryEmbedding, 5);

      // 2. Build context from retrieved knowledge
      const context = this.buildContext(relevantKnowledge, query.context);

      // 3. Generate response using Gemini
      const prompt = this.buildPrompt(query.question, context);
      const result = await this.model.generateContent(prompt);
      const answer = result.response.text();

      return {
        answer,
        sources: relevantKnowledge,
        confidence: this.calculateConfidence(relevantKnowledge)
      };
    } catch (error) {
      console.error('query error:', error);
      return {
        answer: 'I encountered an error processing your question. Please try again.',
        sources: [],
        confidence: 0
      };
    }
  }

  /**
   * Process uploaded document (PDF, image, etc.)
   */
  async processDocument(projectId: string, file: File): Promise<string> {
    try {
      // Convert file to base64 for Gemini
      const fileBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(fileBuffer).toString('base64');

      const prompt = `
        Analyze this construction document and extract all relevant information including:
        - Measurements and quantities
        - Material specifications
        - Installation requirements
        - Special conditions or notes
        - Any other critical project information

        Provide a detailed summary that can be used for estimating and project planning.
      `;

      const result = await this.model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: file.type,
            data: base64
          }
        }
      ]);

      const analysis = result.response.text();

      // Store analysis in project knowledge
      await this.addKnowledge({
        projectId,
        category: 'drawing',
        content: analysis,
        metadata: {
          originalFileName: file.name,
          fileType: file.type,
          fileSize: file.size
        }
      });

      return analysis;
    } catch (error) {
      console.error('processDocument error:', error);
      throw error;
    }
  }

  /**
   * Generate estimate insights
   */
  async generateEstimateInsights(projectId: string, estimateData: any): Promise<string> {
    try {
      const knowledge = await this.getAllProjectKnowledge(projectId);

      const prompt = `
        Based on the following project information and current estimate data, provide:
        1. Cost comparison with similar past projects
        2. Potential cost optimization opportunities
        3. Risk factors that may impact pricing
        4. Recommended markup based on project complexity
        5. Suggested alternates or value engineering options

        Project Knowledge:
        ${knowledge.map(k => `${k.category}: ${k.content}`).join('\n\n')}

        Current Estimate:
        ${JSON.stringify(estimateData, null, 2)}
      `;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('generateEstimateInsights error:', error);
      return 'Unable to generate insights at this time.';
    }
  }

  /**
   * Track project from lead to closeout
   */
  async trackProjectProgress(projectId: string, stage: string, data: any): Promise<void> {
    try {
      await this.addKnowledge({
        projectId,
        category: stage as any,
        content: `Project stage: ${stage}\n${JSON.stringify(data, null, 2)}`,
        metadata: { stage, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('trackProjectProgress error:', error);
    }
  }

  // Private helper methods

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('generateEmbedding error:', error);
      // Return zero vector as fallback
      return new Array(768).fill(0);
    }
  }

  private async findSimilarKnowledge(
    projectId: string,
    embedding: number[],
    limit: number
  ): Promise<ProjectKnowledge[]> {
    try {
      // Supabase vector similarity search
      const { data, error } = await supabase.rpc('match_project_knowledge', {
        query_project_id: projectId,
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: limit
      });

      if (error) {
        console.error('Vector search failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('findSimilarKnowledge error:', error);
      return [];
    }
  }

  private buildContext(knowledge: ProjectKnowledge[], additionalContext?: string): string {
    let context = 'Project Knowledge:\n\n';

    knowledge.forEach((k, i) => {
      context += `${i + 1}. [${k.category}] ${k.content}\n\n`;
    });

    if (additionalContext) {
      context += `\nAdditional Context:\n${additionalContext}`;
    }

    return context;
  }

  private buildPrompt(question: string, context: string): string {
    return `
      You are an expert construction estimating assistant with deep knowledge of this specific project.

      ${context}

      Question: ${question}

      Provide a detailed, accurate answer based on the project knowledge above. If you don't have enough
      information, clearly state what additional information would be helpful.
    `;
  }

  private calculateConfidence(knowledge: ProjectKnowledge[]): number {
    // Simple confidence based on number of relevant sources
    return Math.min(knowledge.length / 5, 1.0);
  }

  private async getAllProjectKnowledge(projectId: string): Promise<ProjectKnowledge[]> {
    try {
      const { data, error } = await supabase
        .from('project_knowledge')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch project knowledge:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('getAllProjectKnowledge error:', error);
      return [];
    }
  }
}
