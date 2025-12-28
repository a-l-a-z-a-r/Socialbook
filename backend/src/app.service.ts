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

  private readonly coverMinBytes = this.readNumberEnv(process.env.COVER_MIN_BYTES, 2048);
  private readonly coverTimeoutMs = this.readNumberEnv(process.env.COVER_TIMEOUT_MS, 5000);
  private readonly coverBatchSize = this.readNumberEnv(process.env.COVER_CHECK_BATCH, 5);
  private readonly coverProbeBytes = this.readNumberEnv(process.env.COVER_PROBE_BYTES, 16384);

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
    return { status: 'ok', time: new Date().toISOString(), build: 'backend-deploy-check' };
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
          if (!ok) {
            console.warn('[cover-filter] dropped', item.coverUrl);
          }
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
      if (res.status === 405 || res.status === 501) return null;
      const contentType = res.headers.get('content-type');
      if (contentType && !this.isImageContentType(contentType)) {
        console.warn('[cover-filter] head content-type reject', url, contentType);
        return false;
      }
      const lengthHeader = res.headers.get('content-length');
      if (!lengthHeader) return null;
      const length = Number(lengthHeader);
      if (!Number.isFinite(length)) return null;
      if (length < this.coverMinBytes) {
        console.warn('[cover-filter] head size reject', url, length);
        return false;
      }
      return null;
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
        headers: { Range: `bytes=0-${this.coverProbeBytes - 1}` },
        signal: controller.signal,
      });
      const contentType = res.headers.get('content-type');
      if (contentType && !this.isImageContentType(contentType)) {
        console.warn('[cover-filter] get content-type reject', url, contentType);
        return false;
      }
      const buffer = await res.arrayBuffer();
      const sizeOk = this.isMinBytes(buffer, res.headers.get('content-length'));
      if (!sizeOk) {
        console.warn('[cover-filter] get size reject', url, buffer.byteLength);
        return false;
      }
      const dimensions = this.getImageDimensions(buffer);
      if (!dimensions) {
        console.warn('[cover-filter] get dimensions missing', url);
        return false;
      }
      if (dimensions.width <= 1 || dimensions.height <= 1) {
        console.warn('[cover-filter] get dimensions reject', url, dimensions);
        return false;
      }
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private isImageContentType(value: string) {
    const normalized = value.toLowerCase();
    if (!normalized.startsWith('image/')) return false;
    if (normalized.includes('image/gif')) return false;
    return true;
  }

  private isMinBytes(buffer: ArrayBuffer, lengthHeader: string | null) {
    if (lengthHeader) {
      const length = Number(lengthHeader);
      if (Number.isFinite(length)) {
        return length >= this.coverMinBytes;
      }
    }
    return buffer.byteLength >= this.coverMinBytes;
  }

  private getImageDimensions(buffer: ArrayBuffer) {
    const data = new Uint8Array(buffer);
    if (data.length < 10) return null;

    // PNG
    if (
      data.length >= 24 &&
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47 &&
      data[4] === 0x0d &&
      data[5] === 0x0a &&
      data[6] === 0x1a &&
      data[7] === 0x0a
    ) {
      const width = this.readUint32BE(data, 16);
      const height = this.readUint32BE(data, 20);
      if (width && height) return { width, height };
      return null;
    }

    // GIF
    if (
      data.length >= 10 &&
      data[0] === 0x47 &&
      data[1] === 0x49 &&
      data[2] === 0x46
    ) {
      const width = data[6] | (data[7] << 8);
      const height = data[8] | (data[9] << 8);
      if (width && height) return { width, height };
      return null;
    }

    // JPEG
    if (data[0] === 0xff && data[1] === 0xd8) {
      let offset = 2;
      while (offset + 3 < data.length) {
        if (data[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = data[offset + 1];
        const isSof =
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf);
        const length = this.readUint16BE(data, offset + 2);
        if (!length || offset + 2 + length > data.length) break;
        if (isSof) {
          const height = this.readUint16BE(data, offset + 5);
          const width = this.readUint16BE(data, offset + 7);
          if (width && height) return { width, height };
          return null;
        }
        offset += 2 + length;
      }
    }

    return null;
  }

  private readUint16BE(data: Uint8Array, offset: number) {
    if (offset + 1 >= data.length) return 0;
    return (data[offset] << 8) | data[offset + 1];
  }

  private readUint32BE(data: Uint8Array, offset: number) {
    if (offset + 3 >= data.length) return 0;
    return (
      (data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]
    ) >>> 0;
  }

}
