const App = () => (
  <>
    <header className="topbar">
      <div className="brand">
        <span className="spark" />
        <span className="wordmark">Socialbook</span>
      </div>
      <nav className="nav">
        <a href="#feed">Feed</a>
        <a href="#shelf">Shelf</a>
        <a href="#recommendations">Recommended</a>
        <a href="#reviews">Reviews</a>
      </nav>
      <button className="cta" type="button">
        Start Reading
      </button>
    </header>
    <main>
      <section className="hero" id="hero">
        <div className="hero-copy">
          <p className="eyebrow">For readers who socialize</p>
          <h1>Track, share, and discover books together.</h1>
          <p className="lede">
            Live activity from friends, shelves that update automatically, and recommendations that learn what you
            love.
          </p>
          <div className="actions">
            <button className="primary" type="button">
              Create account
            </button>
            <button className="ghost" type="button">
              Browse community
            </button>
          </div>
          <div className="quick-stats">
            <div className="pill">
              Currently reading <strong>3</strong>
            </div>
            <div className="pill">
              Finished this month <strong>6</strong>
            </div>
            <div className="pill">
              New recs today <strong>4</strong>
            </div>
          </div>
        </div>
        <div className="hero-panels">
          <article className="panel shadow">
            <header>
              <div>
                <p className="label">Personalized Activity Feed</p>
                <h3>Friends finishing books in real time</h3>
              </div>
              <span className="badge success">Live</span>
            </header>
            <ul className="feed-list small">
              <li>
                <div className="avatar" aria-hidden="true">
                  AG
                </div>
                <div>
                  <p className="title">
                    Amina finished <strong>Afterworld</strong>
                  </p>
                  <p className="meta">Rated 4.7 · Just now</p>
                </div>
              </li>
              <li>
                <div className="avatar" aria-hidden="true">
                  DL
                </div>
                <div>
                  <p className="title">
                    Diego started <strong>The Poppy War</strong>
                  </p>
                  <p className="meta">Adds to Currently Reading</p>
                </div>
              </li>
              <li>
                <div className="avatar" aria-hidden="true">
                  MS
                </div>
                <div>
                  <p className="title">
                    Mara reviewed <strong>Fourth Wing</strong>
                  </p>
                  <p className="meta">“Cliffhanger heaven.”</p>
                </div>
              </li>
            </ul>
          </article>
          <article className="panel shadow">
            <header>
              <div>
                <p className="label">Recommendations</p>
                <h3>Shifts with every rating</h3>
              </div>
              <span className="badge">Adaptive</span>
            </header>
            <div className="recs-preview">
              <div>
                <p className="chip">Because you love novels</p>
                <h4>Tomorrow, and Tomorrow, and Tomorrow</h4>
                <p className="meta">Friend picks · 4.8 avg</p>
              </div>
              <div>
                <p className="chip">Less Fantasy</p>
                <h4>Station Eleven</h4>
                <p className="meta">Grounded Sci-Fi · 4.7 avg</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="board" id="feed">
        <article className="panel">
          <header className="panel-header">
            <div>
              <p className="label">Activity Feed</p>
              <h3>What friends are doing</h3>
            </div>
            <span className="badge">Live</span>
          </header>
          <ul className="feed-list">
            <li>
              <div className="avatar" aria-hidden="true">
                LC
              </div>
              <div>
                <p className="title">
                  Luca rated <strong>Divine Rivals</strong> 4.9 ★
                </p>
                <p className="meta">“My favorite enemies-to-lovers of the year.”</p>
                <div className="tags">
                  <span className="tag">Finished</span>
                  <span className="tag muted">5m ago</span>
                </div>
              </div>
            </li>
            <li>
              <div className="avatar" aria-hidden="true">
                NS
              </div>
              <div>
                <p className="title">
                  Nia started <strong>Before the Coffee Gets Cold</strong>
                </p>
                <p className="meta">Moved to Currently Reading</p>
                <div className="tags">
                  <span className="tag">Update</span>
                  <span className="tag muted">14m ago</span>
                </div>
              </div>
            </li>
            <li>
              <div className="avatar" aria-hidden="true">
                AR
              </div>
              <div>
                <p className="title">
                  Arjun reviewed <strong>Everything I Never Told You</strong>
                </p>
                <p className="meta">“Quietly devastating and hopeful.”</p>
                <div className="tags">
                  <span className="tag">Review</span>
                  <span className="tag muted">21m ago</span>
                </div>
              </div>
            </li>
          </ul>
        </article>

        <article className="panel" id="shelf">
          <header className="panel-header">
            <div>
              <p className="label">Shelf & History</p>
              <h3>Always synced with your actions</h3>
            </div>
            <span className="badge">Auto</span>
          </header>
          <div className="shelf">
            <div className="shelf-row">
              <p>Want to Read</p>
              <div className="progress">
                <span style={{ width: '62%' }} />
              </div>
              <p className="meta">8 titles queued</p>
            </div>
            <div className="shelf-row">
              <p>Currently Reading</p>
              <div className="progress">
                <span style={{ width: '45%' }} />
              </div>
              <p className="meta">3 in motion</p>
            </div>
            <div className="shelf-row">
              <p>Finished</p>
              <div className="progress">
                <span style={{ width: '88%' }} />
              </div>
              <p className="meta">42 completed</p>
            </div>
          </div>
          <div className="history">
            <div className="history-card">
              <p className="label">This Month</p>
              <h4>6 books</h4>
              <p className="meta">You are ahead of pace</p>
            </div>
            <div className="history-card">
              <p className="label">This Year</p>
              <h4>18 books</h4>
              <p className="meta">Goal: 36 books</p>
            </div>
          </div>
        </article>

        <article className="panel" id="recommendations">
          <header className="panel-header">
            <div>
              <p className="label">Recommended for You</p>
              <h3>Adapts to ratings and shelves</h3>
            </div>
            <span className="badge">Dynamic</span>
          </header>
          <div className="rec-grid">
            <div className="rec-card">
              <p className="chip">Novels · Because you rated 4.8★</p>
              <h4>Tomorrow, and Tomorrow, and Tomorrow</h4>
              <p className="meta">Friend-favorite · 4.8 avg</p>
            </div>
            <div className="rec-card">
              <p className="chip">Mystery · Because friends finished</p>
              <h4>The Thursday Murder Club</h4>
              <p className="meta">Trending in your circle</p>
            </div>
            <div className="rec-card">
              <p className="chip">Less Fantasy</p>
              <h4>Lessons in Chemistry</h4>
              <p className="meta">Smart, voicey, no dragons</p>
            </div>
          </div>
        </article>
      </section>

      <section className="panel stack" id="reviews">
        <header className="panel-header">
          <div>
            <p className="label">Reviews & Ratings</p>
            <h3>Share a take, update the feed</h3>
          </div>
          <span className="badge">Social</span>
        </header>
        <form className="form">
          <div className="field">
            <label htmlFor="title">Book title</label>
            <input id="title" name="title" type="text" placeholder="The Invisible Life of Addie LaRue" />
          </div>
          <div className="field">
            <label htmlFor="rating">Rating</label>
            <input id="rating" name="rating" type="number" min="1" max="5" step="0.1" defaultValue="4.6" />
          </div>
          <div className="field">
            <label htmlFor="review">Your thoughts</label>
            <textarea
              id="review"
              name="review"
              rows="3"
              placeholder="Fast, warm, and impossible to put down—friends should read next."
            />
          </div>
          <button className="primary" type="button">
            Post review
          </button>
        </form>
        <p className="meta">
          Posting a review updates the book rating, your shelf, and your friends&apos; feeds automatically.
        </p>
      </section>
    </main>
  </>
);

export default App;
