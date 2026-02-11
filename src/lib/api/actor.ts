import { NextRequest } from 'next/server';
import { Database } from '../types/database';
import { SupabaseClient } from '@supabase/supabase-js';

type ActorType = Database['public']['Enums']['actor_type'];
type DbClient = SupabaseClient<Database>;
type FallbackActor = { actorId?: string; actorType?: ActorType };

const VALID_ACTOR_TYPES: ActorType[] = ['human', 'agent', 'system', 'connector'];

function extractBearerSub(request: NextRequest): string | null {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return null;

    const token = authorization.slice('Bearer '.length).trim();
    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
        return null;
    }
}

async function actorExists(supabase: DbClient | undefined, actorId: string): Promise<boolean> {
    if (!supabase) return true;
    const { data } = await supabase
        .from('actor_registry')
        .select('id')
        .eq('id', actorId)
        .maybeSingle();
    return Boolean(data?.id);
}

async function getFirstActiveActor(
    supabase: DbClient | undefined,
    preferredType?: ActorType
): Promise<{ id: string; type: ActorType } | null> {
    if (!supabase) return null;

    if (preferredType) {
        const preferred = await supabase
            .from('actor_registry')
            .select('id, type')
            .eq('active', true)
            .eq('type', preferredType)
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (preferred.data?.id) return preferred.data as { id: string; type: ActorType };
    }

    const fallback = await supabase
        .from('actor_registry')
        .select('id, type')
        .eq('active', true)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (fallback.data?.id) return fallback.data as { id: string; type: ActorType };
    return null;
}

export async function resolveActor(
    request: NextRequest,
    supabase?: DbClient,
    fallback?: FallbackActor
) {
    const actorIdHeader = request.headers.get('x-actor-id')?.trim();
    const actorTypeHeader = request.headers.get('x-actor-type')?.trim() as ActorType | undefined;
    const bearerSub = extractBearerSub(request);

    const actorType = actorTypeHeader && VALID_ACTOR_TYPES.includes(actorTypeHeader)
        ? actorTypeHeader
        : fallback?.actorType;

    const candidates = [actorIdHeader, bearerSub, fallback?.actorId].filter(Boolean) as string[];
    for (const candidate of candidates) {
        if (await actorExists(supabase, candidate)) {
            return {
                actorId: candidate,
                actorType: actorType || 'human'
            };
        }
    }

    const preferredActorType = actorType || fallback?.actorType || 'human';
    const discoveredActor = await getFirstActiveActor(supabase, preferredActorType);
    if (discoveredActor) {
        return {
            actorId: discoveredActor.id,
            actorType: actorType || fallback?.actorType || discoveredActor.type
        };
    }

    return {
        actorId: fallback?.actorId || 'adf-connector',
        actorType: actorType || fallback?.actorType || 'system'
    };
}
