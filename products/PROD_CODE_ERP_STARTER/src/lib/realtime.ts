/**
 * Real-time Collaboration with Supabase
 * Week 11: Mobile & Collaboration
 * Live presence, updates, and collaborative features
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env';

// Supabase client singleton
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  supabaseClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseClient;
}

export interface PresenceUser {
  user_id: string;
  user_name: string;
  online_at: string;
  page?: string;
  cursor?: { x: number; y: number };
}

export interface PresenceState {
  [key: string]: PresenceUser[];
}

/**
 * Subscribe to presence in a room (e.g., specific job, estimate, or page)
 */
export async function subscribeToPresence(
  room: string,
  user: { id: string; name: string },
  onUpdate?: (state: PresenceState) => void
): Promise<RealtimeChannel | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const channel = supabase.channel(room, {
    config: {
      presence: {
        key: user.id,
      },
    },
  });

  // Track presence changes
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as PresenceState;
      if (onUpdate) {
        onUpdate(state);
      }
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key, leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track current user
        await channel.track({
          user_id: user.id,
          user_name: user.name,
          online_at: new Date().toISOString(),
          page: window.location.pathname,
        });
      }
    });

  return channel;
}

/**
 * Unsubscribe from presence channel
 */
export async function unsubscribeFromPresence(channel: RealtimeChannel) {
  await channel.untrack();
  await channel.unsubscribe();
}

/**
 * Subscribe to database changes for a table
 */
export function subscribeToTableChanges(
  table: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
): RealtimeChannel | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const channel = supabase
    .channel(`table-${table}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, (payload) => {
      if (onInsert) onInsert(payload.new);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, (payload) => {
      if (onUpdate) onUpdate(payload.new);
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (payload) => {
      if (onDelete) onDelete(payload.old);
    })
    .subscribe();

  return channel;
}

/**
 * Broadcast a message to all users in a room
 */
export async function broadcastMessage(
  channel: RealtimeChannel,
  event: string,
  payload: any
): Promise<void> {
  await channel.send({
    type: 'broadcast',
    event,
    payload,
  });
}

/**
 * Get list of online users in a room
 */
export function getOnlineUsers(channel: RealtimeChannel): PresenceUser[] {
  const state = channel.presenceState() as PresenceState;
  const users: PresenceUser[] = [];

  Object.values(state).forEach((presences) => {
    presences.forEach((presence) => {
      users.push(presence);
    });
  });

  return users;
}

/**
 * Track cursor position for collaborative editing
 */
export async function trackCursor(
  channel: RealtimeChannel,
  position: { x: number; y: number }
): Promise<void> {
  const currentState = channel.presenceState();
  const myPresence = Object.values(currentState)[0]?.[0];

  if (myPresence) {
    await channel.track({
      ...myPresence,
      cursor: position,
    });
  }
}

/**
 * Subscribe to cursor movements from other users
 */
export function subscribeToCursors(
  channel: RealtimeChannel,
  onCursorMove: (userId: string, position: { x: number; y: number }) => void
) {
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState() as PresenceState;

    Object.entries(state).forEach(([userId, presences]) => {
      presences.forEach((presence) => {
        if (presence.cursor) {
          onCursorMove(userId, presence.cursor);
        }
      });
    });
  });
}

const realtimeApi = {
  subscribeToPresence,
  unsubscribeFromPresence,
  subscribeToTableChanges,
  broadcastMessage,
  getOnlineUsers,
  trackCursor,
  subscribeToCursors,
};

export default realtimeApi;
