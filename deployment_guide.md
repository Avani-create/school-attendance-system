# Deployment Guide: Railway & Vercel

Follow these step-by-step instructions to deploy the school attendance system to production.

---

## 1. Backend Deployment (Railway)

We deploy the FastAPI backend and PostgreSQL database to Railway.

### Step A: Initialize PostgreSQL
1. Create an account on [Railway.app](https://railway.app/).
2. Click **New Project** and select **Provision PostgreSQL**.
3. Railway will provision a database instance. Locate the database details in the connection tab.

### Step B: Deploy FastAPI
1. Click **New Service** -> **Github Repository** (or choose to upload via CLI).
2. Point it to the directory containing the FastAPI files.
3. In the service settings, add the following **Environment Variables**:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (Railway automatically binds this).
   - `JWT_SECRET_KEY`: A secure random string (e.g. `openssl rand -hex 32` output).
   - `PORT`: `8000`
4. Railway will automatically detect the `requirements.txt` file and start building using Python.
5. In the **Networking** tab of the service, click **Generate Domain** to get the public URL of the backend (e.g., `https://school-attendance-production.up.railway.app`).

---

## 2. Frontend Deployment (Vercel)

We deploy the Vite-React frontend to Vercel (free tier).

### Step A: Configure Production API Target
In the frontend repository, create an `.env` or set environment variables in Vercel settings:
- `VITE_API_URL`: Your backend URL followed by `/api/v1` (e.g., `https://school-attendance-production.up.railway.app/api/v1`).

### Step B: Build Settings on Vercel
1. Link your GitHub repository to Vercel.
2. In the project setup, choose **Vite** as the framework preset.
3. Keep default build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add the environment variables:
   - Key: `VITE_API_URL`, Value: `https://school-attendance-production.up.railway.app/api/v1`
5. Click **Deploy**. Vercel will build and serve the application globally.

---

## 3. Post-Deployment Verification

1. Access the frontend deployment URL on a phone/browser.
2. Log in with the default admin account:
   - **Email**: `admin@school.com`
   - **Password**: `admin123`
3. Immediately change the admin password in the **Manage Teachers** section.
4. Verify by adding a class, adding a test student, and saving an attendance entry.
