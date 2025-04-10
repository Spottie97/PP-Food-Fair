import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  Button, // For potential refresh button
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateError, setUpdateError] = useState(''); // Separate error state for updates
  const [updatingUserId, setUpdatingUserId] = useState(null); // Track which user is being updated
  const { user: loggedInUser } = useAuth(); // Get the currently logged-in user

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/users');
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        setError('Failed to fetch users.');
      }
    } catch (err) {
      console.error("Fetch users error:", err);
      setError(err.response?.data?.message || 'An error occurred while fetching users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (event, userId) => {
    const newRole = event.target.value;
    setUpdateError('');
    setUpdatingUserId(userId); // Indicate loading for this specific row

    // Optimistic UI update (optional but improves perceived performance)
    // const originalUsers = [...users];
    // setUsers(prevUsers => prevUsers.map(u => u._id === userId ? { ...u, role: newRole } : u));

    try {
        const response = await apiClient.put(`/users/${userId}/role`, { role: newRole });
        if (response.data.success) {
            // Update the user list with the confirmed new role
            setUsers(prevUsers => prevUsers.map(u =>
                u._id === userId ? { ...u, role: response.data.data.role } : u
            ));
        } else {
             // Revert optimistic update if necessary
             // setUsers(originalUsers);
            throw new Error(response.data.message || 'Failed to update role');
        }
    } catch (err) {
        console.error("Update role error:", err);
        // Revert optimistic update if necessary
        // setUsers(originalUsers);
        setUpdateError(`Failed to update role for user ${userId}: ${err.message || 'Server error'}`);
        // Refetch users to ensure consistency after error
        // await fetchUsers();
    } finally {
        setUpdatingUserId(null); // Clear loading indicator for this row
    }

  };

  const handleDeleteUser = async (userId, userEmail) => {
      if (!window.confirm(`Are you sure you want to delete the user ${userEmail}? This action cannot be undone.`)) {
          return;
      }
      setUpdateError(''); // Clear previous errors
      setUpdatingUserId(userId); // Show loading state on the row
      try {
          const response = await apiClient.delete(`/users/${userId}`);
          if (response.data.success) {
              // Remove the user from the local state
              setUsers(prevUsers => prevUsers.filter(u => u._id !== userId));
          } else {
              throw new Error(response.data.message || 'Failed to delete user');
          }
      } catch (err) {
          console.error("Delete user error:", err);
          setUpdateError(`Failed to delete user ${userEmail}: ${err.message || 'Server error'}`);
      } finally {
          setUpdatingUserId(null); // Clear loading indicator for this row
      }
  };

  // Render Logic
  // Note: Route protection in App.jsx already handles non-admins

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mt: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
         {/* Optional: Add a refresh button */}
         {/* <Button variant="outlined" onClick={fetchUsers} disabled={loading}>Refresh</Button> */}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {updateError && <Alert severity="warning" sx={{ mb: 2 }}>{updateError}</Alert>} {/* Show update errors */}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="sticky user table">
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 && !loading ? (
                 <TableRow>
                    <TableCell colSpan={3} align="center">
                        No users found.
                    </TableCell>
                 </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow hover key={user._id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {/* Disable role change for the currently logged-in admin */}
                      {user._id === loggedInUser?._id ? (
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{user.role} (You)</Typography>
                      ) : (
                        <FormControl size="small" sx={{ minWidth: 120 }} disabled={updatingUserId === user._id}>
                          <Select
                            value={user.role}
                            onChange={(e) => handleRoleChange(e, user._id)}
                            displayEmpty
                          >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="manager">Manager</MenuItem>
                          </Select>
                          {updatingUserId === user._id && <CircularProgress size={20} sx={{ position: 'absolute', right: 5, top: 'calc(50% - 10px)' }} />}
                        </FormControl>
                      )}
                    </TableCell>
                    <TableCell align="right">
                       {/* Only show delete button if it's not the logged-in user */} 
                       {user._id !== loggedInUser?._id && (
                          <IconButton
                             size="small"
                             onClick={() => handleDeleteUser(user._id, user.email)}
                             disabled={updatingUserId === user._id}
                             title="Delete User"
                             color="error"
                          >
                             <DeleteIcon fontSize="small" />
                          </IconButton>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default UserManagementPage; 