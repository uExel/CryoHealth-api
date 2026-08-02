import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { Repository } from 'typeorm';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  /** identifier = LHW ID or phone. One error message for both unknown-user and
   *  bad-password: don't leak which identifiers exist. */
  async login(identifier: string, password: string) {
    const user = await this.users.findOne({
      where: [{ lhwId: identifier }, { phone: identifier }],
    });
    if (
      !user ||
      !user.active ||
      !(await compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Wrong ID or PIN');
    }
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      name: user.name,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      role: user.role,
      name: user.name,
    };
  }
}
