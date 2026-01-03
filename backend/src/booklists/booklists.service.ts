import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booklist, BooklistDocument } from './booklist.schema';
import { BooklistItem, BooklistItemDocument } from './booklist-item.schema';

type CreateBooklistPayload = {
  name: string;
  description?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  coverUrl?: string;
};

type AddBooklistItemPayload = {
  bookId: string;
  notes?: string;
  position?: number;
};

@Injectable()
export class BooklistsService {
  constructor(
    @InjectModel(Booklist.name) private readonly booklistModel: Model<BooklistDocument>,
    @InjectModel(BooklistItem.name) private readonly itemModel: Model<BooklistItemDocument>,
  ) {}

  async create(ownerId: string, payload: CreateBooklistPayload) {
    const created = await this.booklistModel.create({
      ownerId,
      name: payload.name,
      description: payload.description,
      visibility: payload.visibility ?? 'public',
      coverUrl: payload.coverUrl,
      totalItems: 0,
    });
    return created;
  }

  async findByOwner(ownerId: string) {
    return this.booklistModel.find({ ownerId }).sort({ updatedAt: -1 }).lean();
  }

  async addItem(booklistId: string, addedById: string, payload: AddBooklistItemPayload) {
    const item = await this.itemModel.create({
      booklistId,
      bookId: payload.bookId,
      addedById,
      position: payload.position ?? 0,
      notes: payload.notes,
    });

    await this.booklistModel.updateOne({ _id: booklistId }, { $inc: { totalItems: 1 } });
    return item;
  }

  async listItems(booklistId: string) {
    return this.itemModel.find({ booklistId }).sort({ position: 1, addedAt: -1 }).lean();
  }
}
