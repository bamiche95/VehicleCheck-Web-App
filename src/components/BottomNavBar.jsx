// src/components/BottomNavBar.jsx
import React, { useState } from 'react';
import { Fab, Paper, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CreateInspection from './CreateInspection';

const StyledFab = styled(Fab)(({ theme }) => ({
  position: 'absolute',
  top: -30, // Floating above the bar
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1,
}));

const BottomNavBar = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60, // height of the bottom bar
          backgroundColor: '#fff', // change to your preferred color
          display: { xs: 'flex', sm: 'none' },
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1200,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        }}
        elevation={3}
      >
        <Box sx={{ position: 'relative', width: '100%' }}>
          <StyledFab
            color="secondary"
            aria-label="add"
            onClick={() => setModalOpen(true)}
          >
            <AddIcon />
          </StyledFab>
          
        </Box>
      </Paper>

      {/* Create Inspection Modal */}
      <CreateInspection open={modalOpen} handleClose={() => setModalOpen(false)} />
    </>
  );
};

export default BottomNavBar;
