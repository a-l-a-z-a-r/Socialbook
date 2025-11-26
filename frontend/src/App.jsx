import { useEffect, useMemo, useState } from 'react';

const AUTH_API = import.meta.env.VITE_AUTH_API || 'http://localhost:30400';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:30500';

const defaultShelf = {
  want_to_read: [],
  currently_reading: [],
  finished: [],
  history: [],
};

const initials = (name = '') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const getFriendList = (feed = []) => {
  const map = new Map();
  feed.forEach((item) => {
    if (!item.user) return;
    if (!map.has(item.user)) {
      map.set(item.user, { user: item.user, count: 0, last: item });
    }
    const entry = map.get(item.user);
    entry.count += 1;
    if (new Date(item.created_at) > new Date(entry.last.created_at)) {
      entry.last = item;
    }
  });
  return Array.from(map.values());
};

const App = () => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const [feed, setFeed] = useState([]);
  const [shelf, setShelf] = useState(defaultShelf);
  const [reviews, setReviews] = useState([]);

  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('sb_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('sb_user');
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setDataLoading(true);
      try {
        const [feedRes, shelfRes, reviewsRes] = await Promise.all([
          fetch(`${API_BASE}/feed`).then((r) => r.json()),
          fetch(`${API_BASE}/shelf`).then((r) => r.json()),
          fetch(`${API_BASE}/reviews`).then((r) => r.json()),
        ]);

        const feedData = feedRes?.feed ?? [];
        const shelfData = shelfRes?.shelf ?? defaultShelf;
        const reviewData = reviewsRes?.reviews ?? [];

        setFeed(feedData);
        setShelf(shelfData);
        setReviews(reviewData);

        const friends = getFriendList(feedData);
        const initialFriend = friends[0]?.user ?? null;
        setSelectedFriend(initialFriend);

        if (reviewData.length > 0) {
          setSelectedBook(reviewData[0].book);
        } else if (feedData.length > 0) {
          setSelectedBook(feedData[0].book);
        }
      } catch (err) {
        console.error('Failed to load data', err);
        setStatus('Unable to load feed data right now.');
      } finally {
        setDataLoading(false);
      }
    };

    load();
  }, [user]);

  const handleAuth = async (evt) => {
    evt.preventDefault();
    setAuthLoading(true);
    setStatus('');
    try {
      const res = await fetch(`${AUTH_API}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: mode === 'register' ? name : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to sign in');
      }
      setUser(data.user);
      localStorage.setItem('sb_user', JSON.stringify(data.user));
      setStatus(mode === 'login' ? 'Signed in.' : 'Account created.');
      setName('');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sb_user');
    setFeed([]);
    setShelf(defaultShelf);
    setReviews([]);
    setSelectedBook(null);
    setSelectedFriend(null);
    setStatus('Signed out.');
  };

  const friendList = useMemo(() => getFriendList(feed), [feed]);

  const friendBooks = useMemo(() => {
    if (!selectedFriend) return [];
    return feed.filter((item) => item.user === selectedFriend);
  }, [feed, selectedFriend]);

  const bookReviews = useMemo(() => {
    if (!selectedBook) return [];
    return reviews.filter((review) => review.book === selectedBook);
  }, [reviews, selectedBook]);

  if (!user) {
    return (
      <main className="auth-shell">
        <div className="brand-lockup">
          <div className="logo">
            <span className="spark large" />
            <div className="logo-text">
              <span className="wordmark">Socialbook</span>
              <span className="meta">Reading with friends</span>
            </div>
          </div>
          <p className="lede">Sign in to see your books, your friends, and every review in one place.</p>
        </div>
        <section className="auth-hero" id="login">
          <article className="panel auth-card shadow">
            <header className="panel-header">
              <div>
                <p className="label">{mode === 'login' ? 'Welcome back' : 'Join the circle'}</p>
                <h3>{mode === 'login' ? 'Log in to Socialbook' : 'Create your account'}</h3>
              </div>
              <div className="auth-toggle">
                <button
                  type="button"
                  className={mode === 'login' ? 'tab active' : 'tab'}
                  onClick={() => setMode('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={mode === 'register' ? 'tab active' : 'tab'}
                  onClick={() => setMode('register')}
                >
                  Register
                </button>
              </div>
            </header>
            <form className="form vertical" onSubmit={handleAuth}>
              {mode === 'register' && (
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Amina Gomez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="reader@socialbook.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="•••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button className="primary" type="submit" disabled={authLoading}>
                {authLoading ? 'Working...' : mode === 'login' ? 'Login' : 'Register'}
              </button>
              {status && <p className="meta status">{status}</p>}
            </form>
            <div className="switcher">
              {mode === 'login' ? (
                <>
                  <span className="meta">No account yet?</span>
                  <button type="button" className="ghost" onClick={() => setMode('register')}>
                    Create one
                  </button>
                </>
              ) : (
                <>
                  <span className="meta">Already have an account?</span>
                  <button type="button" className="ghost" onClick={() => setMode('login')}>
                    Go to login
                  </button>
                </>
              )}
            </div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="spark" />
          <span className="wordmark">Socialbook</span>
        </div>
        <div className="nav">
          <span className="badge success">Signed in</span>
          <span className="meta">{user?.email}</span>
        </div>
        <button className="ghost" type="button" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Your library</p>
            <h1>All your books and friends in one feed.</h1>
            <p className="lede">
              You are signed in as <strong>{user?.email}</strong>. Browse your shelf, peek at friends, and open any
              book to see its reviews instantly.
            </p>
            {status && <p className="meta status">{status}</p>}
            {dataLoading && <p className="meta">Loading latest feed...</p>}
          </div>
          <div className="panel shadow">
            <div className="panel-header">
              <div>
                <p className="label">Quick glance</p>
                <h3>Your shelf totals</h3>
              </div>
              <span className="badge">Live</span>
            </div>
            <div className="history">
              <div className="history-card">
                <p className="label">Want to Read</p>
                <h4>{shelf.want_to_read.length}</h4>
              </div>
              <div className="history-card">
                <p className="label">Reading</p>
                <h4>{shelf.currently_reading.length}</h4>
              </div>
              <div className="history-card">
                <p className="label">Finished</p>
                <h4>{shelf.finished.length}</h4>
              </div>
            </div>
          </div>
        </section>

        <section className="board">
          <article className="panel">
            <header className="panel-header">
              <div>
                <p className="label">Your shelf</p>
                <h3>Books you are tracking</h3>
              </div>
              <span className="badge">You</span>
            </header>
            <div className="shelf">
              <div className="shelf-row">
                <p>Want to Read</p>
                <p className="meta">{shelf.want_to_read.join(', ') || 'No titles yet'}</p>
              </div>
              <div className="shelf-row">
                <p>Currently Reading</p>
                <p className="meta">{shelf.currently_reading.join(', ') || 'No titles yet'}</p>
              </div>
              <div className="shelf-row">
                <p>Finished</p>
                <p className="meta">{shelf.finished.join(', ') || 'No titles yet'}</p>
              </div>
            </div>
          </article>

          <article className="panel">
            <header className="panel-header">
              <div>
                <p className="label">Friends</p>
                <h3>Tap a friend to view their books</h3>
              </div>
              <span className="badge">Social</span>
            </header>
            <ul className="feed-list small">
              {friendList.length === 0 && <li className="meta">No friends in feed yet.</li>}
              {friendList.map((friend) => (
                <li key={friend.user}>
                  <div className="avatar" aria-hidden="true">
                    {initials(friend.user)}
                  </div>
                  <div>
                    <p className="title">{friend.user}</p>
                    <p className="meta">{friend.count} recent books</p>
                    <div className="tags">
                      <button
                        type="button"
                        className={friend.user === selectedFriend ? 'tab active' : 'tab'}
                        onClick={() => setSelectedFriend(friend.user)}
                      >
                        View shelf
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="board">
          <article className="panel">
            <header className="panel-header">
              <div>
                <p className="label">Feed</p>
                <h3>Latest activity</h3>
              </div>
              <span className="badge">Live</span>
            </header>
            <ul className="feed-list">
              {feed.length === 0 && <li className="meta">No activity yet.</li>}
              {feed.map((item, idx) => (
                <li key={`${item.user}-${item.book}-${idx}`}>
                  <div className="avatar" aria-hidden="true">
                    {initials(item.user)}
                  </div>
                  <div>
                    <p className="title">
                      {item.user} {item.action} <strong>{item.book}</strong>
                      {item.rating ? ` ${item.rating.toFixed(1)}★` : ''}
                    </p>
                    {item.review && <p className="meta">“{item.review}”</p>}
                    <div className="tags">
                      <span className="tag">{item.status}</span>
                      <span className="tag muted">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <header className="panel-header">
              <div>
                <p className="label">Friend shelf</p>
                <h3>{selectedFriend ? `${selectedFriend}'s books` : 'Choose a friend'}</h3>
              </div>
              <span className="badge">Peek</span>
            </header>
            {friendBooks.length === 0 && <p className="meta">Select a friend to see their books.</p>}
            <div className="rec-grid">
              {friendBooks.map((item, idx) => (
                <div key={`${item.book}-${idx}`} className="rec-card" onClick={() => setSelectedBook(item.book)}>
                  <p className="chip">{item.action}</p>
                  <h4>{item.book}</h4>
                  {item.rating && <p className="meta">Rating: {item.rating.toFixed(1)}★</p>}
                  {item.review && <p className="meta">“{item.review}”</p>}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel stack">
          <header className="panel-header">
            <div>
              <p className="label">Book reviews</p>
              <h3>{selectedBook ? `Reviews for ${selectedBook}` : 'Select a book to view reviews'}</h3>
            </div>
            {selectedBook && <span className="badge">Open</span>}
          </header>
          {bookReviews.length === 0 && <p className="meta">No reviews yet for this book.</p>}
          <ul className="feed-list">
            {bookReviews.map((review, idx) => (
              <li key={`${review.user}-${idx}`}>
                <div className="avatar" aria-hidden="true">
                  {initials(review.user)}
                </div>
                <div>
                  <p className="title">
                    {review.user} rated <strong>{review.book}</strong> {review.rating}★
                  </p>
                  <p className="meta">“{review.review}”</p>
                  <div className="tags">
                    <span className="tag">{review.genre}</span>
                    <span className="tag muted">{new Date(review.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
};

export default App;
