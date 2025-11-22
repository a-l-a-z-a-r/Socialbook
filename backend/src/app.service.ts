import { Injectable } from '@nestjs/common';

type FeedItem = {
  user: string;
  action: string;
  book: string;
  rating?: number;
  review?: string;
  status: string;
  created_at: string;
};

type Shelf = {
  want_to_read: string[];
  currently_reading: string[];
  finished: string[];
  history: { label: string; finished: number }[];
};

type Review = {
  id: number;
  user: string;
  book: string;
  rating: number;
  review: string;
  genre: string;
  created_at: string;
};

type ReviewPayload = {
  user?: string;
  book?: string;
  rating?: number | string;
  review?: string;
  genre?: string;
  status?: string;
};

@Injectable()
export class AppService {
  private feed: FeedItem[] = [
    {
      user: 'Luca',
      action: 'rated',
      book: 'Divine Rivals',
      rating: 4.9,
      review: 'My favorite enemies-to-lovers of the year.',
      status: 'finished',
      created_at: '2024-07-10T10:00:00Z',
    },
    {
      user: 'Nia',
      action: 'started',
      book: 'Before the Coffee Gets Cold',
      status: 'reading',
      created_at: '2024-07-10T09:42:00Z',
    },
    {
      user: 'Arjun',
      action: 'reviewed',
      book: 'Everything I Never Told You',
      review: 'Quietly devastating and hopeful.',
      status: 'review',
      created_at: '2024-07-10T09:21:00Z',
    },
  ];

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

  private reviews: Review[] = [
    {
      id: 1,
      user: 'Amina',
      book: 'Afterworld',
      rating: 4.7,
      review: 'Sharp, cinematic, and full of wonder.',
      genre: 'Sci-Fi',
      created_at: '2024-07-09T14:00:00Z',
    },
    {
      id: 2,
      user: 'Diego',
      book: 'Divine Rivals',
      rating: 4.9,
      review: 'Romance and war correspondence with heart.',
      genre: 'Fantasy',
      created_at: '2024-07-08T10:00:00Z',
    },
  ];

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

  getFeed() {
    return { feed: this.feed };
  }

  getShelf() {
    return { shelf: this.shelf };
  }

  getRecommendations() {
    return { recommendations: this.personalizedRecommendations() };
  }

  getReviews() {
    return { reviews: this.reviews };
  }

  addReview(payload: ReviewPayload) {
    const rating = Number(payload.rating);
    const createdAt = new Date().toISOString();

    const newReview: Review = {
      id: this.reviews.length + 1,
      user: payload.user as string,
      book: payload.book as string,
      rating,
      review: payload.review as string,
      genre: payload.genre as string,
      created_at: createdAt,
    };

    this.reviews.unshift(newReview);

    this.feed.unshift({
      user: payload.user as string,
      action: 'reviewed',
      book: payload.book as string,
      rating,
      review: payload.review,
      status: 'review',
      created_at: createdAt,
    });

    if (payload.status === 'finished') {
      this.shelf.finished.push(payload.book as string);
      this.shelf.history.unshift({ label: 'Recent', finished: 1 });
    }

    return newReview;
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
}
