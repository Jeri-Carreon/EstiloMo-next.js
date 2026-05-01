'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Link from 'next/link';

const pages = [
  { label: 'Home', path: '/' },
  { label: 'About Us', path: '/aboutUs' },
  { label: 'Our Services', path: '/ourServices' },
  { label: 'Contact Us', path: '/contactUs' },
  { label: 'Reviews', path: '/reviews' }
];
const settings = ['Edit Profile', 'My Appointments', 'My Reviews', 'Loyalty Card','Logout'];

function ResponsiveAppBar() {
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  return (
    <AppBar position="static" color="primary" sx={{ width: '100%' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Link href="/">
            <Box
            component="img"
            src="/images/logo.jpg"
            alt="Logo"
            sx={{
                height: 100,
                display: { xs: 'none', md: 'flex' },
                mr: 2,
                padding: 2, //To make the logo look better, adjust as needed
                cursor: 'pointer', // Makes it clear that the logo is clickable
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

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: 'block', md: 'none' } }}
            >
              {pages.map((page) => (
                <MenuItem
                  key={page.label}
                  component={Link}
                  href={page.path}
                  onClick={handleCloseNavMenu}
                >
                  <Typography textalign="center">{page.label}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          <Box
            sx={{
                flexGrow: 1,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
            }}
            >
            {/* Pages */}
            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                {pages.map((page) => (
              <Button
                key={page.label}
                component={Link}
                href={page.path}
                sx={{ 
                  my: 2, 
                  mx: 2,
                  color: 'white',
                  borderBottom: '2px solid transparent',
                  '&:hover': {
                    color: '#FBBC05',
                    borderBottomColor: '#FBBC05',
                    backgroundColor: 'transparent',
                  },
                }}
              >
                {page.label}
              </Button>
            ))}
            </Box>

            {/* Avatar */}
            <Box sx={{ ml: 2 }}>
                <Tooltip title="Open settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                    <Avatar alt="Remy Sharp" src="/static/images/avatar/2.jpg" />
                </IconButton>
                </Tooltip>
            </Box>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {settings.map((setting) => (
                <MenuItem key={setting} onClick={handleCloseUserMenu}>
                  <Typography sx={{ textAlign: 'center' }}>{setting}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default ResponsiveAppBar;
