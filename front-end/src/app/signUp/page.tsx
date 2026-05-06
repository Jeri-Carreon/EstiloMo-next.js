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

//Modals/Dialog Box
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

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
  const [openSuccess, setOpenSuccess] = useState(false);

  const router = useRouter();

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };
  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => { // async = makes the function wait for a response from server by using await keyword
    e.preventDefault();
    
    if (!firstName || !lastName || !email || !password) {
      setOpenIncomFields(true)
      return;
    }

    if(password !== confirmPassword) {
      setOpenDiffPass(true)
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
    const data = await res.json();
    {/*alert(data.error || "Registration failed");*/}
    setServerErrorMsg(data.error || "Registration failed")
    setOpenServerError(true)
    return;
  }

  // Modal
  setOpenSuccess(true);
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
            notched={true}
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
          </DialogContent>
          
         <DialogTitle sx={{ textAlign: "center", position: "relative"}}>Success</DialogTitle>
         
          <DialogContent>
            User created successfully!
          </DialogContent>

          <DialogActions sx={{ justifyContent: "center"}}>
            <Button sx={{ backgroundColor: "black", color: "white", '&:hover': {
              backgroundColor: '#FBBC05',
            },}}
              onClick={() => {
                setOpenSuccess(false);
                router.push("/login");
              }}>Go to Login
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Paper>
  </Box>
);
}