# GeoAttend: Real-Time GPS Attendance System

GeoAttend is a modern, mathematically secure, and highly scalable attendance management system. Built on the MERN stack, it eliminates proxy attendance through real-time GPS validation and Haversine geofence calculations.

## 🌟 Core Features

- **Strict Geofence Validation**: Define dynamic campus boundaries (Latitude, Longitude, Radius). Students must be physically present within this radius to verify attendance.
- **Anti-Proxy Security**: By utilizing direct browser-level HTML5 Geolocation APIs, proxy attendance from remote locations becomes physically impossible.
- **Secure Authentication**: End-to-end encrypted login utilizing JWT (JSON Web Tokens) and bcrypt password hashing.
- **Multi-Campus Administration**: Manage distinct campus zones and monitor unified statistics through an integrated administrator dashboard.
- **Microsecond Precision Analytics**: Administrators can view real-time logs, aggregate accuracy graphs, and export comprehensive CSV histories.

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

## 👥 Project Team

- **[Member 1 Name]** - [Role / Responsibility]
- **[Member 2 Name]** - [Role / Responsibility]
- **[Member 3 Name]** - [Role / Responsibility]
- **[Member 4 Name]** - [Role / Responsibility]

---

*This project was developed collectively for software engineering assessment.*
