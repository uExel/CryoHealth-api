import { User } from '../../users/entities/user.entity';
export declare class ChwCase {
    id: string;
    chw: User;
    chwId: string;
    capturedAt: Date;
    payload: Record<string, unknown>;
    outcome?: string;
    syncState: string;
    deviceId: string;
    clientCaseId: string;
    createdAt: Date;
}
