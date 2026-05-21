'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        width: '100%',
        backgroundColor: '#000',
        mt: 8,
        pt: 5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          backgroundColor: '#000',
        }}
      >
        {/* Logo Section */}
        <Box
          sx={{
            width: { xs: '100%', md: '33.33%' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            px: 3,
          }}
        >
          <Box
            component="img"
            src="/images/logo.jpg"
            alt="The Barbs Bro Logo"
            sx={{
              width: '45%',
              maxWidth: 170,
              height: 'auto',
              objectFit: 'contain',
            }}
          />

          <Typography
            sx={{
              color: '#fff',
              fontSize: '2rem',
              fontFamily: 'var(--font-nunito-sans)',
              fontWeight: 700,
              ml: 2,
            }}
          >
            The Barbs Bro
          </Typography>
        </Box>

        {/* Contact Info */}
        <Box
          sx={{
            width: { xs: '100%', md: '33.33%' },
            backgroundColor: '#000',
            borderLeft: { xs: 'none', md: '1px solid #ffffff' },
            borderRight: { xs: 'none', md: '1px solid #ffffff' },
            px: 5,
            pt: 3,
            pb: 3,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontSize: '1.8rem',
              fontFamily: 'var(--font-nunito-sans)',
              fontWeight: 700,
              mb: 1,
            }}
          >
            Contact Info
          </Typography>

          <Typography
            sx={{
              color: '#fff',
              fontSize: '1.8rem',
              fontFamily: 'var(--font-nunito-sans)',
              fontWeight: 600,
              mb: 2,
            }}
          >
            Unit F, Saranay Homes, Congressional Rd. cor Malapitan Rd. Caloocan
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
        </Box>

        {/* Operating Hours */}
        <Box
          sx={{
            width: { xs: '100%', md: '33.33%' },
            backgroundColor: '#000',
            px: 5,
            pt: 3,
            pb: 3,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontSize: '1.8rem',
              fontFamily: 'var(--font-nunito-sans)',
              fontWeight: 700,
              mb: 1,
            }}
          >
            Operating Hours
          </Typography>

          <Typography
            sx={{
              color: '#fff',
              fontSize: '1.6rem',
              fontFamily: 'var(--font-nunito-sans)',
              fontWeight: 600,
              mb: 0.5,
            }}
          >
            Monday - Sunday
          </Typography>

          <Typography
            sx={{
              color: '#fff',
              fontSize: '1.6rem',
              fontFamily: 'var(--font-nunito-sans)',
              fontWeight: 600,
            }}
          >
            10:00 AM - 8:00 PM
          </Typography>
        </Box>
      </Box>

      {/* Copyright */}
      <Box
        sx={{
          backgroundColor: '#000',
          borderTop: '0.5px solid #ffffff',
          mt: 2,
          py: 1.5,
        }}
      >
        <Typography
          sx={{
            color: '#ffffff',
            textAlign: 'center',
            fontSize: '1.2rem',
            fontFamily: 'var(--font-nunito-sans)',
            fontWeight: 700,
          }}
        >
          Copyright © 2024 The Barbs Bro. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}