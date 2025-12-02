import { AlertTriangle, Calendar, Clock, PauseCircle, PlayCircle, RefreshCw, AlertCircle } from 'lucide-react';
import type { ServiceTicket } from '@/app/(app)/service-dispatch/service-dispatch-data-hooks';

// Complete ticket status taxonomy per SOPs
export const TICKET_STAGES = [
  { value: 'new_entry', label: 'New Entry', color: 'glass-card/50' },
  { value: 'review', label: 'Review', color: 'glass-card' },
  { value: 'accepted', label: 'Accepted', color: 'glass-card' },
  { value: 'scheduled', label: 'Scheduled', color: 'glass-card' },
  { value: 'dispatched', label: 'Dispatched', color: 'bg-orange-500' },
  { value: 'en_route', label: 'En Route', color: 'bg-yellow-500' },
  { value: 'on_site', label: 'On Site', color: 'bg-amber-500' },
  { value: 'authorized', label: 'Authorized', color: 'glass-card' },
  { value: 'invoice_review', label: 'Invoice Review', color: 'glass-card/50' },
  { value: 'invoice_approved', label: 'Invoice Approved', color: 'glass-card' },
  { value: 'invoiced', label: 'Invoiced', color: 'glass-card' },
  { value: 'collections', label: 'Collections', color: 'bg-red-500' }
];

// Status taxonomy per SOPs
export const STATUS_TYPES = [
  { value: 'active', label: 'Active - Can dispatch anytime', icon: PlayCircle },
  { value: 'priority', label: 'Priority - Urgent/hazard', icon: AlertTriangle },
  { value: 'scheduled', label: 'Scheduled - Specific date assigned', icon: Calendar },
  { value: 'need_to_schedule', label: 'Need to Schedule - Customer wants date', icon: Clock },
  { value: 'hold', label: 'Hold - Blocked (materials, etc)', icon: PauseCircle },
  { value: 'cancellation_list', label: 'Cancellation List - Wants earlier', icon: RefreshCw },
  { value: 'incomplete', label: 'Incomplete - Needs follow-up', icon: AlertCircle }
];

export type StatusValue = (typeof STATUS_TYPES)[number]['value'];

export const COLLECTIONS_TIMELINE = [
  { day: 0, label: 'Invoice Date', action: 'Invoice sent' },
  { day: 30, label: 'Due Date', action: 'Payment due' },
  { day: 60, label: 'Email Reminder', action: 'Send reminder email' },
  { day: 75, label: 'Call Reminder', action: 'Phone call follow-up' },
  { day: 90, label: 'Call & Email', action: 'Escalated contact' },
  { day: 100, label: 'Warning', action: 'Warning of Intent to Lien' },
  { day: 110, label: 'Notice', action: 'Notice of Intent to Lien' },
  { day: 120, label: 'Lien Filed', action: 'Statement of Lien Filed' }
];

export const BURDEN_RATE = 1.52;

export type StageProgression = {
  nextStage: string;
  nextStatus: StatusValue;
  label: string;
  patch?: (ticket: ServiceTicket) => Record<string, any> | null;
};

export const STAGE_PROGRESSIONS: Record<string, StageProgression> = TICKET_STAGES.reduce(
  (acc, stage, index) => {
    const nextStage = TICKET_STAGES[index + 1];
    if (nextStage) {
      acc[stage.value] = {
        nextStage: nextStage.value,
        nextStatus: 'active',
        label: `Move to ${nextStage.label}`,
      };
    }
    return acc;
  },
  {} as Record<string, StageProgression>
);
