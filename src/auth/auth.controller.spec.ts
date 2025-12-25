import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    authService = {
      signup: jest.fn().mockImplementation((email: string, password: string) => {
        return { id: 'user123', email };
      }),
      login: jest.fn().mockImplementation((email: string, password: string) => {
        return { accessToken: 'token123', email };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('signup', () => {
    it('should call authService.signup and return user data', async () => {
      const body = { email: 'test@example.com', password: 'pass123' };
      const result = await authController.signup(body);

      expect(authService.signup).toHaveBeenCalledWith(body.email, body.password);
      expect(result).toEqual({ id: 'user123', email: body.email });
    });
  });

  describe('login', () => {
    it('should call authService.login and return access token', async () => {
      const body = { email: 'test@example.com', password: 'pass123' };
      const result = await authController.login(body);

      expect(authService.login).toHaveBeenCalledWith(body.email, body.password);
      expect(result).toEqual({ accessToken: 'token123', email: body.email });
    });
  });
});
