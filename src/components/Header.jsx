import * as React from 'react';
import { styled, alpha } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MoreIcon from '@mui/icons-material/MoreVert';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../config';

import { useUnreadNotificationCount } from '../components/NotificationCount';

// Styled AppBar with gradient and glass effect
const GradientAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(135deg, #1C821C 0%, #2a642aff 100%)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 8px 24px rgba(103,58,183,0.3)',
  transition: theme.transitions.create(['background-color', 'box-shadow'], {
    duration: theme.transitions.duration.standard,
  }),
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    fontWeight: '700',
    fontSize: '0.75rem',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    right: 2,
    top: 6,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    transition: 'transform 0.3s ease, background-color 0.3s ease',
  },
}));

export default function Header() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState(null);

  const { toggleSidebar } = useSidebar();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const unreadCount = useUnreadNotificationCount();

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    handleMenuClose();
  };

  const menuId = 'primary-search-account-menu';
const renderMenu = (
  <Menu
    anchorEl={anchorEl}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    id={menuId}
    keepMounted
    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    open={isMenuOpen}
    onClose={handleMenuClose}
    PaperProps={{
      sx: {
        mt: 1,
        minWidth: 160,
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      },
    }}
  >
    <MenuItem onClick={handleLogout}>Logout</MenuItem>
  </Menu>
);
  const mobileMenuId = 'primary-search-account-menu-mobile';

const renderMobileMenu = (
  <Menu
    anchorEl={mobileMoreAnchorEl}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    id={mobileMenuId}
    keepMounted
    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    open={isMobileMenuOpen}
    onClose={handleMobileMenuClose}
    PaperProps={{
      sx: {
        mt: 1,
        minWidth: 160,
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      },
    }}
  >
    <MenuItem onClick={handleLogout}>
      <Typography variant="inherit">Logout</Typography>
    </MenuItem>
  </Menu>
);




  return (
    <Box sx={{ flexGrow: 1, zIndex: 1200 }}>
      <GradientAppBar position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ px: { xs: 1, sm: 3 } }}>
      
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              display: { xs: 'none', sm: 'block' },
              fontWeight: 600,
              letterSpacing: '0.1em',
              userSelect: 'none',
            }}
          >
            Recman Vehicle Inspection
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            <IconButton
              size="large"
              aria-label={`show ${unreadCount} new notifications`}
              color="inherit"
              onClick={() => navigate('/dashboard/notifications')}
              sx={{
                transition: 'background-color 0.3s ease',
                '&:hover': { backgroundColor: alpha('#fff', 0.15) },
              }}
            >
              <StyledBadge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </StyledBadge>
            </IconButton>

            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
              sx={{
                transition: 'background-color 0.3s ease',
                '&:hover': { backgroundColor: alpha('#fff', 0.15) },
              }}
            >
              <AccountCircle />
            </IconButton>
          </Box>

          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="show more"
              aria-controls={mobileMenuId}
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
              color="inherit"
              sx={{
                transition: 'background-color 0.3s ease',
                '&:hover': { backgroundColor: alpha('#fff', 0.15) },
              }}
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </GradientAppBar>

      {renderMobileMenu}
      {renderMenu}
    </Box>
  );
}
