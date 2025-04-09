import { createTheme } from "@mui/material/styles";

// A basic theme instance.
const theme = createTheme({
  palette: {
    mode: "light", // Can be 'light' or 'dark'
    primary: {
      main: "#1976d2", // Blue
    },
    secondary: {
      main: "#dc004e", // Pink
    },
    background: {
      default: "#f4f6f8", // Light grey background
      paper: "#ffffff", // White for paper elements like cards
    },
    // Add more customizations here (typography, components, etc.)
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 500,
    },
    // Define other variants as needed
  },
  // You can override default component styles here
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none", // Buttons won't be ALL CAPS
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid #e0e0e0",
        },
      },
    },
  },
});

export default theme;
