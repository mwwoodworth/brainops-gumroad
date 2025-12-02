/**
 * AI Blog Generator Service
 * Uses Perplexity for research, Claude for content, and image generation APIs
 */

import Anthropic from '@anthropic-ai/sdk';

interface BlogGenerationRequest {
  topic?: string;
  industry: 'roofing' | 'construction' | 'general';
  tone: 'professional' | 'casual' | 'technical';
  length: 'short' | 'medium' | 'long';
  includeImages?: boolean;
  targetAudience?: string;
}

interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  readTime: string;
  tags: string[];
  featured: boolean;
  imageUrl?: string;
  metadata: {
    seo_title: string;
    seo_description: string;
    keywords: string[];
  };
}

interface PerplexityResearchResult {
  topic: string;
  keyPoints: string[];
  statistics: string[];
  trends: string[];
  sources: string[];
}

interface ImageGenerationResult {
  url: string;
  alt: string;
  prompt: string;
}

export class AIBlogGenerator {
  private anthropicClient: Anthropic;
  private perplexityApiKey: string;
  private imageGenApiKey: string;

  constructor() {
    this.anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || '';
    this.imageGenApiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '';
  }

  /**
   * Generate a complete blog post with AI automation
   */
  async generateBlogPost(request: BlogGenerationRequest): Promise<BlogPost> {
    try {
      // Step 1: Research topic with Perplexity
      const research = await this.researchTopic(request);

      // Step 2: Generate content with Claude
      const content = await this.generateContent(research, request);

      // Step 3: Generate images (if requested)
      let imageUrl: string | undefined;
      if (request.includeImages) {
        const image = await this.generateImage(content.title, content.fullContent);
        imageUrl = image.url;
      }

      // Step 4: Create slug and metadata
      const slug = this.createSlug(content.title);
      const readTime = this.calculateReadTime(content.fullContent);

      const blogPost: BlogPost = {
        title: content.title,
        slug,
        excerpt: content.excerpt,
        content: content.fullContent,
        date: new Date().toISOString().split('T')[0],
        author: request.industry === 'roofing' ? 'Weathercraft Insights' : 'AI Automation',
        readTime,
        tags: content.tags,
        featured: false,
        imageUrl,
        metadata: {
          seo_title: content.seoTitle,
          seo_description: content.seoDescription,
          keywords: content.keywords,
        },
      };

      return blogPost;
    } catch (error) {
      console.error('Blog generation failed:', error);
      throw new Error(`Failed to generate blog post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Research topic using Perplexity API
   */
  private async researchTopic(request: BlogGenerationRequest): Promise<PerplexityResearchResult> {
    const topic = request.topic || await this.generateTopic(request.industry);

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a research assistant. Provide comprehensive research on topics with current statistics, trends, and credible sources.',
            },
            {
              role: 'user',
              content: `Research the following topic for a blog post: "${topic}".

              Industry: ${request.industry}
              Target audience: ${request.targetAudience || 'general'}

              Provide:
              1. Key points (5-7 main ideas)
              2. Recent statistics and data
              3. Current trends
              4. Credible sources

              Format as JSON with keys: keyPoints, statistics, trends, sources`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data = await response.json();
      const researchContent = data.choices[0].message.content;

      // Parse JSON from response
      const jsonMatch = researchContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          topic,
          keyPoints: parsed.keyPoints || [],
          statistics: parsed.statistics || [],
          trends: parsed.trends || [],
          sources: parsed.sources || [],
        };
      }

      // Fallback if JSON parsing fails
      return {
        topic,
        keyPoints: this.extractBulletPoints(researchContent),
        statistics: [],
        trends: [],
        sources: [],
      };
    } catch (error) {
      console.error('Perplexity research failed:', error);
      // Fallback to Claude-only generation
      return {
        topic,
        keyPoints: [],
        statistics: [],
        trends: [],
        sources: [],
      };
    }
  }

  /**
   * Generate blog content using Claude
   */
  private async generateContent(
    research: PerplexityResearchResult,
    request: BlogGenerationRequest
  ): Promise<{
    title: string;
    excerpt: string;
    fullContent: string;
    tags: string[];
    seoTitle: string;
    seoDescription: string;
    keywords: string[];
  }> {
    const wordCount = request.length === 'short' ? 500 : request.length === 'medium' ? 1000 : 1500;

    const prompt = `Write a compelling blog post about "${research.topic}" for the ${request.industry} industry.

Research insights:
${research.keyPoints.length > 0 ? `
Key Points:
${research.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
` : ''}

${research.statistics.length > 0 ? `
Statistics:
${research.statistics.map((s, i) => `- ${s}`).join('\n')}
` : ''}

${research.trends.length > 0 ? `
Current Trends:
${research.trends.map((t, i) => `- ${t}`).join('\n')}
` : ''}

Requirements:
- Tone: ${request.tone}
- Length: approximately ${wordCount} words
- Target audience: ${request.targetAudience || 'general readers'}
- Include actionable insights
- Use markdown formatting
- Include relevant headings (##, ###)
- Add bullet points where appropriate

Provide the response in this exact JSON format:
{
  "title": "Compelling blog title",
  "excerpt": "150-character excerpt for preview",
  "content": "Full markdown blog content",
  "tags": ["tag1", "tag2", "tag3"],
  "seoTitle": "SEO-optimized title (60 chars max)",
  "seoDescription": "SEO description (160 chars max)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

    const message = await this.anthropicClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      title: parsed.title,
      excerpt: parsed.excerpt,
      fullContent: parsed.content,
      tags: parsed.tags || [],
      seoTitle: parsed.seoTitle || parsed.title,
      seoDescription: parsed.seoDescription || parsed.excerpt,
      keywords: parsed.keywords || [],
    };
  }

  /**
   * Generate image for blog post using OpenAI DALL-E or Gemini
   */
  private async generateImage(title: string, content: string): Promise<ImageGenerationResult> {
    // Extract key visual concepts from title and content
    const imagePrompt = await this.createImagePrompt(title, content);

    try {
      // Try OpenAI DALL-E first
      if (process.env.OPENAI_API_KEY) {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: imagePrompt,
            n: 1,
            size: '1792x1024',
            quality: 'hd',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            url: data.data[0].url,
            alt: title,
            prompt: imagePrompt,
          };
        }
      }

      // Fallback: Return placeholder
      return {
        url: `https://placehold.co/1200x630/1e293b/white?text=${encodeURIComponent(title)}`,
        alt: title,
        prompt: imagePrompt,
      };
    } catch (error) {
      console.error('Image generation failed:', error);
      return {
        url: `https://placehold.co/1200x630/1e293b/white?text=${encodeURIComponent(title)}`,
        alt: title,
        prompt: imagePrompt,
      };
    }
  }

  /**
   * Create image generation prompt from blog content
   */
  private async createImagePrompt(title: string, content: string): Promise<string> {
    const message = await this.anthropicClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Create a detailed image generation prompt for a blog post titled "${title}".

          Content preview: ${content.substring(0, 500)}...

          Requirements:
          - Professional and modern style
          - Suitable for roofing/construction industry
          - Photorealistic or high-quality illustration
          - No text in the image
          - Clear focal point

          Provide only the image prompt, no other text.`,
        },
      ],
    });

    return message.content[0].type === 'text' ? message.content[0].text : title;
  }

  /**
   * Auto-generate blog topic based on industry
   */
  private async generateTopic(industry: string): Promise<string> {
    const message = await this.anthropicClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Generate a timely, relevant blog post topic for the ${industry} industry.

          The topic should be:
          - Trending or newsworthy
          - Valuable to industry professionals
          - Specific and focused
          - SEO-friendly

          Provide only the topic title, no other text.`,
        },
      ],
    });

    return message.content[0].type === 'text' ? message.content[0].text.trim() : `${industry} Industry Insights`;
  }

  /**
   * Helper: Create URL-friendly slug
   */
  private createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Helper: Calculate reading time
   */
  private calculateReadTime(content: string): string {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  }

  /**
   * Helper: Extract bullet points from text
   */
  private extractBulletPoints(text: string): string[] {
    const lines = text.split('\n');
    const bullets = lines.filter(line =>
      line.trim().startsWith('-') ||
      line.trim().startsWith('•') ||
      /^\d+\./.test(line.trim())
    );
    return bullets.map(b => b.replace(/^[-•\d.]\s*/, '').trim());
  }

  /**
   * Save blog post to markdown file
   */
  async saveBlogPost(post: BlogPost, directory: string): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const frontmatter = `---
title: "${post.title}"
excerpt: "${post.excerpt}"
date: "${post.date}"
author: "${post.author}"
readTime: "${post.readTime}"
tags: [${post.tags.map(t => `"${t}"`).join(', ')}]
featured: ${post.featured}
${post.imageUrl ? `image: "${post.imageUrl}"` : ''}
seoTitle: "${post.metadata.seo_title}"
seoDescription: "${post.metadata.seo_description}"
keywords: [${post.metadata.keywords.map(k => `"${k}"`).join(', ')}]
---

${post.content}`;

    const filePath = path.join(directory, `${post.slug}.md`);
    await fs.writeFile(filePath, frontmatter, 'utf-8');

    return filePath;
  }
}

// Export singleton instance
export const aiBlogGenerator = new AIBlogGenerator();
