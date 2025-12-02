// Simplified AI Orchestrator for production
export class AIOrchestrator {
  async triggerAgent(agentId: string, context: any) {
    try {
      const response = await fetch(
        `${(process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001').replace(/\/$/, '')}/agents/${agentId}/trigger`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, agentId })
        }
      );

      if (!response.ok) {
        return { success: false, message: 'Agent temporarily unavailable' };
      }

      return await response.json();
    } catch (error) {
      console.error(`Agent ${agentId} error:`, error);
      return { success: false, message: 'Agent temporarily unavailable' };
    }
  }

  queueEvent(type: string, data: any) {
    // Queue for async processing
    // console.log('Event queued:', type, data);
  }
}

export const aiOrchestrator = new AIOrchestrator();
