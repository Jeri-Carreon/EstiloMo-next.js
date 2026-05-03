'use client';

import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

import OutlinedInput from "@mui/material/OutlinedInput";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

import InputAdornment  from '@mui/material/InputAdornment';
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

import { signIn } from "next-auth/react";
import { useState } from "react";

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

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("")
  const [mobileNumber, setMobileNumber] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };
  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleRegister = async (e) => { // async = makes the function wait for a response from server by using await keyword
    e.preventDefault();

    if(password !== confirmPassword) {
      alert("Passwords Do Not Match");
      return;
    }
    
    if (!firstName || !lastName || !email || !password) {
      alert("Please fill in all required fields");
      return;
    }

    //Add Input Validation here password, email

    const res = await fetch("/api/register", { // await = pause execution until fetch request is complete, then continue with the rest of the function
    method: "POST",
    headers: {"Content-Type": "application/json",},
    body: JSON.stringify({ firstName, lastName, password, email, mobileNumber 
    }),
  }); 

  if (!res.ok) {
    alert("Registration failed");
    return;
  }

  alert("User created!");

  window.location.href = "/login";
  } 

  return (
  <Box // outside container for the whole page
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
        Create An Account!
      </h1>

      <Box
        component="form"
        onSubmit={handleRegister}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <TextField
          label={
          <>
          Enter Your First name <span style={{ color: 'red' }}>*</span>
          </>
          }
          variant="outlined"
          onChange={(e) => setFirstName(e.target.value)}
          fullWidth
          
        />
        <TextField
          label={
          <>
          Enter Your Last name <span style={{ color: 'red' }}>*</span>
          </>
          }
          variant="outlined"
          onChange={(e) => setLastName(e.target.value)}
          fullWidth
          
        />

        <FormControl fullWidth variant="outlined">
          <InputLabel>
            Enter Your Password <span style={{ color: "red" }}>*</span>
          </InputLabel>

          <OutlinedInput
            type={showPassword ? "text" : "password"}
            onChange={(e) => setPassword(e.target.value)}
            label="Enter Your Password"
            endAdornment={
              <InputAdornment position="end">
                <IconButton onClick={handleTogglePassword} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl> 
        <FormControl fullWidth variant="outlined">
          <InputLabel>
            Confirm Your Password <span style={{ color: "red" }}>*</span>
          </InputLabel>

          <OutlinedInput
            type={showConfirmPassword ? "text" : "password"}
            onChange={(e) => setConfirmPassword(e.target.value)}
            label="Confirm Your Password"
            endAdornment={
              <InputAdornment position="end">
                <IconButton onClick={handleToggleConfirmPassword} edge="end">
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl>  
        <TextField
          label={
          <>
          Enter Your Email Address <span style={{ color: 'red' }}>*</span>
          </>
          }
          variant="outlined"
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          
        />
        <TextField
          label={
          <>
          Enter Your Mobile Number <span style={{ color: 'red' }}>*</span>
          </>
          }
          variant="outlined"
          onChange={(e) => setMobileNumber(e.target.value)}
          fullWidth
          
        />
        <Button variant="contained" type="submit" 
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
            }}>
          Sign Up
        </Button>

        <Button
          variant="text"
          sx={{
            textTransform: "none",
            fontSize: "0.9rem",
            color: "#555",
          }}
          href="/login"
        >
          Have An Account Already? Login Here
        </Button>
      </Box>
    </Paper>
  </Box>
);
}