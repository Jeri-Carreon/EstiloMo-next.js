'use client';

import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

import OutlinedInput from "@mui/material/OutlinedInput";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

//Modals/Dialog Box
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import IconButton from "@mui/material/IconButton";

import { useRouter } from "next/navigation";

import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

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

  //Modals
  const [openDiffPass, setOpenDiffPass] = useState(false);
  const [openIncomFields, setOpenIncomFields] = useState(false);
  const [openServerError, setOpenServerError] = useState(false);
  const [serverErrorMsg, setServerErrorMsg] = useState("");
  const [openWeakPass, setOpenWeakPass] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  const router = useRouter();

  const validatePassword = (password: string) => {
  const minLength = /^.{8,72}$/;
  const hasNumber = /[0-9]/;
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/;
  const hasLetter = /[a-zA-Z]/;

  return (
    minLength.test(password) &&
    hasNumber.test(password) &&
    hasSpecial.test(password) &&
    hasLetter.test(password)
  );
};

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => { // async = makes the function wait for a response from server by using await keyword
    e.preventDefault();
    
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMobileNumber = mobileNumber.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !password || !trimmedMobileNumber) {
      setOpenIncomFields(true)
      return;
    }
    
    // EMAIL VALIDATION
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      setServerErrorMsg("Invalid email format");
      setOpenServerError(true);
      return;
    }

    if(password !== confirmPassword) {
      setOpenDiffPass(true)
      return;
    }

    if (!validatePassword(password)) {
      setOpenWeakPass(true)
      return;
    }

    const res = await fetch("/api/register", { // await = pause execution until fetch request is complete, then continue with the rest of the function
    method: "POST",
    headers: {"Content-Type": "application/json",},
    body: JSON.stringify({ 
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      password,
      email: trimmedEmail,
      mobileNumber: trimmedMobileNumber,
    }),
  }); 

  const data = await res.json();

  if (!res.ok) {
    setServerErrorMsg(data.error || "Registration failed")
    setOpenServerError(true)
    return;
  }

  // Modal
  if (data.ok) {
    setOpenSuccess(true);

    setTimeout(() => {
        router.push("/login"); // router.push = redirects user to url assigned"
      }, 5000);
  } 
};

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
          placeholder="Juan"
          variant="outlined"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          fullWidth
          slotProps={{
            htmlInput: {
              maxLength: 50,
            },
          }}
        />
        <TextField
          label={
          <>
          Enter Your Last name <span style={{ color: 'red' }}>*</span>
          </>
          }
          placeholder='Dela Cruz'
          variant="outlined"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          fullWidth
          slotProps={{
            htmlInput: {
              maxLength: 50,
            },
          }}
        />

        <FormControl fullWidth variant="outlined">
          <InputLabel>
            Enter Your Password <span style={{ color: "red" }}>*</span>
          </InputLabel>

          <OutlinedInput
            type={showPassword ? "text" : "password"}
            onChange={(e) => setPassword(e.target.value)}
            label="Enter Your Password"
            value={password}
            slotProps={{
              input: {
                maxLength: 72,
              }
            }}
          />
        </FormControl> 
        <FormControl fullWidth variant="outlined">
          <InputLabel htmlFor="confirm-password">
            Confirm Your Password <span style={{ color: "red" }}>*</span>
          </InputLabel>

          <OutlinedInput
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            onChange={(e) => setConfirmPassword(e.target.value)}
            label="Confirm Your Password"
            value={confirmPassword}
            notched={true}
            slotProps={{
              input: {
                maxLength: 72,
              }
            }}
          />
        </FormControl>  
        <TextField
          label={
            <>
              Enter Your Email Address <span style={{ color: 'red' }}>*</span>
            </>
          }
          placeholder="juandelacruz@gmail.com"
          variant="outlined"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={
            email.length > 0 &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
          }
          helperText={
            email.length > 0 &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
              ? "Please enter a valid email address"
              : ""
          }
          slotProps={{
            htmlInput: {
              maxLength: 100,
            }
          }}
        />
        <TextField
          placeholder="09123456789"
          label={
          <>
          Enter Your Mobile Number <span style={{ color: 'red' }}>*</span>
          </>
          }
          variant="outlined"
          fullWidth
          value={mobileNumber}
          onChange={(e) => {
            // Remove non-numeric characters
            const value = e.target.value.replace(/\D/g, '');

            // Limit to 11 digits
            if (value.length <= 11) {
              setMobileNumber(value);
            }
          }}
          error={
            mobileNumber.length > 0 &&
            !/^09\d{9}$/.test(mobileNumber)
          }
          helperText={
            mobileNumber.length > 0 &&
            !/^09\d{9}$/.test(mobileNumber)
              ? 'Mobile number must be 11 digits and start with 09'
              : ''
          }
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 11,
            },
          }}
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
            backgroundColor: "transparent"
          }}
          onClick={() => router.push("/login")}
        >
          Have An Account Already? Login Here
        </Button>
        
        {/*MODALS
        Fill up all fields*/}
        <Dialog open={openIncomFields} onClose={() => setOpenIncomFields(false)}>
          <IconButton onClick={() => setOpenIncomFields(false)} sx={{ position: "absolute", right: 8, top: 8}}>
            <CloseIcon />
          </IconButton>

          <DialogContent 
            sx={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              mt: 5
            }}
            >
            <ErrorIcon sx={{ fontSize: 80, color: "red"}} />
          </DialogContent>

          <DialogContent>
            Please fill in all required fields
          </DialogContent>

        </Dialog>
        {/*Passwords Don't Match*/}
        <Dialog open={openDiffPass} onClose={() => setOpenDiffPass(false)}>
          <IconButton onClick={() => setOpenDiffPass(false)}
          sx={{ position: "absolute", right: 8, top: 8}}
          >
            <CloseIcon />
          </IconButton>

          <DialogContent 
            sx={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              mt: 5
            }}
            >
            <ErrorIcon sx={{ fontSize: 80, color: "red"}} />
          </DialogContent>

          <DialogContent>
            Passwords Do Not Match!
          </DialogContent>

        </Dialog>

        {/*Password Weak*/}
        <Dialog open={openWeakPass} onClose={() => setOpenWeakPass(false)}>
          <IconButton onClick={() => setOpenWeakPass(false)}
          sx={{ position: "absolute", right: 8, top: 8}}
          >
            <CloseIcon />
          </IconButton>

          <DialogContent 
            sx={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              mt: 5
            }}
            >
            <ErrorIcon sx={{ fontSize: 80, color: "red"}} />
          </DialogContent>
          
          <DialogTitle sx={{ textAlign: "center", position: "relative"}}>Password is Weak</DialogTitle>
          <DialogContent>
            Password must meet the following requirements:
            <ul style={{ marginTop: 10, paddingLeft: 20 }}>
              <li>At least 8 characters long</li>
              <li>Contains at least 1 letter (A–Z)</li>
              <li>Contains at least 1 number (0–9)</li>
              <li>Contains at least 1 special character (!@#$%^&*)</li>
            </ul>
          </DialogContent>

        </Dialog>
        
        <Dialog open={openServerError} onClose={() => setOpenServerError(false)}>
          <IconButton onClick={() => setOpenServerError(false)}
          sx={{ position: "absolute", right: 8, top: 8}}
          >
            <CloseIcon />
          </IconButton>

          <DialogContent 
            sx={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              mt: 5
            }}
            >
            <ErrorIcon sx={{ fontSize: 80, color: "red"}} />
             {serverErrorMsg}
          </DialogContent>

        </Dialog>

        {/*User Successfully Created*/}
        <Dialog open={openSuccess} onClose={() => setOpenSuccess(false)}>
          {/*<IconButton onClick={() => setOpenSuccess(false)}
          sx={{ position: "absolute", right: 8, top: 8}}
          >
            <CloseIcon />
          </IconButton>*/}
          <DialogContent 
            sx={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              mt: 5
            }}
            >
            <CheckCircleIcon sx={{ fontSize: 70, color: "green"}} />

            <DialogTitle sx={{ textAlign: "center", position: "relative"}}>Success</DialogTitle>
         
          <DialogContent>
            User created successfully! 
            <br />
            Please verify your account with the link sent to your email address to login.
          </DialogContent>
         </DialogContent>
        </Dialog>
      </Box>
    </Paper>
  </Box>
);
}