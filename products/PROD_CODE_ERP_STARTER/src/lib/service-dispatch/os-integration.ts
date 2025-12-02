/**
 * Service Dispatch OS Integration
 * Connects service dispatch workflows to the BrainOps OS primitives
 */

import { createTask } from '@/lib/core/tasks';
import { logEvent, erpEvents } from '@/lib/core/events';
import { storeMemory, erpMemories } from '@/lib/core/memory';
import { logger } from '@/lib/logger';

export interface DispatchOSHooks {
  onSLASync?: (tenantId: string, metadata?: any) => Promise<void>;
  onTicketCreated?: (ticketId: string, tenantId: string, metadata?: any) => Promise<void>;
  onTicketCompleted?: (ticketId: string, tenantId: string, metadata?: any) => Promise<void>;
  onCollectionEscalation?: (invoiceId: string, tenantId: string, metadata?: any) => Promise<void>;
}

/**
 * Trigger SLA sync and create corresponding task
 */
export async function triggerSLASync(
  tenantId: string,
  triggeredBy?: string,
  metadata?: any
): Promise<void> {
  try {
    // Create a task for the SLA sync
    const task = await createTask({
      title: 'Service Dispatch SLA Sync',
      description: 'Synchronize service level agreements and update ticket priorities',
      status: 'in_progress',
      priority: 'high',
      tenant_id: tenantId,
      domain: 'service_dispatch',
      source_system: 'erp',
      created_by: triggeredBy,
      metadata: {
        type: 'sla_sync',
        ...metadata
      }
    });

    if (task) {
      // Log the event
      await logEvent({
        event_type: 'service_dispatch.sla_sync_started',
        source_system: 'erp',
        tenant_id: tenantId,
        actor: triggeredBy,
        entity_type: 'task',
        entity_id: task.id,
        payload: metadata
      });

      logger.info('SLA sync task created', {
        task_id: task.id,
        tenant_id: tenantId
      });
    }
  } catch (error) {
    logger.error('Failed to trigger SLA sync task', { error, tenantId });
  }
}

/**
 * Record service ticket creation
 */
export async function recordTicketCreation(
  ticketId: string,
  customerId: string,
  priority: string,
  tenantId: string,
  createdBy?: string,
  metadata?: any
): Promise<void> {
  try {
    // Log the event
    await logEvent({
      event_type: 'service_dispatch.ticket_created',
      source_system: 'erp',
      tenant_id: tenantId,
      actor: createdBy,
      entity_type: 'service_ticket',
      entity_id: ticketId,
      payload: {
        customer_id: customerId,
        priority,
        ...metadata
      }
    });

    // Create a task if high priority
    if (priority === 'urgent' || priority === 'high') {
      await createTask({
        title: `High Priority Service Ticket: ${ticketId}`,
        description: `Service ticket requires immediate attention`,
        status: 'pending',
        priority: priority === 'urgent' ? 'urgent' : 'high',
        tenant_id: tenantId,
        domain: 'service_dispatch',
        source_system: 'erp',
        created_by: createdBy,
        metadata: {
          ticket_id: ticketId,
          customer_id: customerId,
          ...metadata
        }
      });
    }
  } catch (error) {
    logger.error('Failed to record ticket creation', { error, ticketId, tenantId });
  }
}

/**
 * Record service ticket completion
 */
export async function recordTicketCompletion(
  ticketId: string,
  technicianId: string,
  resolutionNotes: string,
  tenantId: string,
  completedBy?: string,
  metadata?: any
): Promise<void> {
  try {
    // Log the completion event
    await erpEvents.dispatchCompleted(
      ticketId,
      completedBy,
      {
        technician_id: technicianId,
        resolution: resolutionNotes,
        ...metadata
      },
      tenantId
    );

    // Store memory of the resolution
    await storeMemory({
      content: `Service ticket completed: ${resolutionNotes}`,
      kind: 'outcome',
      source: 'service_dispatch',
      tenant_id: tenantId,
      entity_type: 'service_ticket',
      entity_id: ticketId,
      created_by: completedBy,
      metadata: {
        technician_id: technicianId,
        completed_at: new Date().toISOString(),
        ...metadata
      }
    });

    // Store insight if there was a notable pattern or issue
    if (metadata?.recurring_issue) {
      await storeMemory({
        content: `Recurring issue detected: ${metadata.recurring_issue}`,
        kind: 'insight',
        source: 'service_analysis',
        tenant_id: tenantId,
        entity_type: 'customer',
        entity_id: metadata.customer_id,
        metadata: {
          pattern: metadata.recurring_issue,
          occurrences: metadata.occurrence_count || 1
        }
      });
    }
  } catch (error) {
    logger.error('Failed to record ticket completion', { error, ticketId, tenantId });
  }
}

/**
 * Escalate to collections and create task
 */
