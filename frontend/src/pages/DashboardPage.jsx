import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
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
  Button,
  IconButton
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get('/recipes');
        if (response.data.success) {
          setRecipes(response.data.data);
        } else {
          setError('Failed to fetch recipes.');
        }
      } catch (err) {
        console.error("Fetch recipes error:", err);
        setError(err.response?.data?.message || 'An error occurred while fetching recipes.');
      }
      setLoading(false);
    };

    fetchRecipes();
  }, []);

  const handleAddRecipe = () => {
    navigate('/recipes/new');
  };

  const handleViewRecipe = (id) => {
    // Navigate to recipe detail page (e.g., /recipes/:id)
    console.log('Navigate to view recipe:', id);
    // navigate(`/recipes/${id}`);
  };

  const handleEditRecipe = (id) => {
    // Navigate to recipe edit page (e.g., /recipes/:id/edit)
    console.log('Navigate to edit recipe:', id);
    // navigate(`/recipes/${id}/edit`);
  };

  const handleDeleteRecipe = async (id) => {
    // Confirmation dialog would be good here
    if (!window.confirm('Are you sure you want to delete this recipe?')) {
        return;
    }
    console.log('Attempting to delete recipe:', id);
    try {
        await apiClient.delete(`/recipes/${id}`);
        // Refresh list after delete
        setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe._id !== id));
    } catch (err) {
        console.error("Delete recipe error:", err);
        setError(err.response?.data?.message || 'An error occurred while deleting the recipe.');
        // Optionally show error in a snackbar/toast
    }

  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Pie Recipes Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleAddRecipe}
        >
          Add New Recipe
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}> {/* Add maxHeight for scroll */}
          <Table stickyHeader aria-label="sticky recipe table">
            <TableHead>
              <TableRow>
                <TableCell>Pie Name</TableCell>
                <TableCell>Variant</TableCell>
                <TableCell align="right">Batch Size</TableCell>
                <TableCell align="right">Cost / Pie</TableCell>
                <TableCell align="right">Selling Price</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recipes.length === 0 && !loading ? (
                 <TableRow>
                    <TableCell colSpan={6} align="center">
                        No recipes found.
                    </TableCell>
                 </TableRow>
              ) : (
                recipes.map((recipe) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={recipe._id}>
                    <TableCell component="th" scope="row">
                      {recipe.pieName}
                    </TableCell>
                    <TableCell>{recipe.variant || 'Standard'}</TableCell>
                    <TableCell align="right">{recipe.batchSize}</TableCell>
                    <TableCell align="right">{recipe.calculatedCosts?.costPerPie?.toFixed(2) ?? 'N/A'}</TableCell>
                    <TableCell align="right">{recipe.sellingPrice?.toFixed(2) ?? 'N/A'}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleViewRecipe(recipe._id)} title="View Details">
                         <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEditRecipe(recipe._id)} title="Edit">
                         <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteRecipe(recipe._id)} title="Delete">
                         <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {/* TODO: Add Pagination if needed */}
      </Paper>
    </Container>
  );
};

export default DashboardPage; 