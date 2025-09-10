import React, {useEffect, useState} from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Avatar,
  Divider,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Toolbar,
  Typography,
  Box,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ChecklistIcon from '@mui/icons-material/Checklist';
//import { useAuth } from '../context/AuthContext';
import BASE_URL from '../config';
const drawerWidth = 260;

export const SideBar = ({ open }) => {
  const location = useLocation();
const [user, setUser] = useState(null);



useEffect(() => {
  async function fetchUser() {
    try {
      const res = await fetch(`${BASE_URL}/api/profile`, { credentials: "include" });
      const data = await res.json();
      // your API returns the user directly
      setUser(data);
    } catch (err) {
      console.error("Failed to fetch user", err);
    }
  }

  fetchUser();
}, []);

// optional chaining for safe access
const fullname = `${user?.firstname || ''} ${user?.lastname || ''}`;
const role = user?.role || '';


  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Users', icon: <GroupIcon />, path: '/dashboard/users' },
    { text: 'Vehicle', icon: <DirectionsCarIcon />, path: '/dashboard/vehicles' },
    { text: 'Check Lists', icon: <ChecklistIcon />, path: '/dashboard/checklists' },
    { text: 'Trailers', icon: <DirectionsCarIcon />, path: '/dashboard/trailers' },
  ];

  // For better active highlighting, match start but prefer exact path for Dashboard root
  const isActive = (path) =>
    path === '/dashboard'
      ? location.pathname === path
      : location.pathname.startsWith(path);




  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          background: 'linear-gradient(135deg, #000000ff 0%, #000000ff 100%)',
          color: '#fff',
          borderRight: 'none',
          boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
          transition: 'width 0.3s ease',
          paddingTop: '80px'
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 1,
          py: 2,
        }}
      >
        <Avatar
          alt="Company Logo"
          src="/VehCheck_logo.jpg"
          sx={{ width: 80, height: 80, mb: 1, border: '2px solid #fff' }}
        />
       <Typography variant="h6" noWrap sx={{ textTransform: 'capitalize' }}>
  {role}
</Typography>

          <Typography variant="h6" noWrap>
          {fullname}
        </Typography>
      </Toolbar>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

      <List sx={{ mt: 1 }}>
        {menuItems.map(({ text, icon, path }) => (
          <ListItemButton
            key={text}
            component={Link}
            to={path}
            selected={isActive(path)}
            sx={{
              color: 'inherit',
              px: 3,
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderLeft: '4px solid #fff',
                color: '#fff',
                '& .MuiListItemIcon-root': {
                  color: '#fff',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              {icon}
            </ListItemIcon>
            <ListItemText
              primary={text}
              primaryTypographyProps={{ fontWeight: 'medium' }}
            />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
};
