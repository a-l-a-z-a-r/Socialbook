import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Review {
  @Prop({ required: true })
  user!: string;

  @Prop({ required: true })
  book!: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ required: true })
  review!: string;

  @Prop({ required: true })
  genre!: string;

  @Prop({ default: 'review' })
  status?: string;

  @Prop()
  coverUrl?: string;

  // Added for typings; created automatically by timestamps
  created_at?: Date;
}

export type ReviewDocument = HydratedDocument<Review>;

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ created_at: -1 });
