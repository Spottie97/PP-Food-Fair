import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  recipes: [],
  currentRecipe: null,
  ingredients: [],
  loading: false,
  error: null,
};

const pieSlice = createSlice({
  name: "pie",
  initialState,
  reducers: {
    setRecipes: (state, action) => {
      state.recipes = action.payload;
    },
    setCurrentRecipe: (state, action) => {
      state.currentRecipe = action.payload;
    },
    setIngredients: (state, action) => {
      state.ingredients = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    updateRecipe: (state, action) => {
      const index = state.recipes.findIndex(
        (recipe) => recipe._id === action.payload._id
      );
      if (index !== -1) {
        state.recipes[index] = action.payload;
      }
      if (state.currentRecipe?._id === action.payload._id) {
        state.currentRecipe = action.payload;
      }
    },
    addRecipe: (state, action) => {
      state.recipes.push(action.payload);
    },
    deleteRecipe: (state, action) => {
      state.recipes = state.recipes.filter(
        (recipe) => recipe._id !== action.payload
      );
      if (state.currentRecipe?._id === action.payload) {
        state.currentRecipe = null;
      }
    },
  },
});

export const {
  setRecipes,
  setCurrentRecipe,
  setIngredients,
  setLoading,
  setError,
  updateRecipe,
  addRecipe,
  deleteRecipe,
} = pieSlice.actions;

export default pieSlice.reducer;
