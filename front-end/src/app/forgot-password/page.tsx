'use client';

import { FormEvent, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

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



export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [openSuccess, setOpenSuccess] = useState(false);
  const [openNoInput, setOpenNoInput] = useState(false);
  const [openError, setOpenError] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      setOpenNoInput(true);
      return;
    }

    try {
    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (data.ok) {
      setOpenSuccess(true);
    } else {
      setOpenError(true);
    }
  } catch (error) {
    setOpenError(true);
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
          maxWidth: 400,
          p: 4,
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        <h1 style={{
          color: "#000",
          fontSize: "2.5rem",
        }}>
          Forgot Password
        </h1>

        <Box
          component="form"
          onSubmit={handleForgotPassword}
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
          Send Reset Link

          {/*MODALS */}
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
          
            
               If an account with that email exists, password reset instructions have been sent to your email address.
            </DialogContent>

            <DialogActions sx={{ justifyContent: "center"}}>
              <Button sx={{ backgroundColor: "black", color: "white", '&:hover': {
                backgroundColor: '#FBBC05',
              },}}
                onClick={() => {
                  setOpenSuccess(false);
                }}>Confirm
              </Button>
            </DialogActions>
          </Dialog>

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
                mt: 5
              }}
              >
              <ErrorIcon sx={{ fontSize: 70, color: "red"}} />
            </DialogContent>
            
          <DialogTitle sx={{ textAlign: "center", position: "relative"}}>Missing Email</DialogTitle>
          
            <DialogContent>
              Please enter your email address
            </DialogContent>

          </Dialog>

          <Dialog open={openError} onClose={() => setOpenError(false)}>
            <IconButton onClick={() => setOpenError(false)}
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
                <ErrorIcon sx={{ fontSize: 70, color: "red"}} />
              </DialogContent>
            <DialogTitle sx={{ textAlign: "center", position: "relative"}}>Error</DialogTitle>
          </Dialog>

        </Button>
        </Box>
      </Paper>
    </Box>
  );
}