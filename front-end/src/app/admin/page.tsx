'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function AdminPage() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: '700' }}>
        Admin Dashboard
      </Typography>

      <Typography sx={{ mt: 2, color: '#666' }}>
        Welcome to the admin panel. Select a module from the sidebar.
      </Typography>
    </Box>
  );
}