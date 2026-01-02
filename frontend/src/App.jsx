import { useEffect, useRef, useState } from 'react';
import { getKeycloak } from './keycloak';
import { hasKeycloakConfig } from './keycloak-config';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const apiUrl = (path) => {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  return `${base}${path}`;
};

const keyFor = (item) => `${item.user ?? 'anon'}-${item.book ?? 'untitled'}-${item.created_at ?? ''}`;

const authFetch = async (path, token) => {
  if (!token) {
    throw new Error('Missing access token');
  }

  const response = await fetch(apiUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json();
};

const initials = (name = '') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const App = () => {
  const canvasRef = useRef(null);
  const initAuthRef = useRef(false);
  const [authState, setAuthState] = useState({ loading: true, authenticated: false });
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState('');
  const [feed, setFeed] = useState([]);

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
    if (!hasKeycloakConfig()) {
      setAuthError(
        'Missing Keycloak configuration. Set VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, and VITE_KEYCLOAK_CLIENT_ID.',
      );
      setAuthState({ loading: false, authenticated: false });
      return;
    }

    if (initAuthRef.current) {
      return;
    }
    initAuthRef.current = true;

    const keycloak = getKeycloak();

    keycloak
      .init({
        onLoad: 'check-sso',
        checkLoginIframe: false,
      })
      .then((authenticated) => {
        setAuthState({ loading: false, authenticated });
        if (!authenticated) return;

        keycloak
          .loadUserProfile()
          .then((profileData) => {
            setProfile(profileData);
          })
          .catch(() => {
            setAuthError('Unable to load user profile.');
          });

        loadFeed();
      })
      .catch((err) => {
        console.error('Keycloak initialization error:', err);
        setAuthError('Failed to initialize authentication.');
        setAuthState({ loading: false, authenticated: false });
      });

    const refreshInterval = setInterval(() => {
      if (!keycloak.authenticated) return;
      keycloak
        .updateToken(70)
        .catch(() => {
          setAuthError('Session expired. Please log in again.');
        });
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, []);

  const loadFeed = async () => {
    try {
      const keycloak = getKeycloak();
      await keycloak.updateToken(70);
      const feedRes = await authFetch('/feed', keycloak.token);
      setFeed(feedRes?.feed ?? []);
      setAuthError('');
    } catch (err) {
      console.error('Failed to load data', err);
      setAuthError(err.message || 'Failed to load feed.');
    }
  };

  const handleLogin = () => {
    const keycloak = getKeycloak();
    keycloak.login({
      idpHint: 'github',
      redirectUri: window.location.href,
    });
  };

  const handleLogout = () => {
    getKeycloak().logout();
  };

  const handleImageError = (badKey) => {
    setFeed((prev) =>
      prev.map((item) => (keyFor(item) === badKey ? { ...item, coverUrl: null } : item)),
    );
  };

  const displayName =
    profile?.firstName || profile?.lastName
      ? `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()
      : profile?.username || 'Reader';
  const statusLabel = authState.authenticated ? 'Online' : 'Signed out';
  const hasConfig = hasKeycloakConfig();

  return (
    <>
      <canvas ref={canvasRef} className="mandelbrot-bg" aria-hidden="true" />
      <header className="topbar">
        <div className="brand">
          <span className="spark" />
          <span className="wordmark">Socialbook</span>
        </div>
        <div className="nav">
          <span className={`badge ${authState.authenticated ? 'success' : ''}`}>{statusLabel}</span>
          {authState.authenticated && (
            <>
              <span className="meta">{displayName}</span>
              <button className="ghost" type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {authState.loading ? (
        <main className="auth-shell">
          <section className="auth-hero">
            <div className="hero-copy">
              <p className="label">Authenticating</p>
              <h1>Syncing your Socialbook</h1>
              <p className="lede">Waiting for Keycloak to finish the handshake.</p>
            </div>
          </section>
        </main>
      ) : !authState.authenticated ? (
        <main className="auth-shell">
          <section className="auth-hero">
            <div className="hero-copy">
              <p className="label">Sign in required</p>
              <h1>Welcome back to Socialbook</h1>
              <p className="lede">
                Log in with your Keycloak account to see your personalized reading feed.
              </p>
              {authError && <p className="empty-state">{authError}</p>}
              <div className="actions">
                {hasConfig && (
                  <button className="cta" type="button" onClick={handleLogin}>
                    Continue with GitHub
                  </button>
                )}
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main>
          <section className="panel stack">
            <header className="panel-header">
              <div>
                <p className="label">Books</p>
                <h3>Latest feed</h3>
              </div>
              <div className="meta">{profile?.email}</div>
            </header>
            {authError && <p className="empty-state">{authError}</p>}
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
                          {item.rating && (
                            <span className="tag muted">{item.rating.toFixed(1)}★</span>
                          )}
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
      )}
    </>
  );
};

export default App;
