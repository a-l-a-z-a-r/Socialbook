import { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const apiUrl = (path) => {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  return `${base}${path}`;
};

const keyFor = (item) => `${item.user ?? 'anon'}-${item.book ?? 'untitled'}-${item.created_at ?? ''}`;

const initials = (name = '') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const App = () => {
  const canvasRef = useRef(null);
  const user = { email: 'guest@socialbook', name: 'Guest' };
  const [feed, setFeed] = useState([]);
  const [backendBuild, setBackendBuild] = useState('unknown');
  const [backendCheckedAt, setBackendCheckedAt] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawMandelbrot = () => {
      const width = Math.floor(window.innerWidth);
      const height = Math.floor(window.innerHeight);
      const scale = 0.6;
      const renderWidth = Math.max(320, Math.floor(width * scale));
      const renderHeight = Math.max(240, Math.floor(height * scale));

      canvas.width = renderWidth;
      canvas.height = renderHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const image = ctx.createImageData(renderWidth, renderHeight);
      const maxIter = 80;
      const zoom = 1.35;
      const centerX = -0.6;
      const centerY = 0.0;
      const aspect = renderWidth / renderHeight;

      for (let y = 0; y < renderHeight; y += 1) {
        for (let x = 0; x < renderWidth; x += 1) {
          const cx = (x / renderWidth - 0.5) * 3.2 * zoom * aspect + centerX;
          const cy = (y / renderHeight - 0.5) * 3.2 * zoom + centerY;
          let zx = 0;
          let zy = 0;
          let iter = 0;
          while (zx * zx + zy * zy <= 4 && iter < maxIter) {
            const xt = zx * zx - zy * zy + cx;
            zy = 2 * zx * zy + cy;
            zx = xt;
            iter += 1;
          }

          const idx = (y * renderWidth + x) * 4;
          if (iter === maxIter) {
            image.data[idx] = 10;
            image.data[idx + 1] = 6;
            image.data[idx + 2] = 16;
            image.data[idx + 3] = 255;
          } else {
            const t = iter / maxIter;
            const r = Math.floor(24 + 230 * Math.pow(t, 0.6));
            const g = Math.floor(18 + 120 * Math.pow(t, 1.4));
            const b = Math.floor(60 + 200 * Math.pow(t, 0.8));
            image.data[idx] = r;
            image.data[idx + 1] = g;
            image.data[idx + 2] = b;
            image.data[idx + 3] = 255;
          }
        }
      }

      ctx.putImageData(image, 0, 0);
    };

    const handleResize = () => {
      drawMandelbrot();
    };

    drawMandelbrot();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const feedRes = await fetch(apiUrl('/feed')).then((r) => r.json());
        setFeed(feedRes?.feed ?? []);
      } catch (err) {
        console.error('Failed to load data', err);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const healthRes = await fetch(apiUrl('/health')).then((r) => r.json());
        setBackendBuild(healthRes?.build || 'unknown');
        setBackendCheckedAt(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Failed to load backend health', err);
      }
    };

    loadHealth();
  }, []);

  const handleImageError = (badKey) => {
    setFeed((prev) =>
      prev.map((item) => (keyFor(item) === badKey ? { ...item, coverUrl: null } : item)),
    );
  };

  return (
    <>
      <canvas ref={canvasRef} className="mandelbrot-bg" aria-hidden="true" />
      <header className="topbar">
        <div className="brand">
          <span className="spark" />
          <span className="wordmark">Socialbook</span>
        </div>
        <div className="nav">
          <span className="badge success">Guest</span>
          <span className="meta">{user?.email}</span>
          <span className="backend-status">
            <span className="backend-label">Backend</span>
            <span className="backend-tag">{backendBuild}</span>
            {backendCheckedAt && <span className="backend-time">Checked {backendCheckedAt}</span>}
          </span>
        </div>
      </header>

      <main>
        <section className="panel stack">
          <header className="panel-header">
            <div>
              <p className="label">Books</p>
              <h3>Latest feed</h3>
            </div>
          </header>
          {feed.length === 0 ? (
            <p className="empty-state">No reviews yet.</p>
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
