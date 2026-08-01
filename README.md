# NKRIW.MA

A modern web platform for house rentals, shared accommodation (co-location), and carpooling in Morocco. Built with FastAPI (backend) and React.js (frontend).

## Features

- **Housing Module**: Post and search rental advertisements (apartments, houses, studios, villas, etc.)
- **Co-location Module**: Find roommates and shared accommodation
- **Carpool Module**: Share transportation between Moroccan cities
- **Community Forum**: Discussion threads with categories and replies
- **Private Messaging**: One-to-one conversations with block/unblock
- **Comments System**: Nested comments on ads and forum threads with likes
- **Notifications**: Real-time notification system for various events
- **Report System**: Report users, ads, comments, and messages
- **Admin Dashboard**: Statistics, charts, user management, and content moderation
- **Multilingual**: Arabic (RTL), French, and English with persistent language selection
- **Responsive Design**: Works on desktop, tablet, and mobile
- **JWT Authentication**: Secure login, registration, password reset
- **Auto Admin Creation**: Default admin account created on first run

## Technology Stack

### Backend
- **FastAPI** - Python web framework
- **SQLAlchemy ORM** - Database ORM
- **Alembic** - Database migrations
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Pydantic** - Data validation
- **Passlib** - Password hashing (bcrypt)

### Frontend
- **React.js** - UI library
- **React Router** - Routing
- **Axios** - HTTP client
- **i18next** - Internationalization (AR/FR/EN)
- **React Icons** - Icon library
- **Recharts** - Charts for admin dashboard
- **Vite** - Build tool

## Project Structure

```
nkriw_ma/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, security, dependencies
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── routers/        # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Utilities (pagination)
│   │   ├── database.py     # Database setup
│   │   └── main.py         # FastAPI app entry point
│   ├── alembic/            # Migration scripts
│   ├── requirements.txt
│   ├── .env.example
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── layouts/        # Layout components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── styles/         # Global styles
│   │   ├── i18n/           # Translations
│   │   ├── App.jsx         # Main app with routes
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and secret key
   ```

5. **Create the PostgreSQL database:**
   ```sql
   CREATE DATABASE nkriwma;
   CREATE USER nkriwma WITH PASSWORD 'nkriwma_password';
   GRANT ALL PRIVILEGES ON DATABASE nkriwma TO nkriwma;
   ```

6. **Run the server:**
   ```bash
   python run.py
   # Or: uvicorn app.main:app --reload
   ```

   The backend will be available at `http://localhost:8000`
   API documentation at `http://localhost:8000/docs`

   **Default admin account is automatically created:**
   - Email: `admin@nkriw.ma`
   - Password: `admin123`

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

4. **Build for production:**
   ```bash
   npm run build
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users/profile` - Get own profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/profile/picture` - Upload profile picture
- `GET /api/users/{username}` - Get public profile

### Housing
- `GET /api/housing` - List housing ads (with filters)
- `GET /api/housing/{id}` - Get housing ad
- `POST /api/housing` - Create housing ad
- `PUT /api/housing/{id}` - Update housing ad
- `DELETE /api/housing/{id}` - Delete housing ad
- `POST /api/housing/{id}/mark-rented` - Mark as rented
- `POST /api/housing/{id}/renew` - Renew ad
- `POST /api/housing/{id}/images` - Upload images

### Co-location
- `GET /api/colocation` - List co-location ads
- `POST /api/colocation` - Create co-location ad
- `PUT /api/colocation/{id}` - Update
- `DELETE /api/colocation/{id}` - Delete
- `POST /api/colocation/{id}/mark-found` - Mark as found

### Carpool
- `GET /api/carpool` - List carpool ads
- `POST /api/carpool` - Create carpool ad
- `PUT /api/carpool/{id}` - Update
- `DELETE /api/carpool/{id}` - Delete
- `POST /api/carpool/{id}/mark-completed` - Mark as completed

### Forum
- `GET /api/forum/threads` - List threads
- `POST /api/forum/threads` - Create thread
- `GET /api/forum/threads/{id}` - Get thread
- `POST /api/forum/threads/{id}/replies` - Create reply
- `POST /api/forum/replies/{id}/like` - Like/unlike reply

### Messaging
- `GET /api/messaging/conversations` - List conversations
- `POST /api/messaging/conversations` - Start conversation
- `GET /api/messaging/conversations/{id}/messages` - Get messages
- `POST /api/messaging/conversations/{id}/messages` - Send message
- `POST /api/messaging/conversations/{id}/block` - Block user

### Comments
- `GET /api/comments/{type}/{id}` - List comments
- `POST /api/comments/{type}/{id}` - Create comment
- `PUT /api/comments/{id}` - Update comment
- `DELETE /api/comments/{id}` - Delete comment
- `POST /api/comments/{id}/like` - Like/unlike

### Notifications
- `GET /api/notifications` - List notifications
- `GET /api/notifications/unread-count` - Unread count
- `POST /api/notifications/{id}/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read

### Reports
- `POST /api/reports` - Create report
- `GET /api/reports` - List reports (admin)
- `POST /api/reports/{id}/action` - Take action (admin)

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/stats/registrations` - Registration chart data
- `GET /api/admin/stats/ads-per-city` - Ads per city chart
- `GET /api/admin/users` - List users
- `POST /api/admin/users/{id}/ban` - Ban user
- `POST /api/admin/users/{id}/suspend` - Suspend user
- `DELETE /api/admin/users/{id}` - Delete user

## Color Scheme

- **Primary**: Green `#16A34A`
- **Secondary**: White
- **Accent**: Orange `#F97316`
- **Neutral**: Gray palette

## Security Features

- JWT authentication
- Password hashing with bcrypt
- CORS protection
- Input validation with Pydantic
- SQL injection protection (SQLAlchemy ORM)
- Secure file upload validation
- Role-based access control (User/Admin)

## License

This project is proprietary. © NKRIW.MA