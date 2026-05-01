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
          {/* LOGO */}
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
            href="#app-bar-with-responsive-menu"
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

            {/* DESKTOP PAGES */}
            <Box sx={{ display: { xs: "none", md: "flex" } }}>
              {pages.map((page) => (
                <Button
                  key={page.label}
                  component={Link}
                  href={page.path}
                  sx={{ color: "white", mx: 1 }}
                >
                  {page.label}
                </Button>
              ))}
            </Box>

            {/* AUTH SECTION */}
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
                  <Tooltip title="Open settings">
                    <IconButton onClick={handleOpenUserMenu}>
                      <Avatar />
                    </IconButton>
                  </Tooltip>

                  <Menu
                    anchorEl={anchorElUser}
                    open={Boolean(anchorElUser)}
                    onClose={handleCloseUserMenu}
                  >
                    <MenuItem component={Link} href="/dashboard">
                      Dashboard
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        signOut();
                        handleCloseUserMenu();
                      }}
                    >
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>

          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}