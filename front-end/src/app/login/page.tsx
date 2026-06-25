'use client';

import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

import OutlinedInput from "@mui/material/OutlinedInput";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

import { createClient } from '@/lib/supabase/client'
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg("")
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("LOGIN ERROR:", error);

      const message = error.message.toLowerCase();

      if (message.includes('supabase browser client is not configured')) {
        setErrorMsg("Login is not configured on this deployment. Please check the Supabase build environment variables.")
      } else if (message.includes('email not confirmed')) {
        setErrorMsg("Please confirm your email address before logging in.")
      } else if (message.includes('locked') || message.includes('too many')) {
        setErrorMsg("You have been locked out. Try again after 1 minute.")
      } else {
        setErrorMsg("Invalid email or password")
      }
      setLoading(false)
      return
    }

    // Wait for session to be available before calling the API
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      setErrorMsg("Login failed. Please try again.")
      setLoading(false)
      return
    }

    // Now session cookie is set — safe to call the role API
    const res = await fetch('/api/user/role')

    if (!res.ok) {
      setErrorMsg("Failed to load user info. Please try again.")
      setLoading(false)
      return
    }

    const user = await res.json()

    if (user.role !== 'CUSTOMER') {
      router.push('/admin/dashboard')
    } else {
      router.push('/customerHome')
    }
  }

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 500,
          p: 4,
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        <h1 style={{
          color: "#000",
          fontSize: "2.5rem",
          marginBottom: "1rem",
        }}>
          Welcome!
        </h1>

        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            label={
              <>
                Enter Your Email <span style={{ color: 'red' }}>*</span>
              </>
            }
            variant="outlined"
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />

          {errorMsg && (
            <p style={{ color: "red", margin: "4px 0 0 0", fontSize: "0.9rem" }}>
              {errorMsg}
            </p>
          )}

          <FormControl fullWidth variant="outlined">
            <InputLabel>
              Enter Your Password <span style={{ color: "red" }}>*</span>
            </InputLabel>

            <OutlinedInput
              type={showPassword ? "text" : "password"}
              onChange={(e) => setPassword(e.target.value)}
              label="Enter Your Password"
              endAdornment={
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              }
            />
          </FormControl>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
              }
              label="Remember me"
            />

            <Button
              variant="text"
              sx={{
                textTransform: "none",
                fontSize: "0.9rem",
                color: "#555",
                backgroundColor: "transparent"
              }}
              onClick={() => router.push("/forgot-password")}
            >
              Forgot password?
            </Button>
          </Box>

          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{
              maxWidth: '100%',
              borderRadius: 10,
              fontSize: '1.2rem',
              textTransform: 'none',
              color: 'black',
              backgroundColor: '#D9D9D9',
              '&:hover': {
                backgroundColor: '#FBBC05',
              },
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>

          <Button
            variant="text"
            sx={{
              textTransform: "none",
              fontSize: "0.9rem",
              color: "#555",
              backgroundColor: "transparent"
            }}
            onClick={() => router.push("/signUp")}
          >
            Don't Have An Account Yet?
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
