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
import FileUploadIcon from '@mui/icons-material/FileUpload'; // Icon for upload button
import * as XLSX from 'xlsx'; // Import xlsx library
import Checkbox from '@mui/material/Checkbox'; // Import Checkbox
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'; // Icon for bulk delete

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
  const [currentIngredient, setCurrentIngredient] = useState({ _id: null, ingredientName: '', unit: 'kg', costPerUnit: '', supplier: '' });

  // Import state
  const [selectedFile, setSelectedFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // Selection state
  const [selected, setSelected] = useState([]); // Array of selected ingredient IDs

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
      setImportSuccess(''); // Clear import messages on refresh
      setImportError('');
      try {
        const response = await apiClient.get('/ingredients');
        if (response.data.success) {
          setIngredients(response.data.data);
          setSelected([]); // Clear selection on refresh
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
    setCurrentIngredient({ _id: null, ingredientName: '', unit: 'kg', costPerUnit: '', supplier: '' });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (ingredient) => {
    setIsEditMode(true);
    setCurrentIngredient({ ...ingredient, costPerUnit: ingredient.costPerUnit.toString(), supplier: ingredient.supplier || '' });
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
        setError("Please fill in Ingredient Name, Unit, and Cost.");
        return;
    }

    const payload = {
        ingredientName: currentIngredient.ingredientName,
        unit: currentIngredient.unit,
        costPerUnit: parseFloat(currentIngredient.costPerUnit),
        supplier: currentIngredient.supplier,
    };

    setLoading(true);
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

  // --- Export Handler ---
  const handleExportExcel = () => {
    if (ingredients.length === 0) {
      setError('No ingredients to export.'); // Use setError state
      return;
    }
    setError(''); // Clear any previous errors
    console.log("Exporting ingredients to Excel...");

    // 1. Format data
    const dataForSheet = ingredients.map(ing => ({
      'Ingredient Name': ing.ingredientName,
      'Unit': ing.unit,
      'Cost per Unit (R)': ing.costPerUnit?.toFixed(2) ?? 'N/A',
      'Supplier': ing.supplier || '', // Include optional fields
      'Category': ing.category || 'Other',
      'Added By': ing.createdBy?.username || 'N/A', // Optional: Requires population
      'Added At': ing.createdAt ? new Date(ing.createdAt).toLocaleDateString() : 'N/A', // Format date
    }));

    // 2. Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ingredients");

    // 3. Optional: Adjust column widths
    const cols = [
      { wch: 25 }, // Ingredient Name
      { wch: 10 }, // Unit
      { wch: 15 }, // Cost per Unit
      { wch: 20 }, // Supplier
      { wch: 15 }, // Category
      { wch: 15 }, // Added By
      { wch: 15 }, // Added At
    ];
    worksheet["!cols"] = cols;

    // 4. Generate file and trigger download
    try {
      XLSX.writeFile(workbook, "Ingredients_Export.xlsx");
      console.log("Excel export successful.");
    } catch (err) {
      console.error("Excel export error:", err);
      setError("Failed to export data to Excel.");
    }
  };

  // --- Import Handlers ---
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setImportError(''); // Clear previous errors on new file selection
    setImportSuccess('');
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setImportError('Please select an Excel file first.');
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportSuccess('');

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0]; // Assume data is on the first sheet
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet); // Convert sheet to JSON

        if (jsonData.length === 0) {
          throw new Error('Excel file is empty or has no data.');
        }

        // Send JSON data to backend
        const response = await apiClient.post('/ingredients/import', jsonData);

        if (response.data.success) {
          setImportSuccess(response.data.message);
          if (response.data.errors && response.data.errors.length > 0) {
            // Display validation/processing errors from backend
            setImportError(`Import completed with ${response.data.errors.length} errors: ${response.data.errors.join('; ')}`);
          }
          setSelectedFile(null); // Clear selected file
          // Reset the file input visually (important for selecting the same file again)
          if (document.getElementById('ingredient-import-input')) {
              document.getElementById('ingredient-import-input').value = '';
          }
          await refreshIngredients(); // Refresh the table
        } else {
          throw new Error(response.data.message || 'Backend import failed.');
        }
      } catch (err) {
        console.error("Import error:", err);
        setImportError(`Import failed: ${err.message}`);
      }
      setImportLoading(false);
    };

    reader.onerror = (err) => {
      console.error("File reading error:", err);
      setImportError('Failed to read the selected file.');
      setImportLoading(false);
    };

    reader.readAsBinaryString(selectedFile); // Read file as binary string for xlsx
  };

  // --- Selection Handlers ---
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = ingredients.map((n) => n._id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleRowCheckboxClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  // --- Bulk Delete Handler ---
  const handleBulkDelete = async () => {
    if (selected.length === 0) {
      setError("No ingredients selected for deletion.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${selected.length} selected ingredient(s)? This might affect existing recipes and cannot be undone.`)) {
        return;
    }
    setLoading(true); // Use general loading state for simplicity
    setError(''); // Clear previous errors
    try {
        // Send array of IDs in the request body
        const response = await apiClient.delete('/ingredients/bulk-delete', { data: { ids: selected } });

        if (response.data.success) {
            setImportSuccess(`${response.data.deletedCount || selected.length} ingredient(s) deleted successfully.`); // Use success message state
            setSelected([]); // Clear selection
            await refreshIngredients(); // Refresh the list (already clears selection)
        } else {
            // Error message might contain details about ingredients in use
            throw new Error(response.data.message || 'Failed to delete selected ingredients');
        }
    } catch (err) {
        console.error("Bulk delete error:", err);
        setError(err.response?.data?.message || `An error occurred while deleting ingredients.`);
        setLoading(false); // Ensure loading is false on error if refresh doesn't happen
    }
    // setLoading(false) will be handled by refreshIngredients on success
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
    <Container maxWidth="lg"> {/* Changed maxWidth for wider table */} 
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, mt: 3 }}>
        <Typography variant="h4" component="h1">
          Ingredient Management
        </Typography>
        <Box> {/* Wrap buttons */} 
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleOpenAddDialog}
            disabled={loading} // Disable button while loading
            sx={{ mr: 1 }} // Add margin if needed
          >
            Add Ingredient
          </Button>
          <Button
            variant="outlined"
            onClick={handleExportExcel}
            disabled={loading || ingredients.length === 0}
          >
            Export to Excel
          </Button>
        </Box>
      </Box>

      {/* Import Section */} 
      <Paper sx={{ p: 2, mb: 2 }}>
         <Typography variant="h6" gutterBottom>Import Ingredients from Excel</Typography>
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
             <Button
                 variant="outlined"
                 component="label" // Makes the button act like a label for the hidden input
                 startIcon={<FileUploadIcon />}
                 disabled={importLoading}
             >
                 Choose File
                 <input
                     id="ingredient-import-input" // Add id for clearing
                     type="file"
                     hidden
                     onChange={handleFileChange}
                     accept=".xlsx, .xls" // Accept Excel file types
                 />
             </Button>
             {selectedFile && <Typography variant="body2">{selectedFile.name}</Typography>}
             <Button
                 variant="contained"
                 onClick={handleImport}
                 disabled={!selectedFile || importLoading}
                 sx={{ minWidth: '150px' }} // Give button fixed width
             >
                 {importLoading ? <CircularProgress size={24} /> : 'Upload & Import'}
             </Button>
         </Box>
         {importSuccess && <Alert severity="success" sx={{ mt: 2 }}>{importSuccess}</Alert>}
         {importError && <Alert severity="error" sx={{ mt: 2 }}>{importError}</Alert>}
      </Paper>

      {/* General Error/Success Area */} 
      {error && !openDialog && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {importSuccess && <Alert severity="success" sx={{ mb: 2 }}>{importSuccess}</Alert>}
      {/* importError is shown within Import Paper */}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {/* Bulk Actions Toolbar - Shown when items are selected */} 
        {selected.length > 0 && (
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.lighter' }}>
                <Typography sx={{ ml: 2 }} variant="subtitle1">{selected.length} selected</Typography>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteSweepIcon />}
                  onClick={handleBulkDelete}
                  disabled={loading}
                >
                  Delete Selected
                </Button>
            </Box>
        )}

        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="sticky ingredient table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selected.length > 0 && selected.length < ingredients.length}
                    checked={ingredients.length > 0 && selected.length === ingredients.length}
                    onChange={handleSelectAllClick}
                    inputProps={{
                      'aria-label': 'select all ingredients',
                    }}
                  />
                </TableCell>
                <TableCell>Ingredient Name</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Cost per Unit (R)</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Updated By</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ingredients.length === 0 && !loading ? (
                 <TableRow>
                    {/* Update colSpan to include checkbox */}
                    <TableCell colSpan={8} align="center">
                        No ingredients found.
                    </TableCell>
                 </TableRow>
              ) : (
                ingredients.map((ingredient) => {
                  const isItemSelected = isSelected(ingredient._id);
                  const labelId = `ingredient-checkbox-${ingredient._id}`;

                  return (
                  <TableRow
                    hover
                    onClick={(event) => handleRowCheckboxClick(event, ingredient._id)} // Allow clicking row to select
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={ingredient._id}
                    selected={isItemSelected}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        inputProps={{
                          'aria-labelledby': labelId,
                        }}
                      />
                    </TableCell>
                    <TableCell component="th" id={labelId} scope="row">
                      {ingredient.ingredientName}
                    </TableCell>
                    <TableCell>{ingredient.unit}</TableCell>
                    <TableCell align="right">{ingredient.costPerUnit?.toFixed(2) ?? 'N/A'}</TableCell>
                    <TableCell>{ingredient.supplier || '-'}</TableCell>
                    <TableCell>{ingredient.updatedAt ? new Date(ingredient.updatedAt).toLocaleString() : 'N/A'}</TableCell>
                    <TableCell>{ingredient.updatedBy?.username || 'N/A'}</TableCell>
                    <TableCell align="center">
                       {/* Keep individual actions, maybe disable if bulk selected? */}
                       <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(ingredient); }} title="Edit" disabled={loading}>
                         <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteIngredient(ingredient._id); }} title="Delete" disabled={loading}>
                         <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )}) // End map function
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
          <TextField
            margin="dense"
            id="supplier"
            name="supplier"
            label="Supplier (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={currentIngredient.supplier}
            onChange={handleDialogInputChange}
            disabled={loading}
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