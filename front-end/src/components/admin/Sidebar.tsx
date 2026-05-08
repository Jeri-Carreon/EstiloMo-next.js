'use client';

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

const menuItems = [
  { label: 'Dashboard', icon: DashboardIcon, path: '/admin/dashboard' },
  { label: 'Customers', icon: GroupIcon, path: '/admin/customers' },
  { label: 'Services', icon: BuildIcon, path: '/admin/services' },
  { label: 'Barbers', icon: PersonIcon, path: '/admin/barbers' },
  { label: 'Appointments', icon: EventIcon, path: '/admin/appointments' },
  { label: 'Sales', icon: MonetizationOnIcon, path: '/admin/sales' },
  { label: 'Customer Reviews', icon: StarIcon, path: '/admin/reviews' },
  { label: 'Loyalty Card', icon: CardGiftcardIcon, path: '/admin/loyalty' },
  { label: 'Reports', icon: DescriptionIcon, path: '/admin/reports' },
  { label: 'User Management', icon: AdminPanelSettingsIcon, path: '/admin/users' },
  { label: 'Chatbot', icon: SmartToyIcon, path: '/admin/chatbot' },
  { label: 'Security Logs', icon: SecurityIcon, path: '/admin/security' },
];

type SidebarProps = {
  currentName: string;
  currentRole: string;
};

export default function Sidebar({ currentName, currentRole }: SidebarProps) {
  const pathname = usePathname();
  const currentInitial = currentName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <Box
      sx={{
        width: 240,
        backgroundColor: '#000',
        color: '#fff',
        p: 2,
        minHeight: '100vh',
      }}
    >
      {/* PROFILE */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 3,
          pb: 2,
          borderBottom: '1px solid #333',
        }}
      >
        <Avatar sx={{ width: 40, height: 40, backgroundColor: '#666' }}>
          {currentInitial}
        </Avatar>

        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            {currentName}
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#999' }}>
            {currentRole}
          </Typography>
        </Box>
      </Box>

      {/* LOGOUT */}
      <Button
        variant="contained"
        size="small"
        sx={{
          width: '100%',
          mb: 3,
          backgroundColor: '#333',
          color: '#fff',
          textTransform: 'none',
          '&:hover': { backgroundColor: '#444' },
        }}
      >
        Logout
      </Button>

      {/* MENU */}
      <List sx={{ p: 0 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.path);

          return (
            <ListItem
              key={item.path}
              disablePadding
              sx={{ mb: 1 }}
            >
              <Link
                href={item.path}
                style={{ width: '100%', textDecoration: 'none' }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#ffc107' : 'transparent',
                    color: isActive ? '#000' : '#fff',
                    '&:hover': {
                      backgroundColor: isActive ? '#ffc107' : '#333',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isActive ? '#000' : '#fff',
                    }}
                  >
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