import { createServiceClient } from '../supabase/server';
import { Database } from '../types/database';

type ActorType = Database['public']['Enums']['actor_type'];

interface LogActivityParams {
    entityType: string;
    entityId: string;
    actorType: ActorType;
    actorId: string;
    action: string;
    detail?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams) {
    const supabase = await createServiceClient();

    const { error } = await supabase.from('activity_log').insert({
        entity_type: params.entityType,
        entity_id: params.entityId,
        actor_type: params.actorType,
        actor_id: params.actorId,
        action: params.action,
        detail: params.detail ? (params.detail as any) : null, // Cast to any because Supabase Json type is strict
    });

    if (error) {
        console.error('Failed to log activity:', error, params);
        // We do not throw here to avoid breaking the main operation if logging fails,
        // although for critical systems we might want to transactionalize this.
        // For MVP, logging failure shouldn't block the user.
    }
}
