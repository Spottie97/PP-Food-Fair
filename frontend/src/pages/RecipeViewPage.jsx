import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
// Import chart components from recharts
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

const RecipeViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth(); // Get user info from context
  const isAdmin = user?.role === 'admin'; // Check if user is admin

  useEffect(() => {
    const fetchRecipe = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get(`/recipes/${id}`);
        if (response.data.success) {
          setRecipe(response.data.data);
        } else {
          setError('Failed to fetch recipe details.');
        }
      } catch (err) {
        console.error("Fetch recipe error:", err);
        setError(err.response?.data?.message || 'An error occurred while fetching the recipe.');
      }
      setLoading(false);
    };

    fetchRecipe();
  }, [id]);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!recipe) {
    return (
       <Container>
         <Alert severity="warning" sx={{ mt: 3 }}>Recipe not found.</Alert>
         <Button variant="outlined" onClick={() => navigate('/')} sx={{ mt: 2 }}>
            Back to Dashboard
         </Button>
       </Container>
    );
  }

  // Placeholder for chart data preparation
  const costData = [
    { name: 'Ingredient Cost', value: recipe.calculatedCosts?.totalIngredientCost ?? 0 },
    { name: 'Labor Cost', value: recipe.calculatedCosts?.totalLaborCost ?? 0 },
  ];
  const COLORS = ['#0088FE', '#FF8042']; // Example colors

  return (
    <Container maxWidth="lg" sx={{ mt: 3 }}>
       <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1">
              {recipe.pieName} ({recipe.variant || 'Standard'})
            </Typography>
            <Box>
                <Button variant="outlined" onClick={() => navigate('/')} sx={{ mr: 1 }}>
                    Back to Dashboard
                </Button>
                {/* Conditionally render Edit button */}
                {isAdmin && (
                 <IconButton onClick={() => navigate(`/recipes/${id}/edit`)} color="primary" title="Edit Recipe">
                     <EditIcon />
                  </IconButton>
                )}
            </Box>
        </Box>
        <Divider sx={{ mb: 3 }}/>

        <Grid container spacing={4}>
          {/* Left Side: Details */}
          <Grid item xs={12} md={7}>
            <Typography variant="h6" gutterBottom>Details</Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Batch Size" secondary={`${recipe.batchSize} units`} />
              </ListItem>
              <ListItem>
                 <ListItemText primary="Markup" secondary={`${recipe.markupPercentage}%`} />
              </ListItem>
              <ListItem>
                 <ListItemText primary="Labor Rate" secondary={`R${recipe.laborHourlyRate?.toFixed(2)} / hour`} />
              </ListItem>
            </List>

             <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Ingredients</Typography>
             <List dense>
                {recipe.ingredients.map((item, index) => (
                    <ListItem key={index}>
                        <ListItemText
                         primary={item.ingredient?.ingredientName || 'Unknown Ingredient'}
                         secondary={`${item.quantity} ${item.unit}`}
                         />
                    </ListItem>
                ))}
             </List>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Labor Inputs</Typography>
             <List dense>
                {recipe.laborInputs.map((item, index) => (
                    <ListItem key={index}>
                        <ListItemText
                         primary={`${item.workers} worker(s)`}
                         secondary={`${item.hoursPerWorker} hours per worker`}
                         />
                    </ListItem>
                ))}
             </List>

             {recipe.notes && (
                <>
                 <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Notes</Typography>
                 <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{recipe.notes}</Typography>
                </>
             )}
          </Grid>

          {/* Right Side: Costs & Visualization */}
          <Grid item xs={12} md={5}>
             <Typography variant="h6" gutterBottom>Cost Breakdown</Typography>
             <List dense>
                <ListItem>
                    <ListItemText primary="Total Ingredient Cost" secondary={`R${recipe.calculatedCosts?.totalIngredientCost?.toFixed(2) ?? 'N/A'}`} />
                </ListItem>
                 <ListItem>
                    <ListItemText primary="Total Labor Cost" secondary={`R${recipe.calculatedCosts?.totalLaborCost?.toFixed(2) ?? 'N/A'}`} />
                 </ListItem>
                 <ListItem>
                    <ListItemText primary="Total Batch Cost" secondary={`R${recipe.calculatedCosts?.totalBatchCost?.toFixed(2) ?? 'N/A'}`} />
                 </ListItem>
                 <Divider sx={{ my: 1 }} />
                 <ListItem>
                    <ListItemText primary="Cost Per Pie" secondaryTypographyProps={{ variant: 'h6', color: 'text.primary' }} primaryTypographyProps={{ variant: 'body1'}} secondary={`R${recipe.calculatedCosts?.costPerPie?.toFixed(2) ?? 'N/A'}`} />
                 </ListItem>
                 <ListItem>
                    <ListItemText primary="Selling Price (with Markup)" secondaryTypographyProps={{ variant: 'h5', color: 'primary' }} primaryTypographyProps={{ variant: 'body1'}} secondary={`R${recipe.sellingPrice?.toFixed(2) ?? 'N/A'}`} />
                 </ListItem>
             </List>

             {/* Chart Implementation */}
             <Box sx={{ height: 300, mt: 3 }}>
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                             data={costData.filter(d => d.value > 0)} // Filter out zero values if any
                             cx="50%"
                             cy="50%"
                             labelLine={false}
                             // label={renderCustomizedLabel} // Optional: Custom labels
                             outerRadius={80}
                             fill="#8884d8"
                             dataKey="value"
                         >
                          {costData.filter(d => d.value > 0).map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                          </Pie>
                          <Tooltip formatter={(value) => `R${Number(value).toFixed(2)}`} />
                         <Legend />
                      </PieChart>
                  </ResponsiveContainer>
             </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default RecipeViewPage; 