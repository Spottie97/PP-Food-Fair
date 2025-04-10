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
  Button,
  IconButton,
  TextField, // For potential inline form or dialog
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, // For Add/Edit Dialog
  FormControl, // Import FormControl
  InputLabel, // Import InputLabel
  Select, // Import Select
  MenuItem, // Import MenuItem
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// TODO: Implement Add/Edit Dialog/Form

const IngredientManagementPage = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentIngredient, setCurrentIngredient] = useState({ _id: null, ingredientName: '', unit: 'kg', costPerUnit: '' });

  // Fetch ingredients
  useEffect(() => {
    const fetchIngredients = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get('/ingredients');
        if (response.data.success) {
          setIngredients(response.data.data);
        } else {
          setError('Failed to fetch ingredients.');
        }
      } catch (err) {
        console.error("Fetch ingredients error:", err);
        setError(err.response?.data?.message || 'An error occurred while fetching ingredients.');
      }
      setLoading(false);
    };

    fetchIngredients();
  }, []);

  const refreshIngredients = async () => {
     setLoading(true);
      setError('');
      try {
        const response = await apiClient.get('/ingredients');
        if (response.data.success) {
          setIngredients(response.data.data);
        } else {
          setError('Failed to fetch ingredients.');
        }
      } catch (err) {
         setError(err.response?.data?.message || 'An error occurred while fetching ingredients.');
      } finally {
         setLoading(false);
      }
  };

  // --- Dialog Handlers ---
  const handleOpenAddDialog = () => {
    setIsEditMode(false);
    setCurrentIngredient({ _id: null, ingredientName: '', unit: 'kg', costPerUnit: '' });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (ingredient) => {
    setIsEditMode(true);
    setCurrentIngredient({ ...ingredient, costPerUnit: ingredient.costPerUnit.toString() }); // Ensure cost is string for TextField
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(''); // Clear errors when closing dialog
  };

  const handleDialogInputChange = (event) => {
    const { name, value } = event.target;
    setCurrentIngredient(prev => ({ ...prev, [name]: value }));
  };

  const handleDialogSubmit = async () => {
    setError('');
    if (!currentIngredient.ingredientName || !currentIngredient.unit || !currentIngredient.costPerUnit) {
        setError("Please fill in all ingredient fields.");
        return;
    }

    const payload = {
        ingredientName: currentIngredient.ingredientName,
        unit: currentIngredient.unit,
        costPerUnit: parseFloat(currentIngredient.costPerUnit)
    };

    setLoading(true); // Indicate loading during API call
    try {
        if (isEditMode) {
            // PUT request to update
            const response = await apiClient.put(`/ingredients/${currentIngredient._id}`, payload);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to update ingredient');
            }
        } else {
            // POST request to add
            const response = await apiClient.post('/ingredients', payload);
             if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to add ingredient');
            }
        }
        handleCloseDialog();
        await refreshIngredients(); // Refresh the list
    } catch (err) {
        console.error("Ingredient submit error:", err);
        setError(err.message || 'An error occurred while saving the ingredient.');
    } finally {
        setLoading(false);
    }
  };

  // --- Delete Handler ---
  const handleDeleteIngredient = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ingredient? This might affect existing recipes.')) {
        return;
    }
    setLoading(true);
    try {
        await apiClient.delete(`/ingredients/${id}`);
        await refreshIngredients();
    } catch (err) {
        console.error("Delete ingredient error:", err);
        setError(err.response?.data?.message || 'An error occurred while deleting the ingredient.');
        setLoading(false); // Ensure loading is false on error
    }
    // setLoading is handled by refreshIngredients on success
  };

  // --- Render Logic ---
  if (!isAdmin && !isManager) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 3 }}>Access Denied. Only Admins or Managers can manage ingredients.</Alert>
      </Container>
    );
  }

  if (loading && ingredients.length === 0) { // Show initial loading spinner
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mt: 3 }}>
        <Typography variant="h4" component="h1">
          Ingredient Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleOpenAddDialog}
          disabled={loading} // Disable button while loading
        >
          Add Ingredient
        </Button>
      </Box>

      {error && !openDialog && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>} {/* Show general errors only when dialog is closed */} 

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="sticky ingredient table">
            <TableHead>
              <TableRow>
                <TableCell>Ingredient Name</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Cost per Unit (R)</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ingredients.length === 0 && !loading ? (
                 <TableRow>
                    <TableCell colSpan={4} align="center">
                        No ingredients found.
                    </TableCell>
                 </TableRow>
              ) : (
                ingredients.map((ingredient) => (
                  <TableRow hover key={ingredient._id}>
                    <TableCell component="th" scope="row">
                      {ingredient.ingredientName}
                    </TableCell>
                    <TableCell>{ingredient.unit}</TableCell>
                    <TableCell align="right">{ingredient.costPerUnit?.toFixed(2) ?? 'N/A'}</TableCell>
                    <TableCell align="center">
                       <IconButton size="small" onClick={() => handleOpenEditDialog(ingredient)} title="Edit" disabled={loading}>
                         <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteIngredient(ingredient._id)} title="Delete" disabled={loading}>
                         <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Ingredient Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} aria-labelledby="ingredient-dialog-title">
        <DialogTitle id="ingredient-dialog-title">{isEditMode ? 'Edit Ingredient' : 'Add New Ingredient'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>} {/* Show errors inside dialog */}
          <DialogContentText sx={{mb: 2}}>
            Please enter the details for the ingredient.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="ingredientName"
            name="ingredientName"
            label="Ingredient Name"
            type="text"
            fullWidth
            variant="outlined"
            value={currentIngredient.ingredientName}
            onChange={handleDialogInputChange}
            required
            disabled={loading}
          />
          <FormControl fullWidth margin="dense" required disabled={loading}>
             <InputLabel id="unit-select-label">Unit</InputLabel>
             <Select
                labelId="unit-select-label"
                id="unit"
                name="unit"
                value={currentIngredient.unit}
                label="Unit"
                onChange={handleDialogInputChange}
             >
                <MenuItem value="kg">kg (Kilogram)</MenuItem>
                <MenuItem value="g">g (Gram)</MenuItem>
                <MenuItem value="L">L (Liter)</MenuItem>
                <MenuItem value="ml">ml (Milliliter)</MenuItem>
                <MenuItem value="unit">unit (Unit/Each)</MenuItem>
                {/* Add other units if needed */}
             </Select>
          </FormControl>
          <TextField
            margin="dense"
            id="costPerUnit"
            name="costPerUnit"
            label="Cost per Unit (R)"
            type="number"
            fullWidth
            variant="outlined"
            value={currentIngredient.costPerUnit}
            onChange={handleDialogInputChange}
            required
            disabled={loading}
            inputProps={{ min: 0, step: "any" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>Cancel</Button>
          <Button onClick={handleDialogSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : (isEditMode ? 'Save Changes' : 'Add Ingredient')}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default IngredientManagementPage; 