import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BooklistItemDocument = HydratedDocument<BooklistItem>;

@Schema({ timestamps: { createdAt: 'addedAt', updatedAt: false } })
export class BooklistItem {
  @Prop({ required: true })
  booklistId!: string;

  @Prop({ required: true })
  bookId!: string;

  @Prop({ required: true })
  addedById!: string;

  @Prop({ default: 0 })
  position?: number;

  @Prop()
  notes?: string;

  addedAt?: Date;
}

export const BooklistItemSchema = SchemaFactory.createForClass(BooklistItem);
BooklistItemSchema.index({ booklistId: 1, position: 1 });
.local