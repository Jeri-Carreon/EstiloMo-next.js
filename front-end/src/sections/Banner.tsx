import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

export default function Banner() {
  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        backgroundImage: "url(/images/banner.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        color: "white",
        overflow: "hidden",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 10, md: 0 },
          px: { xs: 3, sm: 4, md: 2 },
        }}
      >
        <Typography
          sx={{
            fontWeight: "bold",
            fontFamily: "var(--font-nunito-sans)",
            fontSize: {
              xs: "3.5rem",
              sm: "5rem",
              md: "7rem",
            },
            lineHeight: 0.9,
            wordBreak: "break-word",
          }}
        >
          EstiloMo
        </Typography>

        <Typography
          sx={{
            fontWeight: "bold",
            fontFamily: "var(--font-nunito-sans)",
            fontSize: {
              xs: "2rem",
              sm: "2.5rem",
              md: "3rem",
            },
            mt: 1,
          }}
        >
          By The Barbs Bro
        </Typography>

        <Typography
          sx={{
            mt: 3,
            fontFamily: "var(--font-nunito-sans)",
            fontSize: {
              xs: "1.15rem",
              sm: "1.35rem",
              md: "1.6rem",
            },
            lineHeight: 1.5,
            maxWidth: {
              xs: "100%",
              sm: "500px",
              md: "700px",
            },
          }}
        >
          Sharp Cuts. Solid Confidence. We provide quality and affordable
          haircuts and services. The Barbs Bro. Undeniable excellence.
        </Typography>

        <Stack
          spacing={2}
          direction="column"
          sx={{
            mt: 4,
            width: {
              xs: "100%",
              sm: "320px",
              md: "350px",
            },
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            size="large"
            href="/appointment"
            sx={{
              fontSize: {
                xs: "1rem",
                md: "1.1rem",
              },
              borderRadius: 10,
              width: "100%",
              textTransform: "none",
              fontFamily: "var(--font-nunito-sans)",
              py: 1.5,
              "&:hover": {
                backgroundColor: "accent.main",
              },
            }}
          >
            Book An Appointment!
          </Button>

          <Button
            variant="contained"
            color="secondary"
            size="large"
            href="/download"
            sx={{
              fontSize: {
                xs: "1rem",
                md: "1.1rem",
              },
              borderRadius: 10,
              width: "100%",
              textTransform: "none",
              fontFamily: "var(--font-nunito-sans)",
              py: 1.5,
              "&:hover": {
                backgroundColor: "accent.main",
              },
            }}
          >
            Download Our App
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}