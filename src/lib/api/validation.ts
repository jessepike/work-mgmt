import { Database } from '../types/database';

type Project = Database['public']['Tables']['project']['Row'];
type Task = Database['public']['Tables']['task']['Row'];
type Plan = Database['public']['Tables']['plan']['Row'];

export class ValidationError extends Error {
    code: string;
    details?: Record<string, unknown>;

    constructor(message: string, code: string = 'VALIDATION_ERROR', details?: Record<string, unknown>) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'ValidationError';
    }
}

export function validateWorkflowType(
    project: Project,
    planId: string | null | undefined,
    phaseId: string | null | undefined
) {
    if (project.workflow_type === 'flat') {
        if (planId || phaseId) {
            throw new ValidationError(
                'Tasks in flat projects cannot have a plan_id or phase_id',
                'WORKFLOW_VIOLATION',
                { workflow_type: 'flat', plan_id: planId, phase_id: phaseId }
            );
        }
    } else if (project.workflow_type === 'planned') {
        if (!planId) {
            throw new ValidationError(
                'Tasks in planned projects must have a plan_id',
                'WORKFLOW_VIOLATION',
                { workflow_type: 'planned', plan_id: planId }
            );
        }
        // phase_id is optional even in planned projects (e.g. task strictly part of a plan but not a specific phase?)
        // Brief said: "Tasks must have plan_id set (non-null). phase_id is optional."
    }
}

export function validateDataOrigin(entity: { data_origin: string }, isConnector: boolean) {
    if (entity.data_origin === 'synced' && !isConnector) {
        throw new ValidationError(
            'Cannot modify synced entity via API. Use the connector or source system.',
            'SYNCED_ENTITY_READONLY',
            { data_origin: 'synced' }
        );
    }
}

export function validateSourceId(dataOrigin: string, sourceId: string | null | undefined) {
    if (dataOrigin === 'synced' && !sourceId) {
        throw new ValidationError(
            'Synced entities must have a source_id',
            'SOURCE_ID_REQUIRED',
            { data_origin: 'synced' }
        );
    }
    if (dataOrigin === 'native' && sourceId) {
        throw new ValidationError(
            'Native entities cannot have a source_id',
            'SOURCE_ID_FORBIDDEN',
            { data_origin: 'native', source_id: sourceId }
        );
    }
}
