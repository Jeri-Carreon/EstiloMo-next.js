'use client';

import { FormEvent, useState } from 'react';

import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EmailIcon from '@mui/icons-material/Email';
import PublicIcon from '@mui/icons-material/Public';

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

export default function ContactUsLanding() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [statusTitle, setStatusTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const showStatusModal = (title: string, message: string) => {
    setStatusTitle(title);
    setStatusMessage(message);
    setOpenStatusModal(true);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setMessage('');
  };

  const handleCreateMessage = async ({
    name,
    email,
    message,
  }: {
    name: string;
    email: string;
    message: string;
  }) => {
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          message,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        showStatusModal('Error', 'No message returned from server');
        return;
      }

      resetForm();
      showStatusModal('Success', 'Your message has been sent successfully!');
    } catch (error) {
      showStatusModal('Error', 'Something went wrong.');
    }
  };

  const handleReviewMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      showStatusModal(
        'Incomplete Fields',
        'Please fill in all fields before continuing.'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      showStatusModal('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    handleCreateMessage({
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
    });
  };

  return (
    <Container>
      <Box
        sx={{
          flexGrow: 1,
          backgroundColor: '#fff',
          pt: 1,
          mt: 2,
          pb: 4,
        }}
      >
        <Typography
          sx={{
            color: '#000',
            textAlign: 'left',
            fontSize: '2.2rem',
            fontFamily: 'var(--font-nunito-sans)',
            fontWeight: 800,
            mb: 1,
          }}
        >
          Contact Us!
        </Typography>

        <Divider
          sx={{
            width: 80,
            height: 3,
            backgroundColor: '#000',
            mb: 4,
          }}
        />

        <Grid
          container
          spacing={5}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          <Grid size={{ xs: 12, md: 6 }}>
            <Item>
              <Box
                sx={{
                  textAlign: 'left',
                  pr: { xs: 0, md: 4 },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <LocationOnIcon sx={{ color: '#000', fontSize: 28 }} />

                  <Typography
                    sx={{
                      color: '#000',
                      fontSize: '1.65rem',
                      fontFamily: 'var(--font-nunito-sans)',
                      fontWeight: 800,
                    }}
                  >
                    Location
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    color: '#000',
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    fontFamily: 'var(--font-nunito-sans)',
                    fontWeight: 500,
                    mb: 4,
                    maxWidth: 520,
                  }}
                >
                  Unit F, Saranay Homes
                  <br />
                  Congressional Rd. cor Malapitan Rd.
                  <br />
                  Caloocan City
                </Typography>

                <Divider
                  sx={{
                    width: 220,
                    mb: 4,
                    borderColor: '#d0d0d0',
                  }}
                />

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <PublicIcon sx={{ color: '#000', fontSize: 28 }} />

                  <Typography
                    sx={{
                      color: '#000',
                      fontSize: '1.65rem',
                      fontFamily: 'var(--font-nunito-sans)',
                      fontWeight: 800,
                    }}
                  >
                    Follow Us
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Box
                    component="a"
                    href="https://www.facebook.com/thebarbsbro"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'inline-flex',
                      transition: '0.25s',
                      '&:hover': {
                        transform: 'translateY(-4px) scale(1.08)',
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src="/facebook.svg"
                      alt="Facebook"
                      sx={{ width: 38, height: 38 }}
                    />
                  </Box>

                  <Box
                    component="a"
                    href="https://www.tiktok.com/@thebarbsbro"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'inline-flex',
                      transition: '0.25s',
                      '&:hover': {
                        transform: 'translateY(-4px) scale(1.08)',
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src="/tiktok.svg"
                      alt="TikTok"
                      sx={{ width: 38, height: 38 }}
                    />
                  </Box>

                  <Box
                    component="a"
                    href="https://www.instagram.com/thebarbsbro/"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'inline-flex',
                      transition: '0.25s',
                      '&:hover': {
                        transform: 'translateY(-4px) scale(1.08)',
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src="/instagram.svg"
                      alt="Instagram"
                      sx={{ width: 38, height: 38 }}
                    />
                  </Box>
                </Box>
              </Box>
            </Item>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: { xs: 2.5, md: 4 },
                borderRadius: 4,
                backgroundColor: '#fff',
                boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3,
                }}
              >
                <EmailIcon sx={{ color: '#000', fontSize: 28 }} />

                <Typography
                  sx={{
                    color: '#000',
                    textAlign: 'left',
                    fontSize: '1.65rem',
                    fontFamily: 'var(--font-nunito-sans)',
                    fontWeight: 800,
                  }}
                >
                  Contact Form
                </Typography>
              </Box>

              <Box
                component="form"
                sx={{
                  width: '100%',
                  '& .MuiTextField-root': {
                    mb: 2,
                  },
                }}
                autoComplete="off"
                onSubmit={handleReviewMessage}
              >
                <TextField
                  fullWidth
                  size="small"
                  label="Enter Your Name"
                  placeholder="Juan Dela Cruz"
                  variant="outlined"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  slotProps={{
                    htmlInput: {
                      maxLength: 100,
                    },
                  }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Enter Your Email"
                  placeholder="juandelacruz@gmail.com"
                  variant="outlined"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={
                    email.length > 0 &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                  }
                  helperText={
                    email.length > 0 &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                      ? 'Please enter a valid email address'
                      : ''
                  }
                  slotProps={{
                    htmlInput: {
                      maxLength: 254,
                    },
                  }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Enter Your Message"
                  placeholder="Enter Your Message"
                  variant="outlined"
                  multiline
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  slotProps={{
                    htmlInput: {
                      maxLength: 1000,
                    },
                  }}
                />

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'left',
                    mt: 1,
                  }}
                >
                  <Button
                    variant="contained"
                    type="submit"
                    sx={{
                      width: {
                        xs: '100%',
                        sm: '100%',
                        md: '32%',
                      },
                      py: 0.9,
                      borderRadius: 10,
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      fontFamily: 'var(--font-nunito-sans)',
                      backgroundColor: '#000',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      '&:hover': {
                        backgroundColor: '#111',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                      },
                    }}
                  >
                    Submit
                  </Button>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Dialog
        open={openStatusModal}
        onClose={() => setOpenStatusModal(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 4,
            bgcolor: '#f2f2f2',
            overflow: 'visible',
          },
        }}
      >
        <Box
          sx={{
            m: 2,
            bgcolor: '#fff',
            borderRadius: 4,
            p: 3,
            pb: 2,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {statusTitle}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Contact Us
              </Typography>
            </Box>

            <IconButton onClick={() => setOpenStatusModal(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 0 }}>
            <Typography sx={{ mb: 1, color: '#333' }}>
              {statusMessage}
            </Typography>
          </DialogContent>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mt: 4,
              mb: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={() => setOpenStatusModal(false)}
              sx={{
                backgroundColor: '#000',
                color: '#fff',
                textTransform: 'none',
                minWidth: 120,
                py: 1.25,
                ':hover': {
                  backgroundColor: '#111',
                },
              }}
            >
              OK
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Container>
  );
}