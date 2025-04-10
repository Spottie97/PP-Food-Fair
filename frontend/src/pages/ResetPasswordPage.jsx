import React, { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import apiClient from '../services/api';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Link as MuiLink, // Rename to avoid conflict
} from '@mui/material';

const ResetPasswordPage = () => {
  const { token } = useParams(); // Get token from URL
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.put(`/auth/resetpassword/${token}`, { password });
      if (response.data.success) {
        setSuccessMessage(response.data.message || 'Password reset successfully! You will be redirected to login shortly.');
        setPassword('');
        setConfirmPassword('');
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate('/login?reset=success'); // Add query param for potential success message on login page
        }, 3000); // 3 second delay
      } else {
        setError(response.data.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error("Reset password error:", err.response || err);
      setError(err.response?.data?.message || 'An error occurred. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Reset Password
        </Typography>
        <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
          Enter your new password below.
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
          {successMessage && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{successMessage}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="New Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !!successMessage}
            helperText="Password must be at least 6 characters."
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm New Password"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading || !!successMessage}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !!successMessage}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
          </Button>
           {/* Optional: Link back to login if user gives up */}
           {!successMessage && (
               <Box sx={{ textAlign: 'center' }}>
                   <MuiLink component={RouterLink} to="/login" variant="body2">
                       Cancel and go back to Sign In
                   </MuiLink>
               </Box>
            )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ResetPasswordPage; 