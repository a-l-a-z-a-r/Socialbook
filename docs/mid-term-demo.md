# Mid-term Demo - M7011E

**Group Number**: (not provided)  
**Team Members**: (not listed)  
**Date**: (today)

---

## Part 1: Technical Infrastructure
### Repository & CI/CD
- [x] Git repository with contributions
- **Repo URL**: local `/home/alazar/socialbook/Socialbook` (not published)
- [ ] GitOps CI pipeline functional  
  **Link**: n/a  
  **Status**: Not started
- [ ] ArgoCD setup for GitOps deployment (CD)  
  **Status**: Not started

### Kubernetes Deployment
- [x] Services deployed to K3s cluster  
  **Services deployed**: backend (NestJS), frontend (React), mongo, keycloak, postgres
- **Public URL(s):** frontend `http://46-62-130-16.nip.io:30090`, backend `http://46-62-130-16.nip.io:30500/api`, Keycloak `https://keycloak.46-62-130-16.nip.io` (nip.io host)
- [ ] HTTPS with certificates working  
  **Status**: In progress (Keycloak ingress TLS via cert-manager staging; frontend/backend via NodePort HTTP)
- [ ] Monitoring/Observability setup  
  **Status**: Not started

### Backend Services
- [ ] Microservices architecture implemented  
  **Service 1**: backend (NestJS API for feed/reviews)  
  **Service 2**: Keycloak (auth)  
  **Service 3**: n/a
- [x] Database deployed and accessible  
  **Type**: Mixed (MongoDB for app data, PostgreSQL for Keycloak)  
  **Schema**: `docs/database-schema.md`, `backend/src/reviews/review.schema.ts`
- [x] Inter-service communication method  
  **Approach**: REST

### Testing
- [ ] Backend tests written  
  **Link**: n/a  
  **Coverage estimate**: Not measured yet

### Frontend
- [x] Frontend framework deployed  
  **Framework**: React (Vite)  
  **Public URL**: `http://46-62-130-16.nip.io:30090`  
  **Status**: Connected to backend; auth works via Keycloak nip.io host

### Security & Auth
- [ ] Keycloak integration status  
  **Status**: Basic auth working with nip.io host; `.se` DNS not set up

---

## Part 2: Feature Implementation
1. **Book feed with cover images**  
   - Status: Deployed and working  
   - Can demo: Yes
2. **Keycloak-protected frontend**  
   - Status: In progress (works with nip.io host)  
   - Can demo: Yes (using nip.io)
3. **Review storage (Mongo)**  
   - Status: Deployed and working  
   - Can demo: Yes
4. **Recommendations/shelf mock data**  
   - Status: Deployed (static)  
   - Can demo: Yes

---

## Part 3: Self-Assessment
**Overall progress:**  
- [ ] Ahead of schedule  
- [ ] On track  
- [x] Slightly behind but manageable  
- [ ] Significantly behind - need help

**What's working well:** Core backend/frontend deployed on K3s; feed populated with cover images; Keycloak reachable via nip.io.  
**Biggest blocker so far:** No public DNS for the `.se` Keycloak host; no CI/CD/GitOps yet.  
**What would help most:** Set DNS or standardize on nip.io, and spin up CI/CD to avoid manual rollouts.  
**Team dynamics:** No issues to report.

---

## Part 4: Demo Preparation
- Show frontend at `http://46-62-130-16.nip.io:30090` with the feed and covers.
- Auth flow via `https://keycloak.46-62-130-16.nip.io` (nip.io host).
- Backend endpoints: `http://46-62-130-16.nip.io:30500/api/health` and `/api/feed`.
- Database schema: `docs/database-schema.md` and `backend/src/reviews/review.schema.ts`.

Be ready to answer:
- GitOps deployment: not set up yet; plan is to add CI (build/test) and ArgoCD for CD.
- Architecture: single backend + Keycloak; plan to keep REST, possibly split services later.
- Next priority: fix DNS/TLS for Keycloak or stay on nip.io; add CI/CD; add tests.
