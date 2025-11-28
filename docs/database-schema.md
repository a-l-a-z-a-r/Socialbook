# Database Schema

## Overview
- **App DB**: MongoDB (`socialbook`)
- **Auth DB**: PostgreSQL (managed by Keycloak Helm chart; not customized here)

## MongoDB (`socialbook`)
- **Collection**: `reviews`
- **Indexes**: `{ created_at: -1 }` (default sort in service)

### Document shape
| Field        | Type      | Notes                                   |
| ------------ | --------- | --------------------------------------- |
| `_id`        | ObjectId  | MongoDB generated                       |
| `user`       | string    | required                                |
| `book`       | string    | required                                |
| `rating`     | number    | required, 1–5                           |
| `review`     | string    | required                                |
| `genre`      | string    | required                                |
| `status`     | string    | default: `"review"`                     |
| `coverUrl`   | string    | optional; used to render book covers    |
| `created_at` | date      | auto-set by Mongoose timestamps         |

### Sample document
```json
{
  "_id": { "$oid": "69298f106cc85f0f39fe482a" },
  "user": "OpenLibrary",
  "book": "The Iron Heel",
  "rating": 3.3,
  "review": "Jack London via Open Library",
  "genre": "OpenLibrary",
  "status": "finished",
  "coverUrl": "https://covers.openlibrary.org/b/isbn/9781986781909-L.jpg",
  "created_at": "2025-11-28T12:01:19.286Z"
}
```

## PostgreSQL (Keycloak)
- Deployed via Helm in namespace `keycloak`.
- Uses its own schema for realms/users/sessions; not customized by the app.
