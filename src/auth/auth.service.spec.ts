import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';

describe('AuthService.login', () => {
  const findOne = jest.fn();
  let service: AuthService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: { findOne } },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('jwt') },
        },
      ],
    }).compile();
    service = mod.get(AuthService);
    findOne.mockReset();
  });

  const zainab = async () => ({
    id: 'u1',
    role: 'chw',
    name: 'Zainab',
    active: true,
    passwordHash: await hash('4321', 4),
  });

  it('returns a token for a valid LHW ID + PIN', async () => {
    findOne.mockResolvedValue(await zainab());
    await expect(service.login('44-2291', '4321')).resolves.toMatchObject({
      accessToken: 'jwt',
      role: 'chw',
    });
  });

  it('rejects a wrong PIN', async () => {
    findOne.mockResolvedValue(await zainab());
    await expect(service.login('44-2291', 'nope')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects unknown users with the same error (no identifier leaking)', async () => {
    findOne.mockResolvedValue(null);
    await expect(service.login('ghost', 'x')).rejects.toThrow(
      'Wrong ID or PIN',
    );
  });

  it('rejects deactivated users even with the right PIN', async () => {
    findOne.mockResolvedValue({ ...(await zainab()), active: false });
    await expect(service.login('44-2291', '4321')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
