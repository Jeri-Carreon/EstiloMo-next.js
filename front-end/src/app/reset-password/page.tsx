'use client';

import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper";

import OutlinedInput from "@mui/material/OutlinedInput";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

//Modals/Dialog Box
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import IconButton from "@mui/material/IconButton";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    setToken(params.get("token"));
  }, []);

  const [password, setPassword] = useState("");  // useState stores new password
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  //Modal
  const [openInvReset, setOpenInvReset] = useState(false);
  const [openNoInput, setOpenNoInput] = useState(false);
  const [openDiffPass, setOpenDiffPass] = useState(false);
  const [openWeakPass, setOpenWeakPass] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  const validatePassword = (password: string) => {
  const minLength = /.{8,}/;
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

  const handleReset = async (e: FormEvent<HTMLFormElement>) => { // handleReset send token and new password
    e.preventDefault();

    if (!token) {
      setOpenInvReset(true)
      return;
    }
    
    if(!password.trim() || !confirmPassword.trim()) {
      setOpenNoInput(true)
      return;
    }

    if (password !== confirmPassword) {
      setOpenDiffPass(true)
      return;
    }

    if (!validatePassword(password)) {
      setOpenWeakPass(true)
      return;
    }

  try {
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    console.log("API RESPONSE:", data);

    if (data.ok) {
      setOpenSuccess(true)
      setTimeout(() => {
        router.push("/login"); // router.push = redirects user to url assigned"
      }, 5000); //5 seconds to redirect
      
    } else {
      setOpenInvReset(true)
    }
  } catch (error) {
    console.error(error);
    setOpenInvReset(true);
  }
};

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
        }}>
          Create New Password
        </h1>
          <Box
          component="form"
          onSubmit={handleReset}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
          >
            <FormControl fullWidth variant="outlined">
            <InputLabel>
              Enter New Password <span style={{ color: "red" }}>*</span>
            </InputLabel>

            <OutlinedInput
              type={showPassword ? "text" : "password"}
              onChange={(e) => setPassword(e.target.value)}
              label="Enter New Password"
            />
          </FormControl>  

          <FormControl fullWidth variant="outlined">
          <InputLabel>
            Confirm New Password <span style={{ color: "red" }}>*</span>
          </InputLabel>

          <OutlinedInput
            type={showConfirmPassword ? "text" : "password"}
            onChange={(e) => setConfirmPassword(e.target.value)}
            label="Confirm New Password"
          />
        </FormControl>  

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
            Reset Password
          </Button>

          </Box>
      </Paper>
      {/*Modals*/}
      {/*Invalid Reset Link */}
      <Dialog open={openInvReset} onClose={() => setOpenInvReset(false)}>
          <IconButton onClick={() => setOpenInvReset(false)}
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
                mt: 3
              }}
              >
              <ErrorIcon sx={{ fontSize: 70, color: "red"}} />
              Invalid Reset Link

              <DialogActions sx={{ justifyContent: "center"}}>
                <Button sx={{ backgroundColor: "black", color: "white", '&:hover': {
                  backgroundColor: '#FBBC05',
                },}}
                  onClick={() => {
                    setOpenInvReset(false);
                    router.push("/forgot-password");
                  }}>Please Request New Reset Link
                </Button>
              </DialogActions>
              
            </DialogContent>
      </Dialog>

      {/*No Input*/}
      <Dialog open={openNoInput} onClose={() => setOpenNoInput(false)}>
          <IconButton onClick={() => setOpenNoInput(false)}
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
                mt: 3
              }}
              >
              <ErrorIcon sx={{ fontSize: 70, color: "red"}} />
              Please Fill in both fields
            </DialogContent>
      </Dialog>

      {/*Different Passwords */}
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
                mt: 3
              }}
              >
              <ErrorIcon sx={{ fontSize: 70, color: "red"}} />
              Passwords do not match
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

      {/*Success*/}
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
                mt: 3
              }}
              >
              <CheckCircleIcon sx={{ fontSize: 70, color: "green"}} />
              <DialogTitle sx={{ textAlign: "center", position: "relative"}}>Password Updated!</DialogTitle>
              You will be redirected to login page
            </DialogContent>
      </Dialog>
    </Box>
  );
}