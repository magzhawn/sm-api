import {
  Controller,
  Post,
  Get,
  Req,
  Body,
  Headers,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PlansService } from '../plans/plans.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { Request, Response } from 'express';

@Controller('subscription')
export class SubscriptionsController {
  private stripe: Stripe;

  constructor(
    private subscriptionsService: SubscriptionsService,
    private plansService: PlansService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(configService.get<string>('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-12-15.clover',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(@Req() req: Request, @Body() body: { planId: string }) {
    const plan = await this.plansService.findById(body.planId);
    if (!plan) throw new Error('Plan not found');

    const session = await this.subscriptionsService.createCheckoutSession(
      (req.user as any).userId,
      plan,
    );

    return { url: session.url };
  }

  @Post('webhook')
  async webhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!signature) {
      return res.status(400).send('Missing Stripe-Signature header');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      console.log('Webhook error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await this.subscriptionsService.handleWebhook(event);
    return res.json({ received: true });
  }


  @UseGuards(JwtAuthGuard)
  @Get()
  async getSubscription(@Req() req: Request) {
    return this.subscriptionsService.getUserSubscription(
      (req.user as any).userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancel(@Req() req: Request) {
    return this.subscriptionsService.cancelSubscription(
      (req.user as any).userId,
    );
  }

  @Get('success')
  async success(@Query('session_id') session_id: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(session_id);
      return "Payment successful! You can now close this page.";
    } catch (err) {
      return { message: 'Invalid session ID', error: err.message };
    }
  }
}
