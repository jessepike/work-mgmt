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
 * Actor should be resolved at the route layer and passed explicitly.
 */
export async function logActivity(params: LogActivityParams) {
    const supabase = await createServiceClient();

    if (!params.actorId) {
        console.error('Skipping activity log: missing actorId', params);
        return;
    }

    const actorType = params.actorType || 'system';
    const actorId = params.actorId;

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
