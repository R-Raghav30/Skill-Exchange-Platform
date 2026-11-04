# SkillSwap — Campus Peer-to-Peer Skill Exchange Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Frontend: Vanilla JS](https://img.shields.io/badge/Frontend-ES6%2B%20%7C%20HTML5%20%7C%20CSS3-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Architecture: Clean Data Layer](https://img.shields.io/badge/Architecture-Decoupled%20Data%20Facade-8B5CF6)](#4-architecture)

---

## 1. Project Overview

SkillSwap is a decentralized peer-to-peer knowledge sharing and mentorship web application designed specifically for college campuses. It eliminates financial barriers to tutoring by enabling students to trade skills directly—teaching areas of expertise (such as Data Structures or Figma) in exchange for subjects they want to master (such as Web Development or Japanese). 

By replacing unstructured messaging boards and expensive private tutoring with structured exchange proposals, integrated session scheduling, and a verified reputation model, SkillSwap fosters collaborative, reciprocal peer learning across academic departments.

---

## 2. Features

- **College-Verified Authentication:** Secure student onboarding requiring institutional credentials (`.edu` college email, USN, academic year, and department) backed by Supabase Auth and JWT session persistence.
- **Dual Skill Inventory Management:** Separate management workflows for skills users can teach (*Offers*) versus skills they want to learn (*Requests*), categorized across fields like Coding, Design, Music, and Academics.
- **Dynamic Mentor Discovery & Search:** Real-time search by keyword and category chips with mentor cards displaying academic year, department, completed session counts, and cumulative peer ratings.
- **Structured Peer Exchange Lifecycles:** Proposal workflow allowing learners to submit personalized learning requests and mentors to accept or decline with automatic inbox status updates.
- **Interactive Session Scheduling Hub:** Once an exchange is accepted, either student can schedule meeting dates, pick custom durations (30/45/60 min), and configure meeting venues (Google Meet with 1-click auto-link generation, Zoom, MS Teams, or on-campus library study rooms).
- **Calendar Synchronization:** One-click automated Google Calendar event creation with pre-populated participant details, subject agenda, and direct virtual meeting links.
- **Reputation & Review System:** Post-session 5-star rating matrix with optional qualitative feedback that dynamically recalculates the mentor's aggregate campus rating and completed session tallies.
- **Gamified Campus Leaderboard:** Visual podium and ranked directory highlighting top mentors by rating and session volume, incentivizing active academic contributions with badges.
- **Department & Interest Groups:** Collaborative community boards categorized by technical disciplines and student clubs to coordinate group study sessions and project teams.
- **Administrative Moderation Dashboard:** High-level platform monitoring interface displaying total student adoption, system-wide exchange volume, and active review queues.

---

## 3. Tech Stack

| Technology | Layer / Role | Purpose & Implementation Details |
| :--- | :--- | :--- |
| **HTML5 & Semantic DOM** | Markup & Structure | Clean, accessible semantic page structures across 13 modular views without single-page-application routing overhead. |
| **Vanilla JavaScript (ES6+)** | Client Logic & Controller | Implements dynamic view rendering, asynchronous state handling, input sanitization, form validation, and reactive UI updates using native Web APIs. |
| **CSS3 & Design Tokens** | Presentation & Design System | Custom "Playful Corporate Modern" design system using CSS variables, responsive Flexbox/CSS Grid layouts, glassmorphism overlays, and smooth CSS keyframe transitions. |
| **Supabase (BaaS)** | Backend & Infrastructure | Managed backend providing authentication, relational database storage, and instant RESTful API generation via PostgREST. |
| **PostgreSQL 15** | Relational Database | Relational persistence enforcing relational constraints, foreign keys, row schemas, and aggregate arithmetic across users, skills, requests, and sessions. |
| **Supabase Auth (GoTrue)** | Security & Authentication | Handles user sign-up, password encryption, secure session tokens, and identity management with custom metadata mapping. |
| **Google Calendar API (URL Scheme)** | Third-Party Integration | Constructs dynamic RFC-compliant URL query strings enabling instant zero-dependency calendar entry exports. |

---

## 4. Architecture

SkillSwap uses a **Decoupled Client-Data Facade Pattern**. The user interface layer never makes raw database queries or direct network protocol calls. Instead, all subpages communicate exclusively with a centralized asynchronous API facade (`db` object in `shared/app.js`), which maps application-level models to Supabase PostgreSQL tables.

```mermaid
flowchart TD
    subgraph Client Layer [Client Application - Browser]
        UI[Modular HTML Views\nDashboard | Search | Booking | Profile]
        Styles[CSS Design System\nshared.css]
        AppCore[Core App Engine\nshared/app.js]
        DataFacade[Async Data Facade\ndb Object]
        ObjectMapper[Object Mapper Utilities\nsnake_case ⇄ camelCase]
    end

    subgraph External Services [Cloud & External Services]
        GCal[Google Calendar Service\nDynamic URL Generator]
        GMeet[Google Meet Integration\nInstant Link Generator]
    end

    subgraph Supabase Platform [Supabase Backend as a Service]
        AuthEngine[Supabase GoTrue Auth\nJWT Session Management]
        PostgREST[PostgREST Engine\nAuto-Generated RESTful Endpoints]
        
        subgraph Relational Database [PostgreSQL Database]
            T_Profiles[(profiles\nUSN, Year, Dept, Mentor Score)]
            T_Skills[(skills\nOffers & Requests)]
            T_Requests[(requests\nExchange Proposals)]
            T_Sessions[(sessions\nSchedules, Platforms, Ratings)]
        end
    end

    UI --> AppCore
    Styles -.-> UI
    AppCore --> DataFacade
    DataFacade --> ObjectMapper
    DataFacade --> GCal
    DataFacade --> GMeet

    DataFacade -- Supabase JS SDK (CDN) --> AuthEngine
    DataFacade -- HTTPS / PostgREST --> PostgREST

    AuthEngine --> T_Profiles
    PostgREST --> T_Profiles
    PostgREST --> T_Skills
    PostgREST --> T_Requests
    PostgREST --> T_Sessions
```

### Architectural Highlights
- **Layer Decoupling:** Any underlying backend transition (from LocalStorage mock to Supabase PostgreSQL) requires edits only within `shared/app.js`, while all 13 view templates remain untouched.
- **Relational Integrity:** Foreign key dependencies enforce cascading integrity across profile entities, cataloged skills, and session bookings.
- **Client-Side Data Normalization:** Inbound PostgreSQL `snake_case` database rows are systematically mapped to front-end idiomatic `camelCase` entities before rendering.

---

## 5. Project Structure

```
skillswap/
├── index.html                  # Root landing router (redirects based on auth state)
├── shared/
│   ├── app.js                  # Central data facade, auth manager, navbar & toasts
│   └── shared.css              # Universal design system tokens, components & utilities
├── login/
│   └── index.html              # Student authentication page with demo credentials
├── register/
│   └── index.html              # College account onboarding with institutional validation
├── dashboard/
│   └── index.html              # Summary hub: active statistics, incoming requests, recommendations
├── search-skills/
│   └── index.html              # Skill catalog search, category filters, and request modal
├── my-skills/
│   └── index.html              # Inventory manager for offered and requested skills
├── exchange-requests/
│   └── index.html              # Incoming/outgoing proposal management and status tracking
├── book-session/
│   └── index.html              # 1-on-1 scheduling hub, date/time chips, venue & calendar links
├── rate-session/
│   └── index.html              # Interactive star rating and qualitative feedback submission
├── leaderboard/
│   └── index.html              # Ranked top-mentor podium and departmental contributor lists
├── profile/
│   └── index.html              # User portfolio: stats, teaching tags, learning goals, badges
├── settings/
│   └── index.html              # User profile updater and notification preferences
├── community-groups/
│   └── index.html              # Campus forum directory and subject study group listings
└── admin/
    └── index.html              # Administrative oversight: user table, request metrics, disputes
```

---

## 6. Installation & Setup

### Prerequisites
- A modern web browser (Chrome, Edge, Firefox, Safari) with ES6 support.
- A local HTTP static server (e.g., Python 3, Node.js `serve`/`http-server`, or VS Code Live Server).
- A free [Supabase](https://supabase.com) account.

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/skillswap.git
cd skillswap
```

---

### Step 2: Configure Supabase Database
In your Supabase project dashboard, navigate to the **SQL Editor** and execute the following schema setup script:

```sql
-- 1. Profiles Table (linked to Supabase Auth users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  usn TEXT NOT NULL,
  year TEXT NOT NULL,
  dept TEXT NOT NULL,
  mentor_score NUMERIC DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Skills Table
CREATE TABLE public.skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('offer', 'request')) NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills are viewable by everyone" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Users can insert their own skills" ON public.skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own skills" ON public.skills FOR DELETE USING (auth.uid() = user_id);

-- 3. Exchange Requests Table
CREATE TABLE public.requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  message TEXT,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view requests they are involved in" ON public.requests
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can create requests" ON public.requests
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Recipients can update request status" ON public.requests
  FOR UPDATE USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- 4. Sessions Table
CREATE TABLE public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  datetime TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled' NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Participants can book sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Participants can update sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
```

---

### Step 3: Link Project Credentials
Open `shared/app.js` and verify or replace your Supabase project parameters:

```javascript
// shared/app.js (Lines 46-47)
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

---

### Step 4: Run Locally
Serve the application directory using any static web server:

#### Option A: Python HTTP Server
```bash
# From repository root
python -m http.server 3000
```

#### Option B: Node.js (npx)
```bash
npx serve . -p 3000
```

#### Option C: VS Code Live Server
Right-click on `index.html` (or `skillswap/index.html`) and select **"Open with Live Server"**.

Visit the application at: `http://localhost:3000`

---

## 7. Usage Flow

1. **Account Registration:** Navigate to `/register` and provide your name, college email (`*.edu`), USN, academic year, and department.
2. **List Your Skills:** In `/my-skills`, list skills you can teach under **"I can teach"** and skills you need help with under **"I want to learn"**.
3. **Explore Mentors:** Head to `/search-skills` to find peer mentors filtered by domain categories (Coding, Design, Music, etc.).
4. **Send an Exchange Proposal:** Click **"Request"** on a mentor card and write an introductory note specifying what you would like to cover.
5. **Manage Your Inbox:** Check `/exchange-requests` to review incoming swap proposals and accept or decline.
6. **Book a Session:** From an accepted swap, open `/book-session` to pick a meeting date, time, duration, and platform (e.g. Google Meet with auto-generated links).
7. **Complete & Rate:** Once the session finishes, open `/rate-session` to leave a star rating and qualitative feedback.
8. **Track Reputation:** Review `/leaderboard` to monitor campus ranks and check `/profile` for updated scores and achievement badges.

---

## 8. Screenshots & Demo

### Preconfigured Demo Credentials
To explore SkillSwap without creating a new email account:
- **Email:** `priya.sharma@college.edu`
- **Password:** `demo1234`

### Application Views

| Screen | Core Purpose | Interface Highlights |
| :--- | :--- | :--- |
| **Dashboard** | Overview & Activity | Metric summary cards (Active Requests, Upcoming Sessions, Completed Sessions), personalized mentor recommendations, and recent inbox activity. |
| **Find Skills** | Discovery & Matching | Debounced search bar, category pill filters, mentor rating badges, and contextual modal popups for sending proposals. |
| **Booking Hub** | Scheduling & Calendar Sync | Two-column responsive booking layout, quick-date selector chips, meeting venue selection, auto-link creation, and 1-click Google Calendar integration. |
| **Leaderboard** | Gamification & Reputation | Gold, Silver, and Bronze visual podium highlighting top peer mentors based on historical review scores. |

---

## 9. API & Data Access Documentation

SkillSwap leverages the Supabase Client SDK over HTTPS PostgREST protocols. All calls are mediated through the internal `db` object facade in `shared/app.js`.

### Authentication Endpoints

#### 1. Register Student Account
- **Method:** `db.register({ name, usn, year, dept, email, password })`
- **Underlying PostgREST:** `POST /auth/v1/signup`
- **Payload:**
  ```json
  {
    "email": "priya.sharma@college.edu",
    "password": "Password123!",
    "options": {
      "data": { "name": "Priya Sharma", "usn": "1AB21CS045", "year": "3rd Year", "dept": "Computer Science" }
    }
  }
  ```
- **Response:** `{ ok: true, user: { id, name, usn, year, dept, mentorScore, sessionsCount } }`

#### 2. User Authentication
- **Method:** `db.login({ email, password })`
- **Underlying PostgREST:** `POST /auth/v1/token?grant_type=password`
- **Response:** `{ ok: true, user: { ...profileData } }`

---

### Skills & Search Endpoints

#### 3. Search Skills Catalog
- **Method:** `db.searchSkills({ query, category, type })`
- **Underlying PostgREST:** `GET /rest/v1/skills?type=eq.{type}&category=eq.{category}&name=ilike.*{query}*&select=*,user:profiles(*)`
- **Response Structure:**
  ```json
  [
    {
      "id": "c1f735eb-5989-408a-b891-628d0bfa186d",
      "userId": "b4dfb4c2-6731-482a-a9e9-d9d3fbc95710",
      "name": "Python & Data Science",
      "type": "offer",
      "category": "Coding",
      "user": {
        "name": "Priya Sharma",
        "dept": "Computer Science",
        "year": "3rd Year",
        "mentorScore": 4.9,
        "sessionsCount": 14
      }
    }
  ]
  ```

---

### Exchange & Session Endpoints

#### 4. Submit Exchange Proposal
- **Method:** `db.sendRequest({ fromUserId, toUserId, skillName, message })`
- **Underlying PostgREST:** `POST /rest/v1/requests`
- **Payload:**
  ```json
  {
    "from_user_id": "UUID",
    "to_user_id": "UUID",
    "skill_name": "Figma Design Systems",
    "message": "Hey! Looking to learn Figma auto-layouts in exchange for Python tutoring."
  }
  ```
- **Response:** `{ ok: true, request: { id, status: "pending", ... } }`

#### 5. Book Session Schedule
- **Method:** `db.bookSession({ requestId, fromUserId, toUserId, skillName, datetime, platform })`
- **Underlying PostgREST:** `POST /rest/v1/sessions` (or `PATCH` if rescheduling an existing active slot)
- **Response:** `{ ok: true, session: { id, datetime, platform, status: "scheduled" } }`

#### 6. Submit Peer Rating & Recalculate Score
- **Method:** `db.rateSession(sessionId, { rating, feedback })`
- **Execution Workflow:**
  1. Updates session status to `completed` and attaches numeric score (`1-5`) and written critique.
  2. Issues aggregated SQL query over all completed sessions where target mentor was instructor (`to_user_id`).
  3. Computes updated arithmetic mean score and increments total completed session counter on mentor's profile.
- **Response:** `{ ok: true }`

---

## 10. Engineering Decisions

### 1. Data Access Object (DAO) / Facade Pattern
- **Decision:** Instead of calling the Supabase SDK or `fetch()` directly in page scripts, all interactions flow through the singleton `db` object in `shared/app.js`.
- **Trade-off:** Adds an abstraction layer and slight indirection, but isolates database logic. Shifting from local mock storage to live Supabase PostgreSQL required zero modifications across page controllers.

### 2. Multi-Page Architecture (MPA) vs. Single-Page Application (SPA)
- **Decision:** Implemented as clean semantic MPAs utilizing native browser navigation rather than bundling a large React or Vue runtime.
- **Trade-off:** Page transitions perform standard browser document loads rather than client-side DOM swaps. However, it eliminates bundle compilation steps, avoids heavy framework dependency trees, ensures instant cold-boot performance on campus mobile networks, and guarantees isolated memory lifecycles between views.

### 3. Dynamic Script Loading for Third-Party SDKs
- **Decision:** Supabase JS v2 is loaded dynamically on-demand through `initSupabase()` via CDN only when a database or auth interaction occurs.
- **Trade-off:** Requires network connectivity on initial call, but guarantees zero blocking script overhead during initial document paint.

### 4. Client-Driven Average Score Aggregation vs. Serverless Webhooks
- **Decision:** Rating aggregations calculate the running average directly in `db.rateSession` and update the user profile within the same transaction lifecycle.
- **Trade-off:** In a high-concurrency enterprise application, asynchronous queue workers or PostgreSQL database triggers would be preferred. For this campus ecosystem, client-side transaction calculations minimize database trigger complexity while providing instant visual confirmation in the UI.

---

## 11. Testing

### Test Coverage Matrix

| Area Tested | Test Scenarios | Verification Method |
| :--- | :--- | :--- |
| **Authentication Form Integrity** | Email format validation (rejecting non-`.edu` strings), password minimum length enforcement (8+ chars), missing required fields. | Form validation boundary tests across `/register` and `/login`. |
| **Relative Path Resolution** | Verifies root `/index.html` resolves to subfolders while subpages (`/search-skills/index.html`) correctly prefix resources with `../`. | Tested across local filesystem (`file://`) and HTTP servers (`http://localhost`). |
| **Exchange State Transitions** | Pending $\rightarrow$ Accepted $\rightarrow$ Booked $\rightarrow$ Completed $\rightarrow$ Rated. Verifies buttons change states reactively. | End-to-end integration flow using paired test student accounts. |
| **Session Booking Conflicts** | Booking an existing request re-enters update mode ("Reschedule") rather than generating duplicate conflicting records. | Tested against duplicate submission attempts on `/book-session`. |
| **Responsive Viewports** | Hamburger navigation toggles, two-column grid collapses on narrow screens, and touch target accessibility ($>44\text{px}$). | Tested in Chrome DevTools Device Emulation (375px, 768px, 1200px viewports). |

### Running Local Validation
You can run a local test server and check console logs to verify database connectivity:
```bash
# Start server
npx serve . -p 3000

# Open browser and test API health in DevTools Console
# > await db.getLeaderboard();
# Output: Array of profiles sorted by mentorScore descending.
```

---

## 12. Limitations & Future Improvements

### Current Limitations
- **Synchronous Rating Calculation:** If multiple peer ratings were submitted in the exact same second for the same mentor, race conditions could arise without PostgreSQL serializable locks.
- **Polling vs. Push WebSockets:** Request updates currently rely on page reloads or active user navigation rather than persistent Supabase Realtime push notifications.
- **Static Community Boards:** The community groups page currently provides a curated campus forum directory rather than live threaded message channels.

### Future Roadmap
- [ ] **Supabase Realtime WebSockets:** Implement live notification badges and real-time swap invitation toasts.
- [ ] **WebRTC Video Rooms:** Embed peer-to-peer audio/video calling directly inside the application, removing third-party meeting dependencies.
- [ ] **iCalendar (.ics) File Export:** Downloadable standard calendar invite files for users who do not use Google Calendar.
- [ ] **Automated Dispute Resolution:** Automated mediation escalation when scheduled meetings are missed or unfulfilled.
- [ ] **Progressive Web App (PWA):** Service worker offline caching and installation directly to mobile home screens.

---

## License

This project is licensed under the [MIT License](LICENSE).

#   S t u d e n t - S k i l l - E x c h a n g e - P l a t f o r m  
 