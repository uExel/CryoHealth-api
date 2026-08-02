import { User } from '../../users/entities/user.entity';
export declare class AuditEntry {
    id: string;
    actor?: User;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    reason?: string;
    meta?: Record<string, unknown>;
    createdAt: Date;
}
