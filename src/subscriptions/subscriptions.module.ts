import { Module, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscription, SubscriptionSchema } from './subscriptions.schema';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PlansModule } from '../plans/plans.module';
import { ConfigModule } from '@nestjs/config';
import { StripeWebhookMiddleware } from './stripe-webhook.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Subscription.name, schema: SubscriptionSchema }]),
    PlansModule,
    ConfigModule,
  ],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(StripeWebhookMiddleware).forRoutes('subscription/webhook');
  }
}
