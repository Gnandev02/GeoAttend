# GeoAttend: Real-Time GPS Attendance System

GeoAttend is a modern, mathematically secure, and highly scalable attendance management system. Built on the MERN stack, it eliminates proxy attendance through real-time GPS validation and Haversine geofence calculations.

## 🌟 Core Features

- **Multi-College Data Isolation**: Every college administration has its own isolated records, geofence, and analytics.
- **Admin Signup & College Registration**: Secure admin onboarding and college identifier generation.
- **Admin-Controlled Student Account Creation**: Students cannot sign up; only admins register them, preventing unauthorized access.
- **Role-Based Access Control**: Strict segregation between Admin and Student scopes.
- **Strict Geofence Validation**: Define dynamic campus boundaries (Latitude, Longitude, Radius). Students must be physically present within this radius to verify attendance.
- **Anti-Proxy Security**: By utilizing direct browser-level HTML5 Geolocation APIs, proxy attendance from remote locations becomes physically impossible.
- **Secure Authentication**: End-to-end encrypted login utilizing JWT (JSON Web Tokens) and bcrypt password hashing.
- **Multi-Campus Administration**: Manage distinct campus zones and monitor unified statistics through an integrated administrator dashboard.
- **Microsecond Precision Analytics**: Administrators can view real-time logs, aggregate accuracy graphs, and export comprehensive CSV histories.

## Multi-College Administration System

The system securely supports multiple discrete colleges. Each admin exclusively represents a single college with fully isolated data, including:
- Students
- Attendance records
- Geofence settings
- Analytics

Every database record utilizes a unique `collegeCode` to strictly enforce data isolation between colleges.

## Admin Signup System

Admins can self-register their college using the following credentials: Name, Email, Password, College Name, and a Unique College Code. Passwords are encrypted using bcrypt, and admin sessions are secured via JWT authentication.

## Student Account Management

Students do NOT create accounts themselves to prevent unauthorized entities from joining a college's registry.
Instead:
- The Admin manually registers students exclusively from the secure admin dashboard.
- The Admin subsequently provides students with their login credentials (e.g., Email and Password).
- Students login directly, bypassing any independent signup flow.

## Student Login System

Students securely authenticate using the credentials provided by their college admin. Upon successful authentication, the backend returns a JWT token linking the student to their designated `collegeCode`. Students are then granted limited access strictly exclusively to their own attendance data.

## System Workflow

1. Admin signs up and securely registers their college.
2. Admin logs in and individually creates student accounts linked to their college.
3. Students securely login using credentials provisioned by the admin.
4. Students authorize browser GPS access for precision location.
5. The backend validates coordinates exclusively using the Haversine distance formula.
6. Attendance is marked as present only if the student is geometrically verified within the campus geofence.
7. Validated attendance data is recorded and instantly visible in the admin analytics dashboard.

## API Architecture

### Auth Routes
- `POST /api/admin/signup`: Register new admin and college
- `POST /api/admin/login`: Admin authentication
- `POST /api/student/login`: Student authentication

### Attendance Routes
- `POST /api/attendance/mark`: Post location and request validation
- `GET /api/attendance/student/:id`: Retrieve individual student logs

### Admin Routes
- `POST /api/admin/create-student`: Authorize new student creation
- `GET /api/admin/analytics`: Aggregate college-wide attendance stats
- `GET /api/admin/students`: Fetch registered college students

## 🛠️ Technology Stack

**Frontend**
- HTML5 / CSS3
- Tailwind CSS (Utility-first styling, strict customized configuration)
- DOM Fetch API implementation

**Backend**
- Node.js & Express.js (REST API Architecture)
- MongoDB & Mongoose (NoSQL Database structure)
- JWT (Authentication)

## 📁 Repository Structure

```
GeoAttend/
├── frontend/          # Static HTML portal, routing wrappers & Tailwind configurations
└── backend/           # Node.js Express Server, Models, Controllers, Geo Helpers
```

## 🚀 Installation & Setup

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) (v18+) and [MongoDB](https://mongodb.com) installed globally on your machine.
For Live Server usage, we recommend installing the "Live Server" extension in VS Code.

### 1. Database Configuration
Rename the existing environment template file inside `backend/`:
```bash
cd backend
cp .env.example .env
```
Ensure that you set:
- `MONGODB_URI` to your local or cloud Atlas connection string.
- `JWT_SECRET` to a cryptographically secure random string.

### 2. Run the Backend API
Install dependencies and spin up the Express server:
```bash
cd backend
npm install
npm run dev
```
The API server will boot up and bind to Port 5000.

### 3. Run the Frontend Application
Navigate back to the workspace root and run Live Server on the `frontend` directory. Alternatively use `npx`:
```bash
npx serve frontend -p 5500
```
Then visit: `http://127.0.0.1:5500`

> Note on CORS Policy: The backend server is strictly configured to only accept incoming DOM requests from `http://127.0.0.1:5500`. Ensure your local server matches this exact origin string.

## 🤝 GitHub Collaboration Workflow (For Team Members)

We utilize structured branch flows to avoid conflict overheads on logical boundaries:

1. **Clone the repository:**
   ```bash
   git clone <your-github-repo-url>
   ```

2. **Create your feature branch:**
   ```bash
   git checkout -b feature-<your-feature-name>
   ```
   *Examples:* `feature-auth`, `feature-attendance`, `feature-admin-dashboard`

3. **Develop & Commit iteratively:**
   ```bash
   git add .
   git commit -m "feat(<module>): Short description of changes"
   ```

4. **Push & Create Pull Request:**
   ```bash
   git push -u origin HEAD
   ```
   Open a Pull Request on GitHub aiming at the `dev` or `main` branch. Peer review is mandatory prior to a merge.

