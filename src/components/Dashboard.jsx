import React from 'react';
import { useSidebar } from '../context/SidebarContext';
import { Box, useMediaQuery, useTheme, Toolbar, Typography } from '@mui/material';
import { SideBar } from './SideBar';
import  BottomNavBar  from './BottomNavBar';
import { useLocation, Outlet  } from 'react-router-dom';

const drawerWidth = 260;

const Dashboard = ({ children }) => {
  const { sidebarOpen, sidebarVisible } = useSidebar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();


  const showBottomBar = isMobile;

  return (
<Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', flex: 1 }}>
        {!isMobile && sidebarVisible && <SideBar open={sidebarOpen} />}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
          
          
            transition: 'margin-left 0.3s ease',
            paddingBottom: showBottomBar ? '56px' : 0,
          }}
        >
          <Toolbar />

          <Outlet />
        </Box>

      </Box>


    </Box>
  );
};

export default Dashboard;
