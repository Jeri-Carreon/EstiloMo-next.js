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

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, SupabaseClient } from "@supabase/supabase-js";

const pages = [
  { label: "Home", path: "/" },
  { label: "About Us", path: "/aboutUs" },
  { label: "Our Services", path: "/ourServices" },
  { label: "Contact Us", path: "/contactUs" },
  { label: "Reviews", path: "/reviews" },
];

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  const [anchorElNav, setAnchorElNav] =
    React.useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] =
    React.useState<null | HTMLElement>(null);

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch (e) {
      console.error(e);
      console.warn("Supabase not available");
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    handleCloseUserMenu();
    router.push("/");
  };

  const handleOpenNavMenu = (
    event: React.MouseEvent<HTMLElement>
  ) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (
    event: React.MouseEvent<HTMLElement>
  ) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => setAnchorElNav(null);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  return (
    <AppBar position="static" color="primary">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
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

          <Box
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              display: { xs: "flex", md: "none" },
            }}
          >
            <Typography
              variant="h6"
              noWrap
              component={Link}
              href="/"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                color: "inherit",
                textDecoration: "none",
              }}
            >
              EstiloMo
            </Typography>
          </Box>

          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontFamily: "var(--font-nunito-sans)",
              fontWeight: 700,
              color: "inherit",
              textDecoration: "none",
            }}
          >
            EstiloMo
          </Typography>

          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <IconButton onClick={handleOpenNavMenu} color="inherit">
              <MenuIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: { xs: "none", md: "flex" } }}>
              {pages.map((page) => {
                const isActive = pathname === page.path;

                return (
                  <Button
                    key={page.label}
                    component={Link}
                    href={page.path}
                    sx={{
                      color: "white",
                      mx: 1,
                      borderBottom: isActive
                        ? "2px solid #FBBC05"
                        : "2px solid transparent",
                      "&:hover": {
                        borderBottom: "1px solid #FBBC05",
                      },
                    }}
                  >
                    {page.label}
                  </Button>
                );
              })}
            </Box>

            <Box sx={{ ml: 2 }}>
              {!user ? (
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
                      <Avatar
                        src={user.user_metadata?.avatar_url}
                      />
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

                    <MenuItem
                      component={Link}
                      href="/myAppointments"
                    >
                      My Appointments
                    </MenuItem>

                    <MenuItem component={Link} href="/myReviews">
                      My Reviews
                    </MenuItem>

                    <MenuItem component={Link} href="/loyaltyCard">
                      Loyalty Card
                    </MenuItem>

                    <MenuItem
                      onClick={handleSignOut}
                      sx={{ color: "#ff0000" }}
                    >
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </Box>

          <Menu
            id="menu-appbar"
            anchorEl={anchorElNav}
            anchorOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            open={Boolean(anchorElNav)}
            onClose={handleCloseNavMenu}
          >
            {pages.map((page) => (
              <MenuItem
                key={page.label}
                onClick={handleCloseNavMenu}
                component={Link}
                href={page.path}
              >
                <Typography sx={{ textAlign: "center" }}>
                  {page.label}
                </Typography>
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
