'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [fullName, setFullName] = useState('');

  const [savedProfile, setSavedProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
  });

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setAuthLoading(false);
      setLoading(true);

      try {
        const res = await fetch('/api/profile');

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to load profile');
          return;
        }

        const data = await res.json();
        const u = data.user;

        const first = u.firstName || '';
        const last = u.lastName || '';

        setFirstName(first);
        setLastName(last);
        setEmail(u.email || '');
        setMobileNumber(u.mobileNumber || '');
        setFullName(`${first} ${last}`.trim() || u.email || 'User');

        setSavedProfile({
          firstName: first,
          lastName: last,
          email: u.email || '',
          mobileNumber: u.mobileNumber || '',
        });
      } catch {
        setError('Unable to load profile information');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');

      if (!/^09\d{9}$/.test(mobileNumber)) {
        setError(
          'Mobile number must start with 09 and contain exactly 11 digits.'
        );
        return;
      }

      setLoading(true);

      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, mobileNumber }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update profile');
        return;
      }

      const data = await res.json();
      const u = data.user;

      setSavedProfile({
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        mobileNumber: u.mobileNumber || '',
      });

      setFirstName(u.firstName || '');
      setLastName(u.lastName || '');
      setEmail(u.email || '');
      setMobileNumber(u.mobileNumber || '');
      setFullName(`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User');

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch {
      setError('An error occurred while updating your profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFirstName(savedProfile.firstName);
    setLastName(savedProfile.lastName);
    setEmail(savedProfile.email);
    setMobileNumber(savedProfile.mobileNumber);
    setError('');
    setSuccess('');
    setIsEditing(false);
  };

  const handleMobileChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');

    if (digitsOnly.length <= 11) {
      setMobileNumber(digitsOnly);
    }
  };

  if (authLoading || loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const mobileInvalid =
    isEditing && mobileNumber.length > 0 && !/^09\d{9}$/.test(mobileNumber);

  return (
    <>
      <Navbar />

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ flex: 1, maxWidth: 720 }}>
            <Paper
              sx={{
                p: 3,
                border: '1px solid #ddd',
                backgroundColor: '#fff',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 4,
                  pb: 3,
                  borderBottom: '1px solid #eee',
                }}
              >
                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      fontFamily: 'var(--font-nunito-sans)',
                      fontWeight: 700,
                      color: '#111',
                    }}
                  >
                    {fullName || 'User'}
                  </Box>

                  <Box
                    sx={{
                      fontSize: 13,
                      fontFamily: 'var(--font-nunito-sans)',
                      color: '#888',
                      mt: 0.5,
                    }}
                  >
                    {email}
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  onClick={() =>
                    isEditing ? handleCancel() : setIsEditing(true)
                  }
                  sx={{
                    backgroundColor: isEditing ? '#ff9800' : '#e0e0e0',
                    color: '#111',
                    fontFamily: 'var(--font-nunito-sans)',
                    textTransform: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: isEditing ? '#e68900' : '#d0d0d0',
                    },
                  }}
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              <Stack spacing={3}>
                <Box>
                  <Box sx={labelSx}>First Name</Box>
                  <TextField
                    fullWidth
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    variant="outlined"
                    disabled={!isEditing}
                    sx={fieldSx(isEditing)}
                  />
                </Box>

                <Box>
                  <Box sx={labelSx}>Last Name</Box>
                  <TextField
                    fullWidth
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    variant="outlined"
                    disabled={!isEditing}
                    sx={fieldSx(isEditing)}
                  />
                </Box>

                <Box>
                  <Box sx={labelSx}>Mobile Number</Box>
                  <TextField
                    fullWidth
                    value={mobileNumber}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    variant="outlined"
                    disabled={!isEditing}
                    placeholder="09XXXXXXXXX"
                    slotProps={{
                      htmlInput: {
                        maxLength: 11,
                        inputMode: 'numeric',
                        pattern: '09[0-9]{9}',
                      },
                    }}
                    error={mobileInvalid}
                    helperText={
                      mobileInvalid
                        ? 'Mobile number must start with 09 and contain 11 digits'
                        : ''
                    }
                    sx={fieldSx(isEditing)}
                  />
                </Box>

                <Box>
                  <Box sx={labelSx}>Email Address</Box>
                  <TextField
                    fullWidth
                    value={email}
                    variant="outlined"
                    disabled
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#e8e8e8',
                      },
                      '& .MuiInputBase-input': {
                        color: '#000',
                      },
                    }}
                  />
                </Box>

                {isEditing && (
                  <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={loading}
                      sx={{
                        backgroundColor: '#4CAF50',
                        color: '#fff',
                        textTransform: 'none',
                        fontFamily: 'var(--font-nunito-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                        '&:hover': { backgroundColor: '#45a049' },
                      }}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={loading}
                      sx={{
                        border: '1px solid #ddd',
                        color: '#666',
                        textTransform: 'none',
                        fontFamily: 'var(--font-nunito-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                        '&:hover': { backgroundColor: '#f9f9f9' },
                      }}
                    >
                      Discard
                    </Button>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Container>

      <Footer />
    </>
  );
}

const labelSx = {
  fontSize: 13,
  fontFamily: 'var(--font-nunito-sans)',
  fontWeight: 600,
  mb: 1,
  color: '#333',
};

const fieldSx = (isEditing: boolean) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: isEditing ? '#fff' : '#e8e8e8',
  },
  '& .MuiInputBase-input': {
    color: '#000',
  },
});