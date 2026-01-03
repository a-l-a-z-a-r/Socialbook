import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BooklistDocument = HydratedDocument<Booklist>;

@Schema({ timestamps: true })
export class Booklist {
  @Prop({ required: true })
  ownerId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ default: 'public', enum: ['public', 'private', 'unlisted'] })
  visibility?: 'public' | 'private' | 'unlisted';

  @Prop()
  coverUrl?: string;

  @Prop({ default: 0 })
  totalItems?: number;
}

export const BooklistSchema = SchemaFactory.createForClass(Booklist);
BooklistSchema.index({ ownerId: 1, updatedAt: -1 });
