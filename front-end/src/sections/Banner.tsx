import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';


export default function Banner() {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        backgroundImage: 'url(/images/banner.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        color: 'white',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h1" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-nunito-sans)', }}>
          The Barbs Bro
        </Typography>

        <Typography variant="h5" sx={{ mt: 5, fontFamily: 'var(--font-nunito-sans)', }}>
          Sharp Cuts. Solid Confidence. We provide quality and affordable haircuts and services. The Barbs Bro. Undeniable excellence.
        </Typography>

        {// spacing is for spacing between buttons, direction is for the direction of the buttons and sx is for styling the buttons, mt is for margin top
        }
        <Stack spacing={2} direction="column" 
          sx={{ 
            mt: 2, 
            width: {
              xs: '80%', // full width on small screens
              sm: '60%',  // 80% width on medium screens
              md: '40%',  // 60% width on large screens
            }
            }}>
          <Button variant="contained" color="secondary" size="large" sx={{
            fontSize: '1.1rem', 
            borderRadius: 10,
            width: '80%', 
            textTransform: 'none',
            '&:hover': {
            backgroundColor: 'accent.main',}, 
            fontFamily: 'var(--font-nunito-sans)',
          }}
          href="/appointment"
          >
            Book An Appointment!
          </Button>          
          <Button variant="contained" color="secondary" size="large" 
          sx={{ 
            fontSize: '1.1rem', 
            borderRadius: 10,
            width: '80%', 
            textTransform: 'none',
            '&:hover': {
            backgroundColor: 'accent.main',}, 
            fontFamily: 'var(--font-nunito-sans)',
          }}
          href="/download"
          >
            Download Our App
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}