import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let jwtService: any;

  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'user',
  };

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('token123'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken('User'), useValue: userModel },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should throw BadRequestException if email already exists', async () => {
      userModel.findOne.mockResolvedValue(mockUser);

      await expect(service.signup(mockUser.email, 'pass123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a new user and return token', async () => {
      userModel.findOne.mockResolvedValue(null);
      userModel.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.signup('new@example.com', 'pass123');

      expect(bcrypt.hash).toHaveBeenCalledWith('pass123', 10);
      expect(userModel.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'hashedPassword',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser._id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({ access_token: 'token123' });
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(service.login('notfound@example.com', 'pass123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      userModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(mockUser.email, 'wrongpass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return token if credentials are correct', async () => {
      userModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(mockUser.email, 'pass123');

      expect(bcrypt.compare).toHaveBeenCalledWith('pass123', mockUser.password);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser._id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({ access_token: 'token123' });
    });
  });
});
