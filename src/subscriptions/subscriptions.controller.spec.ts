import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlansService, Plan } from '../plans/plans.service';
import { ConfigService } from '@nestjs/config';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let subscriptionsService: Partial<Record<keyof SubscriptionsService, jest.Mock>>;
  let plansService: Partial<Record<keyof PlansService, jest.Mock>>;
  let configService: Partial<Record<keyof ConfigService, jest.Mock>>;

  beforeEach(async () => {
    subscriptionsService = {
      createCheckoutSession: jest.fn(),
      handleWebhook: jest.fn(),
      getUserSubscription: jest.fn(),
      cancelSubscription: jest.fn(),
    };

    const fakePlan: Plan = { id: 'basic', name: 'Basic', price: 500, description: 'Basic plan' };
    plansService = {
      findById: jest.fn().mockReturnValue(fakePlan),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_123';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        { provide: SubscriptionsService, useValue: subscriptionsService },
        { provide: PlansService, useValue: plansService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkout', () => {
    it('should create a checkout session', async () => {
      const mockSession = { url: 'https://stripe.com/checkout/session123' };
      (subscriptionsService.createCheckoutSession as jest.Mock).mockResolvedValue(mockSession);

      const req: any = { user: { userId: 'user123' } };
      const body = { planId: 'basic' };

      const result = await controller.checkout(req, body);
      expect(result).toEqual({ url: mockSession.url });
      expect(plansService.findById).toHaveBeenCalledWith('basic');
      expect(subscriptionsService.createCheckoutSession).toHaveBeenCalledWith('user123', expect.any(Object));
    });

    it('should throw error if plan not found', async () => {
      (plansService.findById as jest.Mock).mockReturnValue(undefined);

      const req: any = { user: { userId: 'user123' } };
      const body = { planId: 'invalid' };

      await expect(controller.checkout(req, body)).rejects.toThrow('Plan not found');
    });
  });

  describe('getSubscription', () => {
    it('should return user subscription', async () => {
      const mockSubscription = { planId: 'basic', status: 'active' };
      (subscriptionsService.getUserSubscription as jest.Mock).mockResolvedValue(mockSubscription);

      const req: any = { user: { userId: 'user123' } };
      const result = await controller.getSubscription(req);

      expect(result).toEqual(mockSubscription);
      expect(subscriptionsService.getUserSubscription).toHaveBeenCalledWith('user123');
    });
  });

  describe('cancel', () => {
    it('should cancel subscription', async () => {
      const mockResult = { success: true };
      (subscriptionsService.cancelSubscription as jest.Mock).mockResolvedValue(mockResult);

      const req: any = { user: { userId: 'user123' } };
      const result = await controller.cancel(req);

      expect(result).toEqual(mockResult);
      expect(subscriptionsService.cancelSubscription).toHaveBeenCalledWith('user123');
    });
  });

  describe('success', () => {
    it('should return success message if session is valid', async () => {
      const mockSession: any = { id: 'sess_123' };
      jest.spyOn(controller['stripe'].checkout.sessions, 'retrieve').mockResolvedValue(mockSession);

      const result = await controller.success('sess_123');
      expect(result).toBe("Payment successful! You can now close this page.");
    });

    it('should return error if session is invalid', async () => {
      jest.spyOn(controller['stripe'].checkout.sessions, 'retrieve').mockRejectedValue(new Error('Not found'));

      const result = await controller.success('invalid');
      expect(result).toEqual({ message: 'Invalid session ID', error: 'Not found' });
    });
  });

  describe('webhook', () => {
    it('should return 400 if signature missing', async () => {
      const req: any = { body: Buffer.from('{}') };
      const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      const result = await controller.webhook(req, res, undefined as any);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Missing Stripe-Signature header');
    });

    it('should handle webhook event successfully', async () => {
      const req: any = { body: Buffer.from('{}') };
      const res: any = { json: jest.fn() };
      const signature = 'whsec_123';

      jest.spyOn(controller['stripe'].webhooks, 'constructEvent').mockReturnValue({ type: 'checkout.session.completed', data: { object: {} } } as any);

      const result = await controller.webhook(req, res, signature);
      expect(subscriptionsService.handleWebhook).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });
});
