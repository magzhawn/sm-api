import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  planId: string;

  @Prop({ required: true })
  status: string; // 'pending', 'active', 'canceled'

  @Prop()
  stripeSessionId: string;

  @Prop()
  stripeSubscriptionId: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
