# Food Fair - Pie Pricing Software

## Overview

Briefly describe the purpose of this application. What problem does it solve? Who is it for? (e.g., A web application designed for Food Fair vendors to accurately calculate the cost and selling price of their jam/pie recipes based on ingredients, labor, and desired markup.)

## Features

- User Authentication (Register/Login)
- Role-based Access Control (Admin, User)
- Ingredient Management (CRUD operations - Admin only)
- Recipe Management (CRUD operations - Admin only)
- Automated Cost Calculation (Ingredient Cost, Labor Cost, Cost Per Unit)
- Automated Selling Price Calculation (based on cost and markup)
- User Role Management (Admin only)
- Data Export (e.g., Recipes to Excel)
- (Add any other key features)

## Tech Stack

**Backend:**

- Node.js
- Express.js
- MongoDB (with Mongoose)
- JSON Web Tokens (JWT) for authentication
- bcryptjs for password hashing
- express-validator for input validation
- dotenv for environment variables

**Frontend:**

- React (with Vite)
- Material UI (MUI) for components
- Axios for API calls
- React Router DOM for navigation
- Recharts for visualizations
- xlsx for Excel export

**Database:**

- MongoDB Atlas (or specify if local/different)

## Project Structure

```
/backend
  /src
    /config       # DB connection, etc.
    /controllers  # Request handling logic
    /middleware   # Custom middleware (auth, errors, etc.)
    /models       # Mongoose models (schemas)
    /routes       # API route definitions
    /services     # Business logic (e.g., pricing calculations)
    /utils        # Utility functions (e.g., error response)
    server.js     # Entry point
  .env.example    # Environment variable template
  package.json
/frontend
  /src
    /assets       # Static assets (images, etc.)
    /components   # Reusable UI components
    /contexts     # React contexts (e.g., AuthContext)
    /hooks        # Custom React hooks
    /pages        # Page-level components
    /services     # API client setup (axios)
    /utils        # Utility functions
    App.jsx       # Main application component, routing
    main.jsx      # Entry point
  .env.example    # Environment variable template (e.g., VITE_API_BASE_URL)
  index.html      # HTML entry point
  package.json
  vite.config.js # Vite configuration
README.md         # This file
```

## Setup & Running Locally

**Prerequisites:**

- Node.js (specify version if necessary, e.g., v18.x or later)
- npm or yarn
- MongoDB instance (local or cloud like MongoDB Atlas)

**Backend:**

1.  Navigate to the `backend` directory: `cd backend`
2.  Install dependencies: `npm install` or `yarn install`
3.  Create a `.env` file by copying `.env.example`.
4.  Fill in the `.env` file with your configuration (especially `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`).
5.  Start the server: `npm run dev` (or `npm start` if you have a start script)

**Frontend:**

1.  Navigate to the `frontend` directory: `cd ../frontend`
2.  Install dependencies: `npm install` or `yarn install`
3.  (Optional) Create a `.env` file if you need to override the default backend URL (`VITE_API_BASE_URL=http://localhost:5001/api/v1`).
4.  Start the development server: `npm run dev` or `yarn dev`
5.  Open your browser to the address provided by Vite (usually `http://localhost:5173`).

## API Endpoints

(Optional but recommended: Briefly list the main API endpoints, e.g.,)

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/ingredients`
- `POST /api/v1/ingredients` (Admin)
- `GET /api/v1/recipes`
- `POST /api/v1/recipes` (Admin)
- `GET /api/v1/users` (Admin)
- ...etc.

## Deployment

(Provide brief instructions or notes based on your chosen platform.)
Example for Vercel:

- Backend: Deploy the `backend` folder as a Node.js service. Configure environment variables in Vercel settings.
- Frontend: Deploy the `frontend` folder as a Vite project. Configure the `VITE_API_BASE_URL` environment variable in Vercel settings to point to the deployed backend URL.

Example for Render:

- Create a Web Service for the backend (`backend` directory), setting Build Command (`yarn install` or `npm install`) and Start Command (`yarn start` or `npm start`). Configure environment variables.
- Create a Static Site for the frontend (`frontend` directory), setting Build Command (`yarn build` or `npm run build`) and Publish directory (`dist`). Configure the `VITE_API_BASE_URL` as an environment variable during build.

## Contributing

(Optional: Add guidelines if others might contribute.)

## License

(Optional: Specify the project license, e.g., MIT.)