export async function escalateToCollections(
  invoiceId: string,
  customerId: string,
  amount: number,
  daysOverdue: number,
  tenantId: string,
  escalatedBy?: string
): Promise<void> {
  try {
    // Create collection task
    const task = await createTask({
      title: `Collection Required: Invoice ${invoiceId}`,
      description: `Invoice is ${daysOverdue} days overdue. Amount: $${amount.toFixed(2)}`,
      status: 'pending',
      priority: daysOverdue > 60 ? 'urgent' : 'high',
      tenant_id: tenantId,
      domain: 'collections',
      source_system: 'erp',
      created_by: escalatedBy,
      metadata: {
        invoice_id: invoiceId,
        customer_id: customerId,
        amount,
        days_overdue: daysOverdue
      }
    });

    if (task) {
      // Log the escalation event
      await logEvent({
        event_type: 'collections.escalation_created',
        source_system: 'erp',
        tenant_id: tenantId,
        actor: escalatedBy,
        entity_type: 'invoice',
        entity_id: invoiceId,
        payload: {
          task_id: task.id,
          customer_id: customerId,
          amount,
          days_overdue: daysOverdue
        }
      });

      // Store memory about the escalation
      await erpMemories.collectionResult(
        invoiceId,
        `Escalated to collections after ${daysOverdue} days`,
        'automatic_escalation',
        tenantId
      );
    }
  } catch (error) {
    logger.error('Failed to escalate to collections', { error, invoiceId, tenantId });
  }
}

/**
 * Record inspection failure and create follow-up task
 */
export async function recordInspectionFailure(
  inspectionId: string,
  jobId: string,
  reason: string,
  tenantId: string,
  inspectorId?: string,
  metadata?: any
): Promise<void> {
  try {
    // Log the failure event
    await erpEvents.inspectionFailed(inspectionId, reason, inspectorId, tenantId);

    // Create remediation task
    const task = await createTask({
      title: `Inspection Failed: Remediation Required`,
      description: `Job ${jobId} failed inspection: ${reason}`,
      status: 'pending',
      priority: 'high',
      tenant_id: tenantId,
      domain: 'quality',
      source_system: 'erp',
      created_by: inspectorId,
      metadata: {
        inspection_id: inspectionId,
        job_id: jobId,
        failure_reason: reason,
        ...metadata
      }
    });

    if (task) {
      // Store learning from the failure
      await storeMemory({
        content: `Inspection failure: ${reason}. Remediation task created.`,
        kind: 'learning',
        source: 'quality_inspection',
        tenant_id: tenantId,
        entity_type: 'job',
        entity_id: jobId,
        created_by: inspectorId,
        metadata: {
          inspection_id: inspectionId,
          task_id: task.id,
          preventable: metadata?.preventable || false
        }
      });
    }
  } catch (error) {
    logger.error('Failed to record inspection failure', { error, inspectionId, tenantId });
  }
}

/**
 * Record safety incident and create investigation task
 */
export async function recordSafetyIncident(
  incidentId: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  description: string,
  tenantId: string,
  reportedBy?: string,
  metadata?: any
): Promise<void> {
  try {
    // Log the safety incident
    await erpEvents.safetyIncident(
      incidentId,
      severity,
      reportedBy,
      {
        description,
        ...metadata
      },
      tenantId
    );

    // Create investigation task for medium+ severity
    if (severity !== 'low') {
      const task = await createTask({
        title: `Safety Incident Investigation Required`,
        description: `${severity.toUpperCase()} severity incident: ${description}`,
        status: 'pending',
        priority: severity === 'critical' ? 'urgent' : 'high',
        tenant_id: tenantId,
        domain: 'safety',
        source_system: 'erp',
        created_by: reportedBy,
        due_at: severity === 'critical'
          ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          : new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
        metadata: {
          incident_id: incidentId,
          severity,
          ...metadata
        }
      });

      if (task) {
        // Store safety learning
        await erpMemories.safetyLearning(
          `${severity} severity incident reported: ${description}`,
          incidentId,
          metadata?.prevention_steps,
          tenantId
        );
      }
    }
  } catch (error) {
    logger.error('Failed to record safety incident', { error, incidentId, tenantId });
  }
}

/**
 * Record scheduling optimization result
 */
export async function recordScheduleOptimization(
  optimizationId: string,
  savedHours: number,
  crewsOptimized: number,
  tenantId: string,
  optimizedBy?: string
): Promise<void> {
  try {
    // Log the optimization event
    await logEvent({
      event_type: 'schedule.optimized',
      source_system: 'erp',
      tenant_id: tenantId,
      actor: optimizedBy,
      entity_type: 'schedule',
      entity_id: optimizationId,
      payload: {
        saved_hours: savedHours,
        crews_optimized: crewsOptimized
      }
    });

    // Store the outcome as memory
    await erpMemories.scheduleOptimized(
      `Schedule optimization saved ${savedHours} hours across ${crewsOptimized} crews`,
      savedHours,
      tenantId
    );
  } catch (error) {
    logger.error('Failed to record schedule optimization', { error, optimizationId, tenantId });
  }
}