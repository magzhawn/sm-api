import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';

const stripeCreateSessionMock = jest.fn().mockResolvedValue({
    id: 'sess_123',
    subscription: 'sub_123',
    url: 'http://stripe.url',
});

const stripeCancelMock = jest.fn().mockResolvedValue({
    id: 'sub_123',
    status: 'canceled',
});

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: { sessions: { create: stripeCreateSessionMock } },
        subscriptions: { cancel: stripeCancelMock },
    }));
});

const mockSub = {
    userId: 'user123',
    planId: 'basic',
    status: 'pending',
    stripeSessionId: 'sess_123',
    stripeSubscriptionId: 'sub_123',
    save: jest.fn(),
};

const subscriptionModelMock = {
    create: jest.fn(),
    findOne: jest.fn(),
};

interface Plan {
    id: string;
    name: string;
    price: number;
}

const plan: Plan = { id: 'basic', name: 'Basic', price: 500 };

describe('SubscriptionsService', () => {
    let service: SubscriptionsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionsService,
                { provide: 'SubscriptionModel', useValue: subscriptionModelMock },
            ],
        }).compile();

        service = module.get<SubscriptionsService>(SubscriptionsService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createCheckoutSession', () => {
        it('should create a Stripe session and save pending subscription', async () => {
            subscriptionModelMock.create.mockResolvedValue(mockSub);

            const session = await service.createCheckoutSession('user123', plan);

            expect(stripeCreateSessionMock).toHaveBeenCalled();
            expect(subscriptionModelMock.create).toHaveBeenCalledWith({
                userId: 'user123',
                planId: plan.id,
                status: 'pending',
                stripeSessionId: 'sess_123',
            });
            expect(session).toEqual({ id: 'sess_123', url: 'http://stripe.url', subscription: 'sub_123' });
        });
    });

    describe('handleWebhook', () => {
        it('should activate subscription if session exists', async () => {
            subscriptionModelMock.findOne.mockResolvedValue(mockSub);

            const sessionEvent = {
                type: 'checkout.session.completed',
                data: { object: { id: 'sess_123', subscription: 'sub_123' } },
            } as any;

            await service.handleWebhook(sessionEvent);

            expect(mockSub.status).toBe('active');
            expect(mockSub.stripeSubscriptionId).toBe('sub_123');
            expect(mockSub.save).toHaveBeenCalled();
        });


        it('should do nothing if subscription not found', async () => {
            subscriptionModelMock.findOne.mockResolvedValue(null);

            await service.handleWebhook({
                type: 'checkout.session.completed',
                data: { object: { id: 'sess_123', subscription: 'sub_123' } },
            } as any);

            expect(mockSub.save).not.toHaveBeenCalled();
        });
    });

    describe('getUserSubscription', () => {
        it('should return the latest subscription', async () => {
            subscriptionModelMock.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockSub),
            } as any);

            const result = await service.getUserSubscription('user123');

            expect(subscriptionModelMock.findOne).toHaveBeenCalledWith({ userId: 'user123' });
            expect(result).toEqual(mockSub);
        });
    });

    describe('cancelSubscription', () => {
        it('should cancel subscription if exists', async () => {
            subscriptionModelMock.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockSub),
            } as any);

            const result = await service.cancelSubscription('user123');

            expect(stripeCancelMock).toHaveBeenCalledWith('sub_123');
            expect(mockSub.status).toBe('canceled');
            expect(mockSub.save).toHaveBeenCalled();
            expect(result).toEqual(mockSub);
        });

        it('should return null if no subscription exists', async () => {
            subscriptionModelMock.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(null),
            } as any);

            const result = await service.cancelSubscription('user123');

            expect(result).toBeNull();
            expect(stripeCancelMock).not.toHaveBeenCalled();
        });
    });
});
