/**
 * Automated Blog Generation Workflow
 * Orchestrates automated blog content generation using Perplexity + Claude + Image generation
 */

import { aiBlogGenerator } from './ai-blog-generator';

interface WorkflowConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  postsPerRun: number;
  industries: Array<'roofing' | 'construction' | 'general'>;
  tones: Array<'professional' | 'casual' | 'technical'>;
  includedImages: boolean;
  autoPublish: boolean;
}

interface GenerationResult {
  success: boolean;
  postsGenerated: number;
  errors: string[];
  filePaths: string[];
}

export class BlogAutomationWorkflow {
  private config: WorkflowConfig;

  constructor(config: Partial<WorkflowConfig> = {}) {
    this.config = {
      frequency: config.frequency || 'weekly',
      postsPerRun: config.postsPerRun || 3,
      industries: config.industries || ['roofing'],
      tones: config.tones || ['professional'],
      includedImages: config.includedImages ?? true,
      autoPublish: config.autoPublish ?? false,
    };
  }

  /**
   * Run the automated blog generation workflow
   */
  async run(): Promise<GenerationResult> {
    console.log('[Blog Workflow] Starting automated generation...');

    const results: GenerationResult = {
      success: true,
      postsGenerated: 0,
      errors: [],
      filePaths: [],
    };

    try {
      for (let i = 0; i < this.config.postsPerRun; i++) {
        try {
          const industry = this.config.industries[i % this.config.industries.length];
          const tone = this.config.tones[i % this.config.tones.length];

          console.log(`[Blog Workflow] Generating post ${i + 1}/${this.config.postsPerRun}...`);

          const blogPost = await aiBlogGenerator.generateBlogPost({
            industry,
            tone,
            length: 'medium',
            includeImages: this.config.includedImages,
          });

          // Save the blog post
          const postsDirectory = process.cwd() + '/data/posts';
          const filePath = await aiBlogGenerator.saveBlogPost(blogPost, postsDirectory);

          results.postsGenerated++;
          results.filePaths.push(filePath);

          console.log(`[Blog Workflow] ✅ Generated: ${blogPost.title}`);
          console.log(`[Blog Workflow]    Saved to: ${filePath}`);

          // Add delay to avoid rate limits
          if (i < this.config.postsPerRun - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay between posts
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Post ${i + 1}: ${errorMsg}`);
          results.success = false;
          console.error(`[Blog Workflow] ❌ Error generating post ${i + 1}:`, errorMsg);
        }
      }

      console.log(`[Blog Workflow] Completed. Generated ${results.postsGenerated}/${this.config.postsPerRun} posts`);

      if (results.errors.length > 0) {
        console.log('[Blog Workflow] Errors:', results.errors);
      }

      return results;
    } catch (error) {
      console.error('[Blog Workflow] Fatal error:', error);
      results.success = false;
      results.errors.push(error instanceof Error ? error.message : 'Fatal workflow error');
      return results;
    }
  }

  /**
   * Generate topic ideas for upcoming blog posts
   */
  async generateTopicIdeas(count: number = 10): Promise<string[]> {
    const topics: string[] = [];

    // Topics for roofing industry
    const roofingTopics = [
      'How to Prepare Your Roof for Extreme Weather',
      'The Complete Guide to Commercial Roofing Materials',
      'Energy-Efficient Roofing Solutions for 2025',
      'Understanding Roofing Warranties: What You Need to Know',
      'How AI is Transforming Roof Inspections',
      'Storm Damage Assessment: A Step-by-Step Guide',
      'Flat Roof vs. Pitched Roof: Pros and Cons',
      'The Future of Solar Roofing Technology',
      'Common Roofing Mistakes and How to Avoid Them',
      'Preventive Maintenance: Extending Your Roof\'s Lifespan',
      'Choosing the Right Roofing Contractor: Red Flags to Watch For',
      'Understanding Roofing Estimates and Pricing',
      'Sustainable Roofing Options for Eco-Conscious Property Owners',
      'The Impact of Climate Change on Roofing Materials',
      'Emergency Roof Repair: What to Do When Disaster Strikes',
      'Modern Roofing Technologies Every Contractor Should Know',
      'How to Detect Hidden Roof Damage',
      'The ROI of Professional Roof Maintenance',
      'Navigating Roofing Insurance Claims',
      'Innovative Roofing Solutions for Historic Buildings',
    ];

    return roofingTopics.slice(0, count);
  }

  /**
   * Schedule automated blog generation (for use with cron jobs)
   */
  getScheduleExpression(): string {
    switch (this.config.frequency) {
      case 'daily':
        return '0 9 * * *'; // 9 AM daily
      case 'weekly':
        return '0 9 * * 1'; // 9 AM Monday
      case 'monthly':
        return '0 9 1 * *'; // 9 AM 1st of month
      default:
        return '0 9 * * 1';
    }
  }

  /**
   * Validate workflow configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!process.env.ANTHROPIC_API_KEY) {
      errors.push('Missing ANTHROPIC_API_KEY environment variable');
    }

    if (this.config.includedImages && !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      errors.push('Image generation enabled but no OPENAI_API_KEY or GEMINI_API_KEY found');
    }

    if (this.config.postsPerRun < 1 || this.config.postsPerRun > 10) {
      errors.push('postsPerRun must be between 1 and 10');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export default workflow instance
export const defaultBlogWorkflow = new BlogAutomationWorkflow({
  frequency: 'weekly',
  postsPerRun: 2,
  industries: ['roofing'],
  tones: ['professional'],
  includedImages: true,
  autoPublish: false,
});

/**
 * CLI function for running the workflow
 * Usage: node -r esbuild-register src/lib/blog-automation-workflow.ts
 */
if (require.main === module) {
  (async () => {
    console.log('=== Blog Automation Workflow ===\n');

    const validation = defaultBlogWorkflow.validateConfig();
    if (!validation.valid) {
      console.error('❌ Configuration errors:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    const result = await defaultBlogWorkflow.run();

    console.log('\n=== Workflow Summary ===');
    console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Posts Generated: ${result.postsGenerated}`);

    if (result.filePaths.length > 0) {
      console.log('\nGenerated Files:');
      result.filePaths.forEach(path => console.log(`  - ${path}`));
    }

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(err => console.log(`  - ${err}`));
    }

    process.exit(result.success ? 0 : 1);
  })();
}
