import type { Role } from '../../common/types/role.type';
import { Facility } from '../../database/entities/facility.entity';
export declare class User {
    id: string;
    role: Role;
    name: string;
    phone?: string;
    lhwId?: string;
    passwordHash: string;
    facility?: Facility;
    facilityId?: string;
    active: boolean;
    createdAt: Date;
}
