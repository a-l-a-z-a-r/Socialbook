import { Injectable } from '@nestjs/common';
import { Review } from './reviews/review.schema';
import { ReviewPayload, ReviewsService } from './reviews/reviews.service';

type FeedItem = {
  user: string;
  action: string;
  book: string;
  rating?: number;
  review?: string;
  status: string;
  created_at: string;
  coverUrl?: string;
};

type Shelf = {
  want_to_read: string[];
  currently_reading: string[];
  finished: string[];
  history: { label: string; finished: number }[];
};

@Injectable()
export class AppService {
  constructor(private readonly reviewsService: ReviewsService) {}

  private readonly coverTimeoutMs = this.readNumberEnv(process.env.COVER_TIMEOUT_MS, 5000);
  private readonly coverBatchSize = this.readNumberEnv(process.env.COVER_CHECK_BATCH, 5);

  private shelf: Shelf = {
    want_to_read: [
      'The Heaven & Earth Grocery Store',
      'Tomorrow, and Tomorrow, and Tomorrow',
      'Happy Place',
    ],
    currently_reading: ['Afterworld', 'The Poppy War', 'Gideon the Ninth'],
    finished: [
      'Fourth Wing',
      'Legends & Lattes',
      'Station Eleven',
      'The Anthropocene Reviewed',
    ],
    history: [
      { label: 'This Month', finished: 6 },
      { label: 'This Year', finished: 18 },
    ],
  };

  private preferenceWeights: Record<string, number> = {
    Novel: 4.8,
    'Sci-Fi': 4.6,
    Mystery: 4.4,
    Fantasy: 3.2,
    'Non-Fiction': 3.6,
  };

  private catalog: { title: string; genre: string; avg: number }[] = [
    { title: 'Tomorrow, and Tomorrow, and Tomorrow', genre: 'Novel', avg: 4.8 },
    { title: 'Station Eleven', genre: 'Sci-Fi', avg: 4.7 },
    { title: 'The Thursday Murder Club', genre: 'Mystery', avg: 4.4 },
    { title: 'Lessons in Chemistry', genre: 'Novel', avg: 4.5 },
    { title: 'Fourth Wing', genre: 'Fantasy', avg: 4.2 },
    { title: 'The Anthropocene Reviewed', genre: 'Non-Fiction', avg: 4.6 },
  ];

  async getFeed() {
    const reviews = await this.reviewsService.findAll();
    const reviewFeed = reviews.map((review) => this.toFeedItem(review));
    const filtered = await this.filterFeedByCover(reviewFeed);
    return { feed: filtered };
  }

  getShelf() {
    return { shelf: this.shelf };
  }

  getRecommendations() {
    return { recommendations: this.personalizedRecommendations() };
  }

  async getReviews() {
    const reviews = await this.reviewsService.findAll();
    return { reviews: reviews.map((review) => this.toResponse(review)) };
  }

  async addReview(payload: ReviewPayload) {
    const created = await this.reviewsService.create(payload);

    if (payload.status === 'finished') {
      this.shelf.finished.push(payload.book as string);
      this.shelf.history.unshift({ label: 'Recent', finished: 1 });
    }

    return this.toResponse(created);
  }

  hasRequiredReviewFields(payload: ReviewPayload) {
    const required: (keyof ReviewPayload)[] = ['user', 'book', 'rating', 'review', 'genre'];
    return required.every(
      (field) => payload[field] !== undefined && payload[field] !== null && payload[field] !== '',
    );
  }

  health() {
    return { status: 'ok', time: new Date().toISOString() };
  }

  private personalizedRecommendations(limit = 5) {
    const scored = this.catalog.map((book) => {
      const base = this.preferenceWeights[book.genre] ?? 3.5;
      const score = 0.65 * base + 0.35 * book.avg;

      return {
        ...book,
        score: Number(score.toFixed(2)),
        reason: this.reasonFor(book.genre),
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private reasonFor(genre: string) {
    if (genre === 'Fantasy') {
      return 'Dialed down because you rate Fantasy lower';
    }
    return `Because you rate ${genre} highly`;
  }

  private toFeedItem(review: Review): FeedItem {
    return {
      user: review.user,
      action: 'reviewed',
      book: review.book,
      rating: review.rating,
      review: review.review,
      status: review.status ?? 'review',
      created_at: this.formatCreatedAt(review.created_at),
      coverUrl: review.coverUrl,
    };
  }

  private toResponse(review: Review) {
    return {
      id: (review as any)._id?.toString?.() ?? undefined,
      user: review.user,
      book: review.book,
      rating: review.rating,
      review: review.review,
      genre: review.genre,
      created_at: this.formatCreatedAt(review.created_at),
      coverUrl: (review as any).coverUrl,
    };
  }

  private formatCreatedAt(value: unknown) {
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    return new Date().toISOString();
  }

  private readNumberEnv(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async filterFeedByCover(items: FeedItem[]) {
    const kept: FeedItem[] = [];

    for (let i = 0; i < items.length; i += this.coverBatchSize) {
      const batch = items.slice(i, i + this.coverBatchSize);
      const results = await Promise.all(
        batch.map(async (item) => {
          if (!item.coverUrl) return null;
          const ok = await this.isCoverAlive(item.coverUrl);
          return ok ? item : null;
        }),
      );
      kept.push(...results.filter((item): item is FeedItem => Boolean(item)));
    }

    return kept;
  }

  private async isCoverAlive(url: string) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    if (typeof fetch !== 'function') {
      return true;
    }

    const headOk = await this.checkCoverHead(url);
    if (headOk !== null) {
      return headOk;
    }

    return this.checkCoverGet(url);
  }

  private async checkCoverHead(url: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.coverTimeoutMs);

    try {
      const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
      if (res.status === 200) return true;
      if (res.status === 405 || res.status === 501) return null;
      return false;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async checkCoverGet(url: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.coverTimeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      return res.status === 200;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

}
