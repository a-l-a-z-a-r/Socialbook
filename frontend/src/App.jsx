import { useEffect, useState } from 'react';
import keycloak from './keycloak';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const apiUrl = (path) => {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  return `${base}${path}`;
};

const AUTH_DISABLED = false;

const keyFor = (item) => `${item.user ?? 'anon'}-${item.book ?? 'untitled'}-${item.created_at ?? ''}`;
const keepWithCover = (items = []) =>
  items.filter((item) => item?.coverUrl && typeof item.coverUrl === 'string' && item.coverUrl.trim() !== '');

const initials = (name = '') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const App = () => {
  const [keycloakReady, setKeycloakReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  const [feed, setFeed] = useState([]);

  useEffect(() => {
    if (AUTH_DISABLED) {
      setAuthenticated(true);
      setUser({ email: 'guest@socialbook', name: 'Guest' });
      setKeycloakReady(true);
      return;
    }

    const init = async () => {
      try {
        const pkceMethod = window?.isSecureContext && window?.crypto?.subtle ? 'S256' : false;
        const authenticatedSession = await keycloak.init({
          onLoad: 'login-required',
          checkLoginIframe: false,
          pkceMethod,
        });
        setAuthenticated(authenticatedSession);
        if (authenticatedSession) {
          setToken(keycloak.token);
          const profile = await keycloak.loadUserProfile();
          setUser({
            email: profile.email || keycloak.tokenParsed?.preferred_username,
            name: `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.username,
          });
          keycloak.onTokenExpired = () => {
            keycloak
              .updateToken(30)
              .then((refreshed) => {
                if (refreshed) {
                  setToken(keycloak.token);
                }
              })
              .catch(() => keycloak.logout({ redirectUri: window.location.origin }));
          };
        }
      } catch (err) {
        console.error('Keycloak init failed', err);
      } finally {
        setKeycloakReady(true);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (AUTH_DISABLED) return;
    if (!authenticated) return;
    const interval = setInterval(() => {
      keycloak
        .updateToken(30)
        .then((refreshed) => {
          if (refreshed) {
            setToken(keycloak.token);
          }
        })
        .catch(() => keycloak.logout({ redirectUri: window.location.origin }));
    }, 20000);

    return () => clearInterval(interval);
  }, [authenticated]);

  useEffect(() => {
    if (!token && !AUTH_DISABLED) return;
    const load = async () => {
      setDataLoading(true);
      try {
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        const feedRes = await fetch(apiUrl('/feed'), { headers: authHeaders }).then((r) => r.json());
        const feedData = keepWithCover(feedRes?.feed ?? []);
        setFeed(feedData);
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setDataLoading(false);
      }
    };

    load();
  }, [token]);

  const handleImageError = (badKey) => {
    setFeed((prev) => prev.filter((item) => keyFor(item) !== badKey));
  };

  const handleLogout = () => {
    setUser(null);
    setFeed([]);
    if (!AUTH_DISABLED) {
      keycloak.logout({ redirectUri: window.location.origin });
    }
  };

  if (!keycloakReady && !AUTH_DISABLED) {
    return (
      <main className="auth-shell">
        <p className="meta">Connecting to Sign-In...</p>
      </main>
    );
  }

  if ((!authenticated || !user) && !AUTH_DISABLED) {
    return (
      <main className="auth-shell">
        <p className="meta">Redirecting to Keycloak...</p>
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
