import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const apiUrl = (path) => {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  return `${base}${path}`;
};

const keyFor = (item) => `${item.user ?? 'anon'}-${item.book ?? 'untitled'}-${item.created_at ?? ''}`;
const normalizeCoverUrl = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';
  return trimmed;
};

const getPathname = (value) => {
  try {
    return new URL(value).pathname.toLowerCase();
  } catch {
    return value.split('?')[0].toLowerCase();
  }
};

const isJpegUrl = (value) => {
  const path = getPathname(value);
  return path.endsWith('.jpg') || path.endsWith('.jpeg');
};

const isGifUrl = (value) => getPathname(value).endsWith('.gif');

const MIN_COVER_BYTES = 2048;
const COVER_TIMEOUT_MS = 5000;

const probeCoverType = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COVER_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: `bytes=0-${MIN_COVER_BYTES - 1}` },
      signal: controller.signal,
    });
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('image/gif')) return false;
    if (!contentType.includes('image/jpeg')) return false;
    const lengthHeader = res.headers.get('content-length');
    if (lengthHeader) {
      const length = Number(lengthHeader);
      return Number.isFinite(length) && length >= MIN_COVER_BYTES;
    }
    const buffer = await res.arrayBuffer();
    return buffer.byteLength >= MIN_COVER_BYTES;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const filterNonGifCovers = async (items = []) => {
  const checks = await Promise.all(
    items.map(async (item) => ((await probeCoverType(item.coverUrl)) ? item : null)),
  );
  return checks.filter(Boolean);
};

const keepWithCover = (items = []) =>
  items
    .map((item) => ({ ...item, coverUrl: normalizeCoverUrl(item?.coverUrl) }))
    .filter((item) => item.coverUrl && isJpegUrl(item.coverUrl) && !isGifUrl(item.coverUrl));

const initials = (name = '') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const App = () => {
  const [dataLoading, setDataLoading] = useState(false);
  const user = { email: 'guest@socialbook', name: 'Guest' };
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      try {
        const feedRes = await fetch(apiUrl('/feed')).then((r) => r.json());
        const feedData = keepWithCover(feedRes?.feed ?? []);
        const jpegOnly = await filterNonGifCovers(feedData);
        setFeed(jpegOnly);
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setDataLoading(false);
      }
    };

    load();
  }, []);

  const handleImageError = (badKey) => {
    setFeed((prev) => prev.filter((item) => keyFor(item) !== badKey));
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="spark" />
          <span className="wordmark">Socialbook</span>
        </div>
        <div className="nav">
          <span className="badge success">Guest</span>
          <span className="meta">{user?.email}</span>
        </div>
      </header>

      <main>
        <section className="panel stack">
          <header className="panel-header">
            <div>
              <p className="label">Books</p>
              <h3>Latest feed</h3>
            </div>
            {dataLoading && <span className="badge">Updating</span>}
          </header>
          {feed.length === 0 ? (
            <div className="placeholder-grid">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="placeholder-card" />
              ))}
            </div>
          ) : (
            <ul className="feed-list books-list">
              {feed.map((item) => {
                const itemKey = keyFor(item);
                return (
                  <li key={itemKey}>
                    {item.coverUrl ? (
                      <div className="cover-thumb" aria-hidden="true">
                        <img
                          src={item.coverUrl}
                          alt={item.book}
                          loading="lazy"
                          onError={() => handleImageError(itemKey)}
                        />
                      </div>
                    ) : (
                      <div className="avatar" aria-hidden="true">
                        {initials(item.user)}
                      </div>
                    )}
                    <div>
                      <p className="title">
                        <strong>{item.book}</strong>
                      </p>
                      <div className="tags">
                        {item.user && <span className="tag">{item.user}</span>}
                        {item.rating && <span className="tag muted">{item.rating.toFixed(1)}★</span>}
                        {item.status && <span className="tag muted">{item.status}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
};

export default App;
