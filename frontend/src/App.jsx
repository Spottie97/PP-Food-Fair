import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { Box, CircularProgress, Container, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import actual pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RecipeFormPage from './pages/RecipeFormPage';
import RecipeViewPage from './pages/RecipeViewPage';
import IngredientManagementPage from './pages/IngredientManagementPage';
import UserManagementPage from './pages/UserManagementPage';

// Placeholder Pages (create these later)
// Wrap in Container for consistent padding/max-width
const NotFoundPage = () => <Container><div>404 Not Found Placeholder</div></Container>;

// Layout Component
const Layout = ({ children }) => {
  const { logout, user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
        <Toolbar sx={{ flexWrap: 'wrap' }}>
          <Typography variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
            Pie Pricing Calculator
          </Typography>
          <nav>
            {isAuthenticated && (
              <Button color="inherit" onClick={() => navigate('/')} sx={{ mr: 1 }}>Dashboard</Button>
            )}
            {isAdmin && (
              <Button color="inherit" onClick={() => navigate('/ingredients')} sx={{ mr: 1 }}>Ingredients</Button>
            )}
            {isAdmin && (
              <Button color="inherit" onClick={() => navigate('/users')} sx={{ mr: 1 }}>Users</Button>
            )}
          </nav>
          {isAuthenticated && (
            <Button onClick={logout} variant="outlined" sx={{ my: 1, mx: 1.5 }}>
              Logout ({user?.username})
            </Button>
          )}
          {!isAuthenticated && (
              <>
                  {/* Optionally add Login/Register buttons here if needed outside the pages */}
              </>
          )}
        </Toolbar>
      </AppBar>

      {/* Main content area */}
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Box>

      {/* Simple Footer */}
      <Box component="footer" sx={{ p: 2, mt: 'auto', bgcolor: 'grey.200', textAlign: 'center' }}>
         <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Food Fair Pies
          </Typography>
      </Box>
    </Box>
  );
};

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />}
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipes/new"
            element={
              <ProtectedRoute roles={['admin']}>
                <RecipeFormPage />
              </ProtectedRoute>
            }
          />
          {/* Example Admin Route */}
          {/* <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          /> */}

          {/* Add routes for Recipe View, Edit, Create here */}
          {/* <Route path="/recipes/new" element={<ProtectedRoute><RecipeCreatePage /></ProtectedRoute>} /> */}
          {/* <Route path="/recipes/:id" element={<ProtectedRoute><RecipeViewPage /></ProtectedRoute>} /> */}
          <Route
            path="/recipes/:id/edit"
            element={
              <ProtectedRoute roles={['admin']}>
                <RecipeFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipes/:id"
            element={
              <ProtectedRoute>
                <RecipeViewPage />
              </ProtectedRoute>
            }
          />

          {/* Ingredient Management Route (Admin only) */}
          <Route
            path="/ingredients"
            element={
              <ProtectedRoute roles={['admin']}>
                <IngredientManagementPage />
              </ProtectedRoute>
            }
          />

          {/* User Management Route (Admin only) */}
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 