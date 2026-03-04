# GeoAttend 100% Free Deployment Guide

This guide details exactly how to deploy the entire Geo-Integrated Attendance System using industry-standard free tiers perfectly suited for college project submissions or low-traffic public demos.

There are exactly zero paid dependencies or external costs. 

---

## 🏗️ Architecture Overview

- **Database**: MongoDB Atlas (Free Shared Cluster)
- **Backend**: Render.com (Free Web Service - Node.js)
- **Frontend**: Vercel.com (Free Hobby Tier - React/Vite)

---

## Step 1: Set Up MongoDB Atlas (Database)
We use a completely free cloud database for all data persistence.

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Click **Build a Database** and select the **FREE Shared Cluster**. (Keep all default geographic options).
3. Under **Security Quickstart**:
   - Create a database user with a **Username** and **Password** (Save these, you will need them later).
   - For IP Access List, click "Add My Current IP Address", and *also* click **Add IP Address** and enter `0.0.0.0/0` (This allows Render to connect to your database freely).
4. Go to **Database Deployments**, click **Connect**, select **Drivers**, select Node.js, and copy your connection string.
   - It will look like this: `mongodb+srv://<username>:<password>@cluster0...`

---

## Step 2: Push Your Code to GitHub
Both Vercel and Render deploy automatically straight from a GitHub repository for free.

1. Open your terminal in the root `SE PROJECT` folder.
2. If you haven't initialized git, run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for GeoAttend deployment"
   ```
3. Create a new public OR private repository on [GitHub](https://github.com/new).
4. Push your local repository to GitHub following the instructions provided there.

---

## Step 3: Deploy Backend to Render (Free Tier)
Render will host your Express.js server 24/7. *Note: Free tier instances spin down after inactivity, so the first API call after a break might take 30-50 seconds to boot up.*

1. Create a free account on [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select your `geo-attend` repository.
4. **Configuration Settings**:
   - **Name**: `geoattend-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Select `Free`
5. **Environment Variables**:
   Under "Advanced", click "Add Environment Variable" and add:
   - `MONGODB_URI` = Your connection string from Step 1 (Replace `<password>`!).
   - `JWT_SECRET` = A random 32 character string (e.g. `g*K#9n!qT^2Lp$8sV@5cW&4tY(7zM_1x`).
   - `CLIENT_URL` = (Leave blank for now, we will come back and fill this out after deploying the frontend so CORS works perfectly).
6. Click **Create Web Service**. 
7. Save the URL Render gives you (e.g., `https://geoattend-backend.onrender.com`).

---

## Step 4: Deploy Frontend to Vercel (Free Tier)
Vercel handles Vite/React sites expertly and provides a free, blazingly fast global CDN.

1. Create a free account on [Vercel](https://vercel.com/) (using your GitHub to sign in).
2. Click **Add New** -> **Project**.
3. Import your `geo-attend` GitHub repository.
4. **Configuration Settings**:
   - Vercel automatically detects Vite. Leave the Build and Output settings as default.
   - **Root Directory**: Click "Edit" and select `client`.
5. **Environment Variables**:
   Expand the Environment Variables section and add:
   - `VITE_API_URL` = The Render URL you got in Step 3, *plus* `/api` (e.g., `https://geoattend-backend.onrender.com/api`).
6. Click **Deploy**.
7. Wait ~1 minute. Vercel will give you a live URL (e.g., `https://geoattend-app.vercel.app`).

---

## Step 5: Final Configuration (Important!)
Now that your frontend is live, we need to tell your backend to trust it.

1. Head back to your **Render Web Service** dashboard.
2. Go to **Environment** variables.
3. Edit the `CLIENT_URL` variable to equal the Vercel URL you just got in step 4 (Do NOT include a trailing slash. E.g., `https://geoattend-app.vercel.app`).
4. Save the changes. Render will automatically redeploy the backend with the new CORS configuration.

---

### 🎉 Deployment Complete
Your project is now 100% online, entirely free, and secure.

- **Frontend is live at**: `https://<your-vercel-project>.vercel.app`
- **Backend is live at**: `https://<your-render-project>.onrender.com`

**Testing the live site**:
1. Open your Vercel URL.
2. The initial login query might take up to 45 seconds if Render has "gone to sleep".
3. Once awake, the whole app (including real-time geolocation and Mongoose queries) will function normally!
