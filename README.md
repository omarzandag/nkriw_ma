# NKRIW.MA 🏡🚗

> **A modern Moroccan community platform for house rentals, shared accommodation (co-location), and carpooling.**

Built with **FastAPI** on the backend and **React.js + Vite** on the frontend, NKRIW.MA connects Moroccan residents for housing, roommate-finding, and intercity travel — all in one multilingual app (Arabic · French · English).

---

## ✨ Features

### 🏠 Housing Module
- Post and browse rental ads (apartments, houses, studios, villas, etc.)
- Rich filtering: city, type, price range, furnished status
- Image upload (multi-photo support, up to 5 MB each)
- Mark ad as **Rented** and renew expired listings

### 🤝 Co-location Module
- Find and post roommate / shared-accommodation ads
- Filter by city and gender preference
- Mark ad as **Found** when a match is secured

### 🚗 Carpool Module
- Post intercity carpool trips with departure date, time, price, and available seats
- Advanced search: departure/destination city, date, price range, number of seats
- **Full booking workflow:**
  - Passengers can request seats on a trip
  - Drivers can **Accept** or **Reject** booking requests
  - Passengers can **Cancel** their bookings at any time
  - Accepting a booking automatically sends a congratulatory DM to the passenger
  - Seat count is automatically adjusted on accept/cancel
- Mark trip as **Completed**

### 💬 Community Forum
- Create discussion threads with categories
- Nested replies (threaded conversations)
- Like / unlike replies

### 📬 Private Messaging
- One-to-one real-time-style conversation threads
- Block / unblock users
- Unread message indicators

### 🗣️ Comments System
- Nested comments on housing, co-location, and carpool ads
- Comments on forum threads
- Like / unlike comments
- Edit and delete your own comments

### 🔔 Notifications
- In-app notification center
- Events: new booking request, booking accepted/rejected/cancelled, new messages, reports, etc.
- Mark individual or all notifications as read
- Unread count badge

### 🚨 Report System
- Report users, ads, comments, and messages
- Admin review panel with action capabilities

### 🔐 Password Reset (OTP via Email)
- Users reset their password from the login page ("Forgot password?")
- 3-step flow: enter email → receive a 6-digit OTP by email → set a new password
- OTP expires after 10 minutes, max 5 wrong attempts, 60-second resend cooldown
- SMTP credentials are **configured by the admin from the dashboard** (Admin → Email Settings)
- A built-in test email verifies the SMTP configuration before going live

### 🛡️ Admin Dashboard
- Platform-wide statistics and charts (Recharts)
- Registration trends over time
- Ads per city breakdown
- User management: ban, suspend, delete
- Content moderation: review and action on reports
- **Email / SMTP settings** (admin-configurable)

### 🌍 Multilingual (i18n)
- Arabic (RTL layout)
- French
- English
- Persistent language selection via `localStorage`

### 📱 Responsive Design
- Fully responsive across desktop, tablet, and mobile
- Custom Navbar with mobile hamburger menu

---

## 🛠 Technology Stack

### Backend
| Library | Version | Purpose |
|---|---|---|
| **FastAPI** | ≥ 0.115 | Python web framework |
| **Uvicorn** | ≥ 0.32 | ASGI server |
| **SQLAlchemy** | ≥ 2.0 | ORM |
| **Alembic** | ≥ 1.14 | Database migrations |
| **PostgreSQL** | 14 + | Relational database |
| **Pydantic** | ≥ 2.10 | Data validation & serialization |
| **pydantic-settings** | ≥ 2.6 | Settings management |
| **python-jose** | ≥ 3.3 | JWT authentication |
| **bcrypt** | ≥ 4.0 | Password hashing |
| **python-multipart** | ≥ 0.0.12 | File upload handling |
| **aiofiles** | ≥ 24.1 | Async file I/O |
| **slowapi** | ≥ 0.1.9 | Rate limiting |
| **email-validator** | ≥ 2.2 | Email format validation |
| **python-dotenv** | ≥ 1.0 | `.env` file support |

### Frontend
| Library | Version | Purpose |
|---|---|---|
| **React** | ^18.2 | UI library |
| **React Router DOM** | ^6.21 | Client-side routing |
| **Axios** | ^1.6 | HTTP client |
| **i18next** | ^23.7 | Internationalization |
| **react-i18next** | ^13.5 | React bindings for i18next |
| **i18next-browser-languagedetector** | ^7.2 | Auto-detect browser language |
| **react-icons** | ^4.12 | Icon library |
| **react-datepicker** | ^4.24 | Date picker component |
| **react-hot-toast** | ^2.4 | Toast notifications |
| **Recharts** | ^2.10 | Charts for admin dashboard |
| **Vite** | ^5.0 | Build tool & dev server |

---

## 📁 Project Structure

```
nkriw_ma/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py        # App settings (pydantic-settings)
│   │   │   ├── deps.py          # FastAPI dependencies (get_current_user)
│   │   │   └── security.py      # Password hashing & JWT helpers
│   │   ├── models/
│   │   │   ├── user.py          # User model
│   │   │   ├── housing.py       # Housing ad model
│   │   │   ├── colocation.py    # Co-location ad model
│   │   │   ├── carpool.py       # Carpool ad + CarpoolBooking models
│   │   │   ├── forum.py         # Thread & reply models
│   │   │   ├── messaging.py     # Conversation & message models
│   │   │   ├── comment.py       # Comment model
│   │   │   ├── notification.py  # Notification model
│   │   │   └── report.py        # Report model
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── auth.py          # Registration, login, password reset
│   │   │   ├── users.py         # Profile management
│   │   │   ├── housing.py       # Housing CRUD + images
│   │   │   ├── colocation.py    # Co-location CRUD
│   │   │   ├── carpool.py       # Carpool CRUD + booking workflow
│   │   │   ├── forum.py         # Threads & nested replies
│   │   │   ├── messaging.py     # Conversations & messages
│   │   │   ├── comments.py      # Comments & likes
│   │   │   ├── notifications.py # Notification management
│   │   │   ├── reports.py       # Report creation & admin actions
│   │   │   └── admin.py         # Admin stats & user management
│   │   ├── services/
│   │   │   └── notification_service.py  # Centralized notification creation
│   │   ├── utils/
│   │   │   └── pagination.py    # Reusable pagination helper
│   │   ├── database.py          # SQLAlchemy engine & session setup
│   │   └── main.py              # FastAPI app entry point & lifespan
│   ├── alembic/                 # Alembic migration scripts
│   ├── uploads/                 # Uploaded files (images)
│   ├── requirements.txt
│   ├── .env.example
│   ├── alembic.ini
│   └── run.py                   # Convenience script to start Uvicorn
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Top navigation with language switcher
│   │   │   ├── Footer.jsx
│   │   │   ├── Comments.jsx     # Reusable nested comments component
│   │   │   ├── Pagination.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx  # Global auth state (JWT + user info)
│   │   ├── layouts/             # Page layout wrappers
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── auth/            # Login, Register, Password Reset
│   │   │   ├── housing/         # List, Detail, Create pages
│   │   │   ├── colocation/      # List, Detail, Create pages
│   │   │   ├── carpool/
│   │   │   │   ├── CarpoolListPage.jsx
│   │   │   │   ├── CarpoolDetailPage.jsx  # Booking UI + manage requests
│   │   │   │   └── CarpoolCreatePage.jsx
│   │   │   ├── forum/           # Thread list, detail, create
│   │   │   ├── messaging/       # Conversation list & chat
│   │   │   ├── notifications/   # Notification center
│   │   │   ├── profile/         # User profile & settings
│   │   │   └── admin/           # Admin dashboard & moderation panels
│   │   ├── services/
│   │   │   └── api.js           # Axios instance + all API call functions
│   │   ├── i18n/
│   │   │   ├── index.js         # i18next configuration
│   │   │   └── locales/
│   │   │       ├── ar.json      # Arabic translations
│   │   │       ├── fr.json      # French translations
│   │   │       └── en.json      # English translations
│   │   ├── styles/              # Global CSS files
│   │   ├── App.jsx              # Root component with React Router routes
│   │   └── main.jsx             # React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml           # PostgreSQL DB container
└── README.md
```

---

## ⚙️ Setup Instructions

### Prerequisites
| Tool | Minimum Version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| PostgreSQL | 14+ |

---

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nkriw_ma
```

---

### 2. Start the Database (Docker — Recommended)

The fastest way to get a PostgreSQL instance running:

```bash
docker-compose up -d
```

This starts a PostgreSQL 15 container pre-configured with:
- **Database:** `nkriwma`
- **User:** `nkriwma`
- **Password:** `nkriwma_password`
- **Port:** `5432`

> Alternatively, create the database manually — see the next section.

#### Manual PostgreSQL Setup

```sql
CREATE DATABASE nkriwma;
CREATE USER nkriwma WITH PASSWORD 'nkriwma_password';
GRANT ALL PRIVILEGES ON DATABASE nkriwma TO nkriwma;
```

---

### 3. Backend Setup

```bash
cd backend
```

**Create and activate a virtual environment:**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` as needed (see [Environment Variables](#environment-variables) below).

**Start the backend server:**
```bash
python run.py
# or
uvicorn app.main:app --reload
```

The backend will be available at:
- **API:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **Health Check:** `http://localhost:8000/health`

> **Default admin account is created automatically on first startup:**
> - Email: `admin@nkriw.ma`
> - Password: `admin123`
> 
> ⚠️ Change the admin password immediately in production.

---

### 4. Frontend Setup

```bash
cd frontend
```

**Install dependencies:**
```bash
npm install
```

**Configure environment (optional):**
```bash
cp .env.example .env
# Edit VITE_API_URL if your backend is not at http://localhost:8000
```

**Start the development server:**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

**Build for production:**
```bash
npm run build
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://nkriwma:nkriwma_password@localhost:5432/nkriwma` | PostgreSQL connection string |
| `SECRET_KEY` | *(must be changed)* | JWT signing secret — use a long random string |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | Token lifetime |
| `ADMIN_EMAIL` | `admin@nkriw.ma` | Default admin email |
| `ADMIN_PASSWORD` | `admin123` | Default admin password |
| `UPLOAD_DIR` | `uploads` | Directory for uploaded files |
| `MAX_FILE_SIZE_MB` | `5` | Max file upload size in MB |
| `BACKEND_CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins |
| `APP_NAME` | `NKRIW.MA` | App name shown in API docs |
| `APP_VERSION` | `1.0.0` | App version |
| `DEBUG` | `True` | Debug mode (set `False` in production) |
| `SMTP_ENABLED` | `False` | Enable email sending (override from Admin → Email Settings) |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server host |
| `SMTP_PORT` | `587` | SMTP port (587 STARTTLS / 465 SSL) |
| `SMTP_USER` | *(empty)* | SMTP username |
| `SMTP_FROM_EMAIL` | *(empty)* | Sender email address |
| `SMTP_FROM_NAME` | `NKRIW.MA` | Sender display name |
| `SMTP_USE_TLS` | `True` | Use STARTTLS (port 587) |
| `SMTP_USE_SSL` | `False` | Use implicit SSL (port 465) |
| `RESET_OTP_TTL_MINUTES` | `10` | Password reset OTP lifetime |
| `RESET_OTP_MAX_ATTEMPTS` | `5` | Max wrong OTP attempts before lockout |

> 💡 **SMTP is configured from the Admin Dashboard** (Admin → Email Settings), not only via `.env`.
> The dashboard values override the `.env` bootstrap defaults. The SMTP password is stored in the
> database and never returned by the API.

---

## 🌐 API Reference

> Full interactive documentation available at `http://localhost:8000/docs`

### Authentication — `/api/auth`
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login (returns JWT) |
| `GET` | `/me` | Get current authenticated user |
| `POST` | `/logout` | Logout |
| `POST` | `/forgot-password` | Request a password reset OTP (emailed) |
| `POST` | `/verify-otp` | Verify a password reset OTP |
| `POST` | `/reset-password` | Reset password using email + OTP |
| `POST` | `/change-password` | Change password (authenticated) |

### Users — `/api/users`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get own profile |
| `PUT` | `/profile` | Update own profile |
| `POST` | `/profile/picture` | Upload profile picture |
| `GET` | `/{username}` | Get public profile of any user |

### Housing — `/api/housing`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `` | List housing ads (paginated, filterable) |
| `POST` | `` | Create a housing ad |
| `GET` | `/{id}` | Get a single housing ad |
| `PUT` | `/{id}` | Update a housing ad (owner/admin) |
| `DELETE` | `/{id}` | Delete a housing ad (owner/admin) |
| `POST` | `/{id}/mark-rented` | Mark ad as rented |
| `POST` | `/{id}/renew` | Renew ad listing |
| `POST` | `/{id}/images` | Upload photos to ad |

### Co-location — `/api/colocation`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `` | List co-location ads |
| `POST` | `` | Create a co-location ad |
| `GET` | `/{id}` | Get a single co-location ad |
| `PUT` | `/{id}` | Update (owner/admin) |
| `DELETE` | `/{id}` | Delete (owner/admin) |
| `POST` | `/{id}/mark-found` | Mark ad as found |

### Carpool — `/api/carpool`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `` | List carpool ads (paginated, filterable) |
| `POST` | `` | Create a carpool ad |
| `GET` | `/my/ads` | Get the current user's ads |
| `GET` | `/{id}` | Get a single carpool ad |
| `PUT` | `/{id}` | Update (owner/admin) |
| `DELETE` | `/{id}` | Delete (owner/admin) |
| `POST` | `/{id}/mark-completed` | Mark trip as completed |
| `POST` | `/{id}/bookings` | Request seats (passenger) |
| `GET` | `/{id}/bookings` | List bookings for a trip (driver/admin) |
| `POST` | `/bookings/{id}/accept` | Accept a booking request (driver) |
| `POST` | `/bookings/{id}/reject` | Reject a booking request (driver) |
| `POST` | `/bookings/{id}/cancel` | Cancel a booking (passenger) |
| `GET` | `/bookings/my/reservations` | Get current user's bookings as passenger |
| `GET` | `/bookings/my/requests` | Get incoming booking requests (as driver) |

### Forum — `/api/forum`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/threads` | List forum threads |
| `POST` | `/threads` | Create a thread |
| `GET` | `/threads/{id}` | Get a thread with replies |
| `POST` | `/threads/{id}/replies` | Post a reply |
| `POST` | `/replies/{id}/like` | Like / unlike a reply |

### Messaging — `/api/messaging`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/conversations` | List conversations |
| `POST` | `/conversations` | Start a new conversation |
| `GET` | `/conversations/{id}/messages` | Get messages in a conversation |
| `POST` | `/conversations/{id}/messages` | Send a message |
| `POST` | `/conversations/{id}/block` | Block / unblock a user |

### Comments — `/api/comments`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/{type}/{id}` | List comments for `housing`, `colocation`, or `carpool` ad |
| `POST` | `/{type}/{id}` | Create a comment |
| `PUT` | `/{id}` | Edit a comment (owner) |
| `DELETE` | `/{id}` | Delete a comment (owner/admin) |
| `POST` | `/{id}/like` | Like / unlike a comment |

### Notifications — `/api/notifications`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `` | List notifications |
| `GET` | `/unread-count` | Get unread notification count |
| `POST` | `/{id}/read` | Mark a notification as read |
| `POST` | `/read-all` | Mark all notifications as read |

### Reports — `/api/reports`
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `` | Submit a report |
| `GET` | `` | List reports (admin only) |
| `POST` | `/{id}/action` | Take action on a report (admin only) |

### Admin — `/api/admin`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/stats` | Overall platform statistics |
| `GET` | `/stats/registrations` | User registration chart data |
| `GET` | `/stats/ads-per-city` | Ads per city chart data |
| `GET` | `/users` | List all users |
| `POST` | `/users/{id}/ban` | Ban a user |
| `POST` | `/users/{id}/suspend` | Suspend a user |
| `DELETE` | `/users/{id}` | Permanently delete a user |
| `GET` | `/settings/smtp` | Get SMTP configuration (password masked) |
| `PUT` | `/settings/smtp` | Update SMTP configuration |
| `POST` | `/settings/smtp/test` | Send a test email to verify SMTP |

---

## 🔒 Security

| Feature | Implementation |
|---|---|
| Authentication | JWT (HS256, 7-day expiry) |
| Password storage | bcrypt hashing |
| CORS | Configurable allowed origins |
| Input validation | Pydantic v2 schemas |
| SQL injection prevention | SQLAlchemy ORM |
| File upload validation | Size limits, MIME-type filtering |
| Rate limiting | slowapi |
| Role-based access | `is_admin` flag on User model |
| Auto logout on 401 | Frontend Axios interceptor |
| Admin-only routes | Module-level route guards on frontend |

> 🔑 **Production checklist:**
> - Set a strong, unique `SECRET_KEY`
> - Change the default admin password
> - Set `DEBUG=False`
> - Restrict `BACKEND_CORS_ORIGINS` to your actual domain

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary color | `#16A34A` (green) |
| Accent color | `#F97316` (orange) |
| Background | White / light gray |
| Text | Gray palette |
| RTL support | Full (Arabic) |

---

## 🐳 Docker

A full `docker-compose.yml` runs **PostgreSQL + the FastAPI backend + the
React frontend** as three containers — ready to work in any environment with a
single command. Defaults are in-place, so `docker compose up -d` works out of
the box; a `.env.example` documents every override for production.

The frontend is built into a production `nginx:alpine` image that serves the
Vite SPA and reverse-proxies `/api` and `/uploads` to the backend, so the whole
app is **same-origin on one port** (no CORS headaches in production).

```bash
# Build & start the whole stack (first run builds the images)
docker compose up -d --build

# Follow logs
docker compose logs -f

# Stop everything
docker compose down

# Stop and wipe all persistent data (database + uploads)
docker compose down -v
```

### Services
| Service | Image | Port | Notes |
|---|---|---|---|
| `db` | `postgres:15-alpine` | (internal) | Data in the `postgres_data` named volume |
| `backend` | `python:3.12-slim` + uvicorn | exposed to the frontend only | Auto-creates schema + default admin on first start |
| `frontend` | `nginx:1.27-alpine` + built Vite SPA | host `:80` (`FRONTEND_PORT` overrides) | Proxies `/api` & `/uploads` to the backend |

### Default credentials
- Admin account (auto-created on first start): **`admin@nkriw.ma` / `admin123`**
- PostgreSQL (in-compose): **`nkriwma` / `nkriwma_password` / `nkriwma`**

> ⚠️ For production, copy `.env.example` → `.env` and override `SECRET_KEY`,
> `ADMIN_PASSWORD`, the PostgreSQL credentials, and `DATABASE_URL`. If you
> change `POSTGRES_PASSWORD`, update `DATABASE_URL` to match.

### Images
| Dockerfile | Builds |
|---|---|
| `backend/Dockerfile` | Single-stage FastAPI app (`python:3.12-slim`) |
| `frontend/Dockerfile` | Multi-stage: Vite build → `nginx:alpine` runtime |

---

## 📜 License

This project is **proprietary**. All rights reserved. © NKRIW.MA