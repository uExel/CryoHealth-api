import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    constructor(users: Repository<User>, jwt: JwtService);
    login(identifier: string, password: string): Promise<{
        accessToken: string;
        role: import("../common/types/role.type").Role;
        name: string;
    }>;
}
