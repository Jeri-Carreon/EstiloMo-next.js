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
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import CloseIcon from '@mui/icons-material/Close';

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

interface ContactUsMessage {
  id: string;
  name: string;
  email: string;
  message: string;
}

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

      showStatusModal(
        'Success',
        'Your message has been sent successfully!'
      );
    } catch (error) {
      showStatusModal('Error', 'Something went wrong.');
    }
  };

  const handleReviewMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    // EMPTY FIELD VALIDATION
    if (
      !trimmedName ||
      !trimmedEmail ||
      !trimmedMessage
    ) {
      showStatusModal(
        'Incomplete Fields',
        'Please fill in all fields before continuing.'
      );
      return;
    }

    // EMAIL VALIDATION
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      showStatusModal(
        'Invalid Email',
        'Please enter a valid email address.'
      );
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
          backgroundColor: '#ffffff',
          paddingTop: 5,
          mt: 8,
        }}
      >
        <Grid container spacing={0}>
          {/* HEADER */}
          <Grid size={{ xs: 12, md: 12 }}>
            <Item>
              <h1
                style={{
                  color: '#000000',
                  textAlign: 'left',
                  fontSize: '4rem',
                  fontFamily:
                    'var(--font-nunito-sans)',
                  margin: 0,
                }}
              >
                Contact Us!
              </h1>
            </Item>
          </Grid>

          {/* LEFT SIDE */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Item>
              <h1
                style={{
                  color: '#000000',
                  textAlign: 'left',
                  fontSize: '3rem',
                  fontFamily:
                    'var(--font-nunito-sans)',
                  marginTop: 20,
                }}
              >
                Location
              </h1>

              <h1
                style={{
                  color: '#000000',
                  textAlign: 'left',
                  fontSize: '1.5rem',
                  fontFamily:
                    'var(--font-nunito-sans)',
                  marginTop: 0,
                }}
              >
                Unit F, Saranay Homes,
                Congressional Rd. cor
                Malapitan Rd. Caloocan
              </h1>

              <h1
                style={{
                  color: '#000000',
                  textAlign: 'left',
                  fontSize: '3rem',
                  fontFamily:
                    'var(--font-nunito-sans)',
                  marginTop: 40,
                }}
              >
                Follow Us!
              </h1>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'left',
                }}
              >
                <a
                  href="https://www.facebook.com/thebarbsbro"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src="/facebook.svg"
                    alt="Facebook"
                    style={{
                      width: 50,
                      height: 50,
                      marginRight: 20,
                    }}
                  />
                </a>

                <a
                  href="https://www.tiktok.com/@thebarbsbro"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src="/tiktok.svg"
                    alt="TikTok"
                    style={{
                      width: 50,
                      height: 50,
                      marginRight: 20,
                    }}
                  />
                </a>

                <a
                  href="https://www.instagram.com/thebarbsbro/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src="/instagram.svg"
                    alt="Instagram"
                    style={{
                      width: 50,
                      height: 50,
                    }}
                  />
                </a>
              </Box>
            </Item>
          </Grid>

          {/* RIGHT SIDE */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Item>
              <h1
                style={{
                  color: '#000000',
                  textAlign: 'left',
                  fontSize: '3rem',
                  fontFamily:
                    'var(--font-nunito-sans)',
                  margin: 0,
                  marginTop: 20,
                }}
              >
                Contact Form
              </h1>

              <Box
                component="form"
                sx={{
                  '& > :not(style)': {
                    m: 1,
                    width: '100%',
                  },
                }}
                autoComplete="off"
                onSubmit={handleReviewMessage}
              >
                {/* NAME */}
                <TextField
                  label="Enter Your Name"
                  placeholder="Juan Dela Cruz"
                  variant="outlined"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  slotProps={{
                    htmlInput: {
                      maxLength: 100,
                    },
                  }}
                />

                {/* EMAIL */}
                <TextField
                  label="Enter Your Email"
                  placeholder="juandelacruz@gmail.com"
                  variant="outlined"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  error={
                    email.length > 0 &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                      email.trim()
                    )
                  }
                  helperText={
                    email.length > 0 &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                      email.trim()
                    )
                      ? 'Please enter a valid email address'
                      : ''
                  }
                  slotProps={{
                    htmlInput: {
                      maxLength: 254,
                    },
                  }}
                />

                {/* MESSAGE */}
                <TextField
                  label="Enter Your Message"
                  placeholder="Enter Your Message"
                  variant="outlined"
                  multiline
                  rows={4}
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  slotProps={{
                    htmlInput: {
                      maxLength: 1000,
                    },
                  }}
                />

                {/* BUTTON */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'left',
                    mt: 1,
                  }}
                >
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    type="submit"
                    sx={{
                      width: {
                        xs: '100%',
                        sm: '100%',
                        md: '30%',
                      },
                      p: 1,
                      borderRadius: 10,
                      fontSize: '1.2rem',
                      textTransform: 'none',
                      fontFamily:
                        'var(--font-nunito-sans)',
                      '&:hover': {
                        backgroundColor:
                          'accent.main',
                      },
                    }}
                  >
                    Submit
                  </Button>
                </Box>
              </Box>
            </Item>
          </Grid>
        </Grid>
      </Box>

      {/* STATUS MODAL */}
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
          {/* HEADER */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700 }}
              >
                {statusTitle}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Contact Us
              </Typography>
            </Box>

            <IconButton
              onClick={() => setOpenStatusModal(false)}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* CONTENT */}
          <DialogContent sx={{ p: 0 }}>
            <Typography
              sx={{
                mb: 1,
                color: '#333',
              }}
            >
              {statusMessage}
            </Typography>
          </DialogContent>

          {/* BUTTON */}
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