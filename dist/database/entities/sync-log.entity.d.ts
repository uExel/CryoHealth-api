import { User } from '../../users/entities/user.entity';
export declare class SyncLog {
    id: string;
    user: User;
    userId: string;
    deviceId: string;
    startedAt: Date;
    finishedAt?: Date;
    itemCount: number;
    status: string;
    detail?: Record<string, unknown>;
    createdAt: Date;
}
