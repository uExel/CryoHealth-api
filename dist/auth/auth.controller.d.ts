import { JwtPayload } from '../common/types/jwt-payload.type';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        role: import("../common/types/role.type").Role;
        name: string;
    }>;
    me(req: {
        user: JwtPayload;
    }): JwtPayload;
}
