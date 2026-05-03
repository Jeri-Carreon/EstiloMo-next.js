"use client";

import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import Link from "next/link";

import { useSession, signOut } from "next-auth/react";
import page from "@/app/signUp/page";

const pages = [
  { label: "Home", path: "/" },
  { label: "About Us", path: "/aboutUs" },
  { label: "Our Services", path: "/ourServices" },
  { label: "Contact Us", path: "/contactUs" },
  { label: "Reviews", path: "/reviews" },
];

export default function Navbar() {
  const { data: session } = useSession();

  const [anchorElNav, setAnchorElNav] =
    React.useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] =
    React.useState<null | HTMLElement>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => setAnchorElNav(null);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  return (
    <AppBar position="static" color="primary">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo */}
          <Link href="/">
            <Box
              component="img"
              src="/images/logo.jpg"
              alt="Logo"
              sx={{
                height: 100,
                display: { xs: "none", md: "flex" },
                mr: 2,
                padding: 2,
                cursor: "pointer",
              }}
            />
          </Link>
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
            
          >
            The Barbs Bro
          </Typography>

          {/* LEFT MOBILE MENU (unchanged) */}
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <IconButton onClick={handleOpenNavMenu} color="inherit">
              <MenuIcon />
            </IconButton>
          </Box>

          {/* 🔥 RIGHT SIDE CONTAINER (PAGES + AUTH) */}
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >

            {/* NavBar Option/Pages */}
            <Box sx={{ display: { xs: "none", md: "flex" } }}>
              {pages.map((page) => (
                <Button
                  key={page.label}
                  component={Link}
                  href={page.path}
                  sx={{ color: "white", mx: 1, "&:hover": { borderBottom: "1px solid #FBBC05" } }}
                >
                  {page.label}
                </Button>
              ))}
            </Box>

            {/* Sign In Button */
            /* Has ternary operator, if user is authenticated, show avatar and menu instead */}
            <Box sx={{ ml: 2 }}>
              {!session ? (
                <Button
                  component={Link}
                  href="/login"
                  variant="contained"
                  color="secondary"
                >
                  Sign In
                </Button>
              ) : (
                <>
                  <Tooltip title="Open User Menu">
                    <IconButton onClick={handleOpenUserMenu}>
                      <Avatar />
                    </IconButton>
                  </Tooltip>

                  <Menu
                    anchorEl={anchorElUser}
                    open={Boolean(anchorElUser)}
                    onClose={handleCloseUserMenu}
                  >

                    <MenuItem component={Link} href="/profile">
                      Edit Profile
                    </MenuItem>

                    <MenuItem component={Link} href="/profile">
                      My Appointments
                    </MenuItem>

                    <MenuItem component={Link} href="/profile">
                      My Reviews
                    </MenuItem>

                    <MenuItem component={Link} href="/profile">
                      Loyalty Card
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        signOut();
                        handleCloseUserMenu();
                      }}
                      sx={{color:'#ff0000'}}
                    >
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>

          </Box>

          {/* Mobile Hamburger Menu */}
          <Menu
            id="menu-appbar"
            anchorEl={anchorElNav}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(anchorElNav)}
            onClose={handleCloseNavMenu}
          >
            {pages.map((page) => (
              <MenuItem key={page.label} onClick={handleCloseNavMenu} component={Link} href={page.path}>
                <Typography sx={{ textAlign: 'center' }}>{page.label}</Typography>
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
}