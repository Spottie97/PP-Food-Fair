# Pie Pricing Calculator

A professional cloud-based web application for calculating pie pricing, built with React, Node.js, and MaterialUI.

## Features

- User authentication and authorization
- Pie recipe management
- Dynamic pricing calculations
- Cost breakdown visualization
- Excel export functionality
- Responsive MaterialUI design

## Tech Stack

- Frontend: React, MaterialUI, Redux Toolkit
- Backend: Node.js, Express
- Database: MongoDB Atlas
- Authentication: JWT
- API Documentation: Swagger/OpenAPI

## Project Structure

```
pie-pricing-calculator/
├── frontend/           # React frontend application
├── backend/           # Node.js backend application
├── docs/             # Project documentation
└── scripts/          # Utility scripts
```

## Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account
- npm or yarn package manager

## Getting Started

1. Clone the repository
2. Install dependencies:

   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Set up environment variables:

   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Update the variables with your configuration

4. Start the development servers:

   ```bash
   # Start backend server
   cd backend
   npm run dev

   # Start frontend server
   cd frontend
   npm start
   ```

## Development

- Frontend runs on: http://localhost:3000
- Backend API runs on: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

## Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
