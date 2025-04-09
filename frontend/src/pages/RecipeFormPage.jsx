import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../services/api';
import {
  Container,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

// TODO: Later, adapt this page to handle both Create and Edit modes

const RecipeFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID from URL for edit mode
  const isEditMode = Boolean(id); // Determine if we are editing

  const [pieName, setPieName] = useState('');
  const [variant, setVariant] = useState('Standard');
  const [batchSize, setBatchSize] = useState('');
  const [ingredients, setIngredients] = useState([{ ingredient: null, quantity: '', unit: '' }]);
  const [laborInputs, setLaborInputs] = useState([{ workers: '', hoursPerWorker: '' }]);
  const [laborHourlyRate, setLaborHourlyRate] = useState('');
  const [markupPercentage, setMarkupPercentage] = useState('');
  const [notes, setNotes] = useState('');

  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode); // Loading state for fetching data in edit mode
  const [error, setError] = useState('');
  const [ingredientOptionsLoading, setIngredientOptionsLoading] = useState(false);

  // Fetch available ingredients for Autocomplete
  useEffect(() => {
    const fetchIngredients = async () => {
      setIngredientOptionsLoading(true);
      try {
        const response = await apiClient.get('/ingredients');
        if (response.data.success) {
          setAvailableIngredients(response.data.data);
        } else {
          setError('Failed to load ingredients list.');
        }
      } catch (err) {
        setError('Error fetching ingredients.');
        console.error(err);
      }
      setIngredientOptionsLoading(false);
    };
    fetchIngredients();
  }, []);

  // useEffect for Edit mode to fetch recipe data by ID
  useEffect(() => {
    if (isEditMode && id) {
      const fetchRecipeData = async () => {
        setInitialLoading(true);
        setError('');
        try {
          const response = await apiClient.get(`/recipes/${id}`);
          if (response.data.success) {
            const recipe = response.data.data;
            setPieName(recipe.pieName);
            setVariant(recipe.variant || 'Standard'); // Handle potential missing variant
            setBatchSize(recipe.batchSize.toString()); // Ensure string for TextField
            setMarkupPercentage(recipe.markupPercentage.toString());
            setLaborHourlyRate(recipe.laborHourlyRate.toString());
            setNotes(recipe.notes || '');

            // Map fetched ingredients to the state structure, ensuring ingredient object is populated
            // The GET /recipes/:id route populates ingredient details
            setIngredients(recipe.ingredients.map(ing => ({
              ingredient: ing.ingredient, // The populated ingredient object
              quantity: ing.quantity.toString(),
              unit: ing.ingredient.unit // Set unit from the populated ingredient
            })));

            // Map fetched labor inputs
            setLaborInputs(recipe.laborInputs.map(lab => ({
                workers: lab.workers.toString(),
                hoursPerWorker: lab.hoursPerWorker.toString()
            })));

            // Handle cases where fetched data might be empty (though schema should prevent this)
            if (recipe.ingredients.length === 0) {
               setIngredients([{ ingredient: null, quantity: '', unit: '' }]);
            }
             if (recipe.laborInputs.length === 0) {
               setLaborInputs([{ workers: '', hoursPerWorker: '' }]);
            }

          } else {
            setError(`Failed to fetch recipe data: ${response.data.message}`);
          }
        } catch (err) {
          setError(err.response?.data?.message || `An error occurred while fetching recipe ${id}.`);
          console.error("Fetch recipe error:", err);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchRecipeData();
    }
  }, [id, isEditMode]); // Depend on id and isEditMode

  // --- Ingredient Handlers ---
  const handleIngredientChange = (index, selectedOption) => {
    const newIngredients = [...ingredients];
    newIngredients[index].ingredient = selectedOption; // Store the whole ingredient object initially
    newIngredients[index].unit = selectedOption ? selectedOption.unit : ''; // Set unit based on selection
    setIngredients(newIngredients);
  };

  const handleIngredientQuantityChange = (index, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index].quantity = value;
    setIngredients(newIngredients);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { ingredient: null, quantity: '', unit: '' }]);
  };

  const removeIngredient = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  // --- Labor Handlers ---
  const handleLaborInputChange = (index, field, value) => {
    const newLaborInputs = [...laborInputs];
    newLaborInputs[index][field] = value;
    setLaborInputs(newLaborInputs);
  };

  const addLaborInput = () => {
    setLaborInputs([...laborInputs, { workers: '', hoursPerWorker: '' }]);
  };

  const removeLaborInput = (index) => {
    const newLaborInputs = laborInputs.filter((_, i) => i !== index);
    setLaborInputs(newLaborInputs);
  };

  // --- Submit Handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    // --- Basic Validation --- (can be more robust)
    if (!pieName || !batchSize || !laborHourlyRate || !markupPercentage || ingredients.length === 0 || laborInputs.length === 0) {
        setError("Please fill in all required fields (Pie Name, Batch Size, Hourly Rate, Markup, add at least one Ingredient and Labor Input).");
        setLoading(false);
        return;
    }

    // Format data for API
    const recipeData = {
      pieName,
      variant,
      batchSize: parseInt(batchSize, 10),
      ingredients: ingredients
        .filter(item => item.ingredient && item.quantity) // Ensure ingredient is selected and quantity entered
        .map(item => ({
            ingredient: item.ingredient._id, // Send only the ID
            quantity: parseFloat(item.quantity),
            unit: item.unit // Send the unit derived from the selected ingredient
        })),
      laborInputs: laborInputs
        .filter(input => input.workers && input.hoursPerWorker)
        .map(input => ({
            workers: parseInt(input.workers, 10),
            hoursPerWorker: parseFloat(input.hoursPerWorker)
        })),
      laborHourlyRate: parseFloat(laborHourlyRate),
      markupPercentage: parseFloat(markupPercentage),
      notes,
    };

    // Further validation on formatted data
     if (recipeData.ingredients.length === 0 || recipeData.laborInputs.length === 0) {
        setError("Please ensure all added ingredients and labor inputs have valid values.");
        setLoading(false);
        return;
    }

    try {
        let response;
        if (isEditMode) {
            response = await apiClient.put(`/recipes/${id}`, recipeData);
        } else {
            response = await apiClient.post('/recipes', recipeData);
        }

        if (response.data.success) {
            navigate('/'); // Navigate back to dashboard on success
        } else {
            setError(response.data.message || 'Failed to save recipe.');
        }
    } catch (err) {
        console.error("Submit recipe error:", err.response || err);
        setError(err.response?.data?.message || 'An error occurred while saving the recipe.');
    }
    setLoading(false);
  };

  // Show loading indicator while fetching data for edit mode
  if (initialLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isEditMode ? 'Edit Pie Recipe' : 'Add New Pie Recipe'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            {/* --- Basic Info --- */}
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                id="pieName"
                label="Pie Name"
                value={pieName}
                onChange={(e) => setPieName(e.target.value)}
                disabled={loading}
              />
            </Grid>
             <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                    <InputLabel id="variant-label">Variant</InputLabel>
                    <Select
                        labelId="variant-label"
                        id="variant"
                        value={variant}
                        label="Variant"
                        onChange={(e) => setVariant(e.target.value)}
                        disabled={loading}
                    >
                        <MenuItem value="Standard">Standard</MenuItem>
                        <MenuItem value="Mini">Mini</MenuItem>
                        {/* Add other variants if needed */}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                id="batchSize"
                label="Batch Size (Units)"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                disabled={loading}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    required
                    fullWidth
                    id="markupPercentage"
                    label="Markup Percentage (%)"
                    type="number"
                    value={markupPercentage}
                    onChange={(e) => setMarkupPercentage(e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0 }}
                 />
            </Grid>

            {/* --- Ingredients Section --- */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Ingredients</Typography>
            </Grid>
            {ingredients.map((item, index) => (
              <React.Fragment key={index}>
                <Grid item xs={12} sm={5}>
                  <Autocomplete
                    options={availableIngredients}
                    getOptionLabel={(option) => option.ingredientName || ''}
                    value={item.ingredient}
                    onChange={(event, newValue) => {
                      handleIngredientChange(index, newValue);
                    }}
                    isOptionEqualToValue={(option, value) => option._id === value?._id}
                    loading={ingredientOptionsLoading}
                    disabled={loading || initialLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Ingredient"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {ingredientOptionsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    required
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleIngredientQuantityChange(index, e.target.value)}
                    disabled={loading || initialLoading}
                    inputProps={{ min: 0, step: "any" }}
                  />
                </Grid>
                 <Grid item xs={12} sm={2}>
                   <TextField
                        fullWidth
                        label="Unit"
                        value={item.unit} // Display unit from selected ingredient
                        disabled // Unit is determined by ingredient
                        InputProps={{
                            readOnly: true,
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton onClick={() => removeIngredient(index)} disabled={ingredients.length <= 1 || loading || initialLoading} color="error">
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                </Grid>
              </React.Fragment>
            ))}
            <Grid item xs={12}>
              <Button
                startIcon={<AddCircleOutlineIcon />}
                onClick={addIngredient}
                disabled={loading || initialLoading}
              >
                Add Ingredient
              </Button>
            </Grid>

             {/* --- Labor Section --- */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Labor</Typography>
            </Grid>
             <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                id="laborHourlyRate"
                label="Labor Rate (per Hour)"
                type="number"
                value={laborHourlyRate}
                onChange={(e) => setLaborHourlyRate(e.target.value)}
                disabled={loading || initialLoading}
                inputProps={{ min: 0, step: "any" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}></Grid> {/* Spacer */} 

            {laborInputs.map((input, index) => (
              <React.Fragment key={index}>
                <Grid item xs={12} sm={5}>
                   <TextField
                        required
                        fullWidth
                        label="No. Workers"
                        type="number"
                        value={input.workers}
                        onChange={(e) => handleLaborInputChange(index, 'workers', e.target.value)}
                        disabled={loading || initialLoading}
                        inputProps={{ min: 1 }}
                    />
                </Grid>
                <Grid item xs={12} sm={5}>
                    <TextField
                        required
                        fullWidth
                        label="Hours per Worker (for Batch)"
                        type="number"
                        value={input.hoursPerWorker}
                        onChange={(e) => handleLaborInputChange(index, 'hoursPerWorker', e.target.value)}
                        disabled={loading || initialLoading}
                        inputProps={{ min: 0, step: "any" }}
                     />
                </Grid>
                <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton onClick={() => removeLaborInput(index)} disabled={laborInputs.length <= 1 || loading || initialLoading} color="error">
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                </Grid>
              </React.Fragment>
            ))}
             <Grid item xs={12}>
              <Button
                startIcon={<AddCircleOutlineIcon />}
                onClick={addLaborInput}
                disabled={loading || initialLoading}
              >
                Add Labor Input
              </Button>
            </Grid>

            {/* --- Notes --- */}
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    id="notes"
                    label="Notes (Optional)"
                    multiline
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading || initialLoading}
                />
            </Grid>

            {/* --- Submit Button --- */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={() => navigate('/')} sx={{ mr: 1 }} disabled={loading || initialLoading}>
                    Cancel
                 </Button>
                <Button type="submit" variant="contained" disabled={loading || initialLoading}>
                  {loading ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Create Recipe')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default RecipeFormPage; 