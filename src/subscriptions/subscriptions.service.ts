import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription } from './subscriptions.schema';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-12-15.clover',
    });
  }

  async createCheckoutSession(userId: string, plan: any) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: plan.name },
            unit_amount: plan.price,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url:
        'http://localhost:3000/subscription/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/cancel',
    });

    await this.subscriptionModel.create({
      userId,
      planId: plan.id,
      status: 'pending',
      stripeSessionId: session.id,
    });

    return session;
  }

  async handleWebhook(event: Stripe.Event) {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const sub = await this.subscriptionModel.findOne({
        stripeSessionId: session.id,
      });

      if (!sub) return;

      sub.stripeSubscriptionId = session.subscription as string; 
      sub.status = 'active';
      await sub.save();
    }
  }

  async getUserSubscription(userId: string) {
    return this.subscriptionModel.findOne({ userId }).sort({ createdAt: -1 });
  }

  async cancelSubscription(userId: string) {
    const sub = await this.getUserSubscription(userId);
    if (!sub?.stripeSubscriptionId) return null;

    await this.stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    sub.status = 'canceled';
    await sub.save();
    return sub;
  }
}
