'use client';

import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Container from '@mui/material/Container';

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
        paddingTop: 5,}}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Item>
            <h1 style={{ 
              color: '#000000',
              textAlign: 'left',
              fontSize: '3rem',
              fontFamily: 'var(--font-nunito-sans)',
            }}>About Us
            </h1>
            <h2 style={{
              color: '#000000',
              textAlign: 'justify',
              fontSize: '1.5rem',
              textIndent: '3em',
              fontFamily: 'var(--font-nunito-sans)',
            }}>
              Founded in July 2022, The Barbs Bro is a neighborhood barbershop built on skill, consistency, 
              and straight-up quality service. You’ll find us at Unit F, Saranay Homes, Congressional Road 
              corner Malapitan Road, Caloocan City—serving men who take their hair seriously.
            </h2>
            <h2 style={{
              color: '#000000',
              textAlign: 'justify',
              fontSize: '1.5rem',
              textIndent: '3em',
              fontFamily: 'var(--font-nunito-sans)',
            }}>
              Owned and managed by Mr. Carlo Glenn Yoldi, The Barbs Bro runs with a tight team: one receptionist 
              keeping appointments in check and four experienced barbers handling the daily grind. From clean, 
              classic cuts to bold hair color and bleaching treatments, we make sure every client walks out looking sharp and confident.
              </h2>
          </Item>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Item
          sx={{
            width: '100%',
            padding: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Box
              component="img"
              src="/images/AboutUs1.jpg"
              alt="About Us"
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '90vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Item>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Item
          sx={{
            width: '100%',
            padding: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Box
              component="img"
              src="/images/AboutUs2.jpg"
              alt="Barbershop"
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Item>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Item>
            <h2 style={{
              color: '#000000',
              textAlign: 'justify',
              fontSize: '1.5rem',
              textIndent: '3em',
              fontFamily: 'var(--font-nunito-sans)',
            }}>
                        What started as a hole in the wall business with just 3 barber chairs and a cramped working 
                        area, slowly gained traction and popularity within the community. 
            </h2>
            <h2 style={{
              color: '#000000',
              textAlign: 'justify',
              fontSize: '1.5rem',
              textIndent: '3em',
              fontFamily: 'var(--font-nunito-sans)',
            }}>
              Through the dedication and skills of our barbers the business continued to grow, and on October 7, 
              2024, The Barbs Bro relocated to a bigger space just above the old barbershop, following a relocation 
              to better serve its customers and improve the overall shop experience.
              </h2>
              <h2 style={{
              color: '#000000',
              textAlign: 'justify',
              fontSize: '1.5rem',
              textIndent: '3em',
              fontFamily: 'var(--font-nunito-sans)',
            }}>
              At The Barbs Bro, it’s simple: good cuts, solid service, no shortcuts.
              </h2>
          </Item>
        </Grid>
        <Grid size={{ xs: 12, md: 12 }}>
          <Item
          sx={{
            width: '100%',
            padding: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Box
              component="img"
              src="/images/AboutUs3.jpg"
              alt="About Us"
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '80vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Item>
        </Grid>

      </Grid>
    </Box>
    </Container>
  );
}