import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createTheme, ThemeProvider } from '@mui/material/styles';
import App from './app/page';

const theme = createTheme({
  palette: {
    primary: {
      main: '#000', // your navbar color
    },
    secondary: {
      main: '#fff', // your text color
      contrastText: '#000', // text color on secondary background
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
