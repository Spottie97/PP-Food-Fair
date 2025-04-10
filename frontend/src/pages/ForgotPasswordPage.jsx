import React, { useState } from 'react';
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
import { Link as RouterLink } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/auth/forgotpassword', { email });
      // Always show the success message to prevent email enumeration
      setSuccessMessage(response.data.message || 'If an account with that email exists, a password reset link has been sent.');
      setEmail(''); // Clear email field on success
    } catch (err) {
      console.error("Forgot password error:", err.response || err);
      if (err.response && err.response.status === 404) {
        setError(err.response.data.message || 'Email address not found.');
      } else if (err.response && err.response.status === 429) {
        setError(err.response.data.message || 'Too many requests. Please try again later.');
      } else {
        setError('An error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Forgot Password
        </Typography>
        <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
          Enter your email address and we'll send you a link to reset your password (if an account exists).
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
          {successMessage && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{successMessage}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || !!successMessage} // Disable if successful
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !!successMessage}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
          </Button>
          <Box sx={{ textAlign: 'center' }}>
            <MuiLink component={RouterLink} to="/login" variant="body2">
              Back to Sign In
            </MuiLink>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPasswordPage; 