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
    <Container maxWidth={false} sx={{ width: '100%', backgroundColor: '#000', padding: 0, mt: 8 }}> 
      <Box 
      sx={{ 
        flexGrow: 1,
        backgroundColor: '#000',
        paddingTop: 5,}}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }} sx={{background: '#000'}}>
          <Item sx={{background: '#000'}}>
            <Grid container spacing={2} sx={{background: '#000'}}>
                <Grid size={{ xs: 12, md: 6 }} sx={{background: '#000'}}>
                    <Box
                        component="img"
                        src="/images/logo.jpg"
                        alt="About Us"
                        sx={{
                            width: '90%',
                            height: 'auto',
                            maxHeight: '80vh',
                            objectFit: 'contain',
                            display: 'block',
                        }}
                        />
                    </Grid>
              <Grid size={{ xs: 12, md: 6 }}
                    sx={{
                        display: 'flex',
                        JustifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '100%',
                        background: '#000',
                        padding: 2,
                    }}>
                <h1 style={{
                  color: '#ffffff',
                  textAlign: 'left',
                  fontSize: '2rem',
                  paddingLeft: 10,
                  paddingRight: 10,
                }}>The Barbs Bro
                </h1>
              </Grid>
            </Grid>
          </Item>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Item
          sx={{
            width: '100%',
            paddingTop: 3,
            paddingLeft: 5,
            paddingRight: 5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'left',
            alignItems: 'left',
            backgroundColor: '#000',
            borderLeft: '1px solid #ffffff',
            borderRight: '1px solid #ffffff',
          }}>
            <h1 style={{ 
              color: '#ffffff',
              textAlign: 'left',
              fontSize: '1.8rem',
              marginTop: 0,
            }}>Contact Info
            </h1>
            <h3 style={{ 
              color: '#ffffff',
              textAlign: 'left',
              fontSize: '1.8rem',
              marginTop: 0,
            }}>
              Unit F, Saranay Homes, Congressional Rd. cor Malapitan Rd. Caloocan
            </h3>
            <Box sx={{ display: 'flex', justifyContent: 'left', }}> 
                <a href="https://www.facebook.com/thebarbsbro" target="_blank" rel="noopener noreferrer">
                    <img src="/facebook.svg" alt="Facebook" style={{ width: 40, height: 40, marginRight: 20 }} />
                </a>
                <a href="https://www.tiktok.com/@thebarbsbro" target="_blank" rel="noopener noreferrer">
                    <img src="/tiktok.svg" alt="TikTok" style={{ width: 42, height: 42, marginRight: 20 }} />
                </a>
                <a href="https://www.instagram.com/thebarbsbro/" target="_blank" rel="noopener noreferrer">
                    <img src="/instagram.svg" alt="Instagram" style={{ width: 40, height: 40 }} />
                </a>
            </Box>
          </Item>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Item
          sx={{
            width: '100%',
            paddingTop: 3,
            paddingLeft: 5,
            paddingRight: 5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'left',
            alignItems: 'left',
            backgroundColor: '#000',
          }}>
            <h1 style={{ 
              color: '#ffffff',
              textAlign: 'left',
              fontSize: '1.8rem',
              margin: '0 0 0 0',
            }}>Operating Hours
            </h1>
            <h3 style={{ 
              color: '#ffffff',
              textAlign: 'left',
              fontSize: '1.6rem',
              margin: '4px 0 0 0',
            }}>Monday - Sunday
            </h3>
            <h3 style={{ 
              color: '#ffffff',
              textAlign: 'left',
              fontSize: '1.6rem',
              margin: '4px 0 0 0',
            }}>10:00 AM - 8:00 PM
            </h3>
          </Item>
        </Grid>

        <Grid size={{ xs: 12, md: 12 }} sx={{background: '#000'}}>
          <Item sx={{background: '#000'}}>
            <h1 style={{ 
              color: '#ffffff',
              textAlign: 'center',
              fontSize: '1.3rem',
              margin: 0,
              padding: '10px 0',
              borderTop: '0.5px solid #ffffff',
            }}>Copyright © 2024 The Barbs Bro. All rights reserved.
            </h1>
          </Item>
        </Grid>
      </Grid>
    </Box>
    </Container>
  );
}