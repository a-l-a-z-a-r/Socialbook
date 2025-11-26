import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from './review.schema';

export type ReviewPayload = {
  user?: string;
  book?: string;
  rating?: number | string;
  review?: string;
  genre?: string;
  status?: string;
};

@Injectable()
export class ReviewsService {
  constructor(@InjectModel(Review.name) private reviewModel: Model<ReviewDocument>) {}

  async findAll(): Promise<Review[]> {
    return this.reviewModel.find().sort({ created_at: -1 }).lean().exec();
  }

  async create(payload: ReviewPayload): Promise<Review> {
    const rating = Number(payload.rating);

    const created = await this.reviewModel.create({
      user: payload.user,
      book: payload.book,
      rating,
      review: payload.review,
      genre: payload.genre,
      status: payload.status ?? 'review',
    });

    return created.toObject();
  }
}
