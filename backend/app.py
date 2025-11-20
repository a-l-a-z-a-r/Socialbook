from datetime import datetime
from flask import Flask, jsonify, request

app = Flask(__name__)

# Seed data to make the API immediately usable in a demo.
feed = [
    {
        "user": "Luca",
        "action": "rated",
        "book": "Divine Rivals",
        "rating": 4.9,
        "review": "My favorite enemies-to-lovers of the year.",
        "status": "finished",
        "created_at": "2024-07-10T10:00:00Z",
    },
    {
        "user": "Nia",
        "action": "started",
        "book": "Before the Coffee Gets Cold",
        "status": "reading",
        "created_at": "2024-07-10T09:42:00Z",
    },
    {
        "user": "Arjun",
        "action": "reviewed",
        "book": "Everything I Never Told You",
        "review": "Quietly devastating and hopeful.",
        "status": "review",
        "created_at": "2024-07-10T09:21:00Z",
    },
]

shelf = {
    "want_to_read": [
        "The Heaven & Earth Grocery Store",
        "Tomorrow, and Tomorrow, and Tomorrow",
        "Happy Place",
    ],
    "currently_reading": ["Afterworld", "The Poppy War", "Gideon the Ninth"],
    "finished": [
        "Fourth Wing",
        "Legends & Lattes",
        "Station Eleven",
        "The Anthropocene Reviewed",
    ],
    "history": [
        {"label": "This Month", "finished": 6},
        {"label": "This Year", "finished": 18},
    ],
}

reviews = [
    {
        "id": 1,
        "user": "Amina",
        "book": "Afterworld",
        "rating": 4.7,
        "review": "Sharp, cinematic, and full of wonder.",
        "genre": "Sci-Fi",
        "created_at": "2024-07-09T14:00:00Z",
    },
    {
        "id": 2,
        "user": "Diego",
        "book": "Divine Rivals",
        "rating": 4.9,
        "review": "Romance and war correspondence with heart.",
        "genre": "Fantasy",
        "created_at": "2024-07-08T10:00:00Z",
    },
]

preference_weights = {
    "Novel": 4.8,
    "Sci-Fi": 4.6,
    "Mystery": 4.4,
    "Fantasy": 3.2,  # slightly deprioritized per prompt
    "Non-Fiction": 3.6,
}

catalog = [
    {"title": "Tomorrow, and Tomorrow, and Tomorrow", "genre": "Novel", "avg": 4.8},
    {"title": "Station Eleven", "genre": "Sci-Fi", "avg": 4.7},
    {"title": "The Thursday Murder Club", "genre": "Mystery", "avg": 4.4},
    {"title": "Lessons in Chemistry", "genre": "Novel", "avg": 4.5},
    {"title": "Fourth Wing", "genre": "Fantasy", "avg": 4.2},
    {"title": "The Anthropocene Reviewed", "genre": "Non-Fiction", "avg": 4.6},
]


def personalized_recommendations(limit: int = 5):
    """Return books ordered by preference + community average."""
    scored = []
    for book in catalog:
        base = preference_weights.get(book["genre"], 3.5)
        score = 0.65 * base + 0.35 * book["avg"]
        scored.append({**book, "score": round(score, 2), "reason": reason_for(book)})
    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[:limit]


def reason_for(book):
    genre = book["genre"]
    if genre == "Fantasy":
        return "Dialed down because you rate Fantasy lower"
    return f"Because you rate {genre} highly"


@app.get("/api/feed")
def get_feed():
    return jsonify({"feed": feed})


@app.get("/api/shelf")
def get_shelf():
    return jsonify({"shelf": shelf})


@app.get("/api/recommendations")
def get_recommendations():
    return jsonify({"recommendations": personalized_recommendations()})


@app.get("/api/reviews")
def get_reviews():
    return jsonify({"reviews": reviews})


@app.post("/api/reviews")
def add_review():
    data = request.get_json(force=True, silent=True) or {}
    required_fields = {"user", "book", "rating", "review", "genre"}
    if not required_fields.issubset(data):
        return jsonify({"error": "Missing required fields"}), 400

    new_review = {
        "id": len(reviews) + 1,
        "user": data["user"],
        "book": data["book"],
        "rating": float(data["rating"]),
        "review": data["review"],
        "genre": data["genre"],
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    reviews.insert(0, new_review)

    feed.insert(
        0,
        {
            "user": data["user"],
            "action": "reviewed",
            "book": data["book"],
            "rating": float(data["rating"]),
            "review": data["review"],
            "status": "review",
            "created_at": new_review["created_at"],
        },
    )

    if data.get("status") == "finished":
        shelf.setdefault("finished", []).append(data["book"])
        shelf.setdefault("history", []).insert(0, {"label": "Recent", "finished": 1})

    return jsonify(new_review), 201


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat() + "Z"})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
