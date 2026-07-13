'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import StarIcon from '@mui/icons-material/Star';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import DescriptionIcon from '@mui/icons-material/Description';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SecurityIcon from '@mui/icons-material/Security';
import { DEFAULT_ROLE_TAB_ACCESS, type AdminTabKey } from '@/lib/adminTabs';

const menuItems = [
  { key: 'dashboard' as AdminTabKey, label: 'Dashboard', icon: DashboardIcon, path: '/admin/dashboard' },
  { key: 'customers' as AdminTabKey, label: 'Customers', icon: GroupIcon, path: '/admin/customers' },
  { key: 'services' as AdminTabKey, label: 'Services', icon: BuildIcon, path: '/admin/services' },
  { key: 'barbers' as AdminTabKey, label: 'Barbers', icon: PersonIcon, path: '/admin/barbers' },
  { key: 'appointments' as AdminTabKey, label: 'Appointments', icon: EventIcon, path: '/admin/appointments' },
  { key: 'sales' as AdminTabKey, label: 'Sales', icon: MonetizationOnIcon, path: '/admin/sales' },
  { key: 'reviews' as AdminTabKey, label: 'Customer Reviews', icon: StarIcon, path: '/admin/reviews' },
  { key: 'loyaltyCard' as AdminTabKey, label: 'Loyalty Card', icon: CardGiftcardIcon, path: '/admin/loyaltyCard' },
  { key: 'reports' as AdminTabKey, label: 'Reports', icon: DescriptionIcon, path: '/admin/reports' },
  { key: 'user-management' as AdminTabKey, label: 'User Management', icon: AdminPanelSettingsIcon, path: '/admin/user-management' },
  { key: 'chatbot' as AdminTabKey, label: 'Chatbot', icon: SmartToyIcon, path: '/admin/chatbot' },
  { key: 'security' as AdminTabKey, label: 'Security Logs', icon: SecurityIcon, path: '/admin/security' },
];

type SidebarProps = {
  currentName: string;
  currentRole: string;
};

// ─── Shared nav list ──────────────────────────────────────────────────────────

function NavList({
  filteredMenu,
  pathname,
  currentName,
  currentRole,
  onClose,
  onSignOut,
}: {
  filteredMenu: typeof menuItems;
  pathname: string | null;
  currentName: string;
  currentRole: string;
  onClose?: () => void;
  onSignOut: () => void;
}) {
  const currentInitial = currentName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Profile */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          pb: 2,
          borderBottom: '1px solid #333',
        }}
      >
        <Avatar sx={{ width: 40, height: 40, bgcolor: '#666' }}>
          {currentInitial}
        </Avatar>
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {currentName}
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#999' }}>{currentRole}</Typography>
        </Box>
      </Box>

      {/* Logout */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={onSignOut}
          sx={{
            width: '100%',
            bgcolor: '#333',
            color: '#fff',
            textTransform: 'none',
            '&:hover': { bgcolor: '#444' },
          }}
        >
          Logout
        </Button>
      </Box>

      {/* Menu */}
      <List sx={{ p: 1, flex: 1, overflowY: 'auto' }}>
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.path);

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Link
                href={item.path}
                style={{ width: '100%', textDecoration: 'none' }}
                onClick={onClose}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    borderRadius: 1,
                    bgcolor: isActive ? '#ffc107' : 'transparent',
                    color: isActive ? '#000' : '#fff',
                    '&:hover': { bgcolor: isActive ? '#ffc107' : '#333' },
                    transition: 'background-color 0.15s',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isActive ? '#000' : '#fff' }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: 14,
                        fontWeight: isActive ? 700 : 500,
                      },
                    }}
                  />
                </Box>
              </Link>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Sidebar({ currentName, currentRole }: SidebarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accessibleTabs, setAccessibleTabs] = useState<string[]>(
    currentRole === 'OWNER'
      ? DEFAULT_ROLE_TAB_ACCESS.OWNER
      : DEFAULT_ROLE_TAB_ACCESS[currentRole as keyof typeof DEFAULT_ROLE_TAB_ACCESS] || []
  );
  const router = useRouter();
  const supabase = createClient();

  const currentInitial = currentName?.charAt(0)?.toUpperCase() || 'U';

  useEffect(() => {
    let ignore = false;

    async function loadAccess() {
      try {
        const res = await fetch('/api/user/role', { cache: 'no-store' });
        const data = await res.json();

        if (!ignore && Array.isArray(data.accessibleTabs)) {
          setAccessibleTabs(data.accessibleTabs);
        }
      } catch {
        // Keep the default role access if settings cannot be loaded.
      }
    }

    loadAccess();

    return () => {
      ignore = true;
    };
  }, [currentRole]);

  const filteredMenu =
    currentRole === 'OWNER'
      ? menuItems
      : menuItems.filter((item) => accessibleTabs.includes(item.key));

  // sign-out
    const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };
  // ── Desktop: static sidebar ────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <Box
        sx={{
          width: 240,
          flexShrink: 0,
          bgcolor: '#000',
          color: '#fff',
          minHeight: '100vh',
        }}
      >
        <NavList
          filteredMenu={filteredMenu}
          pathname={pathname}
          currentName={currentName}
          currentRole={currentRole}
          onSignOut={handleSignOut}
        />
      </Box>
    );
  }

  // ── Mobile: top AppBar + Drawer ────────────────────────────────────────────
  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: '#000',
          borderBottom: '1px solid #222',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 56 }}>
          {/* Hamburger */}
          <IconButton
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ color: '#fff' }}
            aria-label="Open menu"
          >
            <MenuIcon />
          </IconButton>

          {/* Logo / brand name — centered */}
          <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>
            Admin
          </Typography>

          {/* Profile avatar */}
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: '#666',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {currentInitial}
          </Avatar>
        </Toolbar>
      </AppBar>


      {/* Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { 
          sx: {
            width: 260,
            bgcolor: '#000',
            color: '#fff',
          },
        }
        }}
      >
        {/* Close button row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            px: 1,
            pt: 1,
          }}
        >
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <NavList
          filteredMenu={filteredMenu}
          pathname={pathname}
          currentName={currentName}
          currentRole={currentRole}
          onClose={() => setDrawerOpen(false)}
          onSignOut={handleSignOut}
        />
      </Drawer>
    </>
  );
}
