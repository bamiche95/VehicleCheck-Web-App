import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function StepInterior({ form, updateForm, items }) {
  const toggleCheck = (template_item_id) => {
    updateForm({
      interiorChecks: {
        ...form.interiorChecks,
        [template_item_id]: !form.interiorChecks?.[template_item_id],
      },
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Interior Checklist
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
        {items.map(({ id, label }) => {
          const isChecked = !!form.interiorChecks?.[id];
          return (
            <Paper
              key={id}
              elevation={isChecked ? 6 : 1}
              onClick={() => toggleCheck(id)}
              sx={{
                p: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: isChecked ? 'error.light' : 'background.paper',
                border: '2px solid',
                borderColor: isChecked ? 'error.main' : 'grey.300',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                '&:hover': {
                  backgroundColor: isChecked ? 'error.light' : 'grey.100',
                },
              }}
            >
              <Typography variant="body1" sx={{ color: isChecked ? 'white' : 'text.primary', fontWeight: isChecked ? 'bold' : 'normal' }}>
                {label}
              </Typography>
              {isChecked && (
                <CheckCircleIcon sx={{ color: 'white', ml: 1, fontSize: '1.5rem' }} />
              )}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
