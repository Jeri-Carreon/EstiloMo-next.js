'use client';

import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
/*import FacebookIcon from './facebook.svg';
import TikTokIcon from './tiktok.svg';
import InstagramIcon from './instagram.svg';
*/

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
  boxShadow: 'none',
}));

export default function BasicGrid() {
  return (
    <Container>
      <Box 
      sx={{ 
        flexGrow: 1,
        backgroundColor: '#ffffff',
        paddingTop: 5,
        mt: 8,}}>
      <Grid container spacing={0}>
        <Grid size={{ xs: 12, md: 12 }}>
          <Item>
            <h1 style={{ 
              color: '#000000',
              textAlign: 'left',
              fontSize: '4rem',
              margin: 0,
            }}>Contact Us!
            </h1>
          </Item>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Item>
            <h1 style={{ 
              color: '#000000',
              textAlign: 'left',
              fontSize: '3rem',
              marginTop: 20,
            }}>Location
            </h1>
            <h1 style={{
              color: '#000000',
              textAlign: 'left',
              fontSize: '1.5rem',
              marginTop: 0,
            }}>
              Unit F, Saranay Homes, Congressional Rd. cor Malapitan Rd. Caloocan
            </h1>
            <h1 style={{ 
              color: '#000000',
              textAlign: 'left',
              fontSize: '3rem',
              marginTop: 40,
            }}>Follow Us!
            </h1>
            <Box sx={{ display: 'flex', justifyContent: 'left', }}>
                <a href="https://www.facebook.com/thebarbsbro" target="_blank" rel="noopener noreferrer">
                    <img src="/facebook.svg" alt="Facebook" style={{ width: 50, height: 50, marginRight: 20 }} />
                </a>
                <a href="https://www.tiktok.com/@thebarbsbro" target="_blank" rel="noopener noreferrer">
                    <img src="/tiktok.svg" alt="TikTok" style={{ width: 50, height: 50, marginRight: 20 }} />
                </a>
                <a href="https://www.instagram.com/thebarbsbro/" target="_blank" rel="noopener noreferrer">
                    <img src="/instagram.svg" alt="Instagram" style={{ width: 50, height: 50 }} />
                </a>
            </Box>
          </Item>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Item>
            <h1 style={{ 
              color: '#000000',
              textAlign: 'left',
              fontSize: '3rem',
              margin: 0,
              marginTop: 20,
            }}>Contact Form
            </h1>
            <Box
                component="form"
                sx={{ '& > :not(style)': { m: 1, width: '100%' } }}
                Validate
                autoComplete="off"
                >
                    // Add Input Validation and Form Handling Logic Here
                <TextField id="outlined-basic" label="Enter Your Name" variant="outlined" />
                <TextField id="outlined-basic" label="Enter Your Email" variant="outlined" />
                <TextField id="outlined-basic" label="Enter Your Message" variant="outlined" multiline rows={4} />

                <Box sx={{ display: 'flex', justifyContent: 'left', mt: 1 }}>
                    <Button variant="contained" color="secondary" size="large" sx={{
                        width: {
                        xs: '100%', // width on small screens
                        sm: '100%',  // width on medium screens
                        md: '30%',  // width on large screens
                        },
                        p: 1,
                        borderRadius: 10,
                        fontSize: '1.2rem',
                        textTransform: 'none', // to keep the text as it is without uppercase
                        '&:hover': {
                                backgroundColor: 'accent.main',
                                },
                    }}>
                        Submit
                    </Button>
                </Box>
  
            </Box>
          </Item>
        </Grid>
        </Grid>
        
    </Box>
    </Container>
  );
}

