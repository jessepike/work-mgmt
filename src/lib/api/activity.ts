import { createServiceClient } from '../supabase/server';
import { Database } from '../types/database';

type ActorType = Database['public']['Enums']['actor_type'];

interface LogActivityParams {
    entityType: string;
    entityId: string;
    actorType?: ActorType;
    actorId?: string;
    action: string;
    detail?: Record<string, unknown>;
}

/**
 * Logs an activity to the activity_log table.
 * BUG-2: We currently manually pass actorId. In the future, we should
 * probably use a Request-scoped context or AsyncLocalStorage to avoid
 * passing it everywhere, but for now, we'll make it explicit.
 */
export async function logActivity(params: LogActivityParams) {
    const supabase = await createServiceClient();

    // Default to 'human' / 'jess' if not provided for backward compatibility
    // during transition, but eventually we want this to be mandatory or
    // extracted from a context.
    const actorType = params.actorType || 'human';
    const actorId = params.actorId || 'jess';

    const { error } = await supabase.from('activity_log').insert({
        entity_type: params.entityType,
        entity_id: params.entityId,
        actor_type: actorType,
        actor_id: actorId,
        action: params.action,
        detail: params.detail ? (params.detail as any) : null,
    });

    if (error) {
        console.error('Failed to log activity:', error, params);
    }
}
