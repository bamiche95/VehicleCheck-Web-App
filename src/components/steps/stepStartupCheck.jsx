import React from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function StepStartup({ form, updateForm, items }) {
  const toggleCheck = (template_item_id) => {
    updateForm({
      startupChecks: {
        ...form.startupChecks,
        [template_item_id]: !form.startupChecks?.[template_item_id],
      },
    });
  };

  const handleLevelChange = (e, template_item_id) => {
    e.stopPropagation();
    updateForm({
      startupLevels: {
        ...form.startupLevels,
        [template_item_id]: e.target.value,
      },
    });
  };

  const levelOptions = ['1/4', '1/2', '3/4', 'Full'];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Startup Checklist
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 2,
        }}
      >
        {items.map(({ id, label }) => {
          const isChecked = !!form.startupChecks?.[id];
          const isLevelItem = ['fuel level', 'adblue level', 'oil level'].some((term) =>
            label.toLowerCase().includes(term)
          );

          return (
            <Paper
              key={id}
              elevation={isChecked ? 6 : 1}
              onClick={() => toggleCheck(id)}
              sx={{
                p: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: isChecked ? 'success.light' : 'background.paper',
                border: '2px solid',
                borderColor: isChecked ? 'success.main' : 'grey.300',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                '&:hover': {
                  backgroundColor: isChecked ? 'success.light' : 'grey.100',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: isChecked ? 'white' : 'text.primary',
                    fontWeight: isChecked ? 'bold' : 'normal',
                  }}
                >
                  {label}
                </Typography>
                {isChecked && <CheckCircleIcon sx={{ color: 'white', ml: 1, fontSize: '1.5rem' }} />}
              </Box>

              {isLevelItem && isChecked && (
                <FormControl size="small" fullWidth sx={{ mt: 2 }}>
                  <InputLabel id={`level-label-${id}`} sx={{ color: isChecked ? 'white' : 'text.primary' }}>
                    Level
                  </InputLabel>
                  <Select
                    labelId={`level-label-${id}`}
                    value={form.startupLevels?.[id] || ''}
                    label="Level"
                    onChange={(e) => handleLevelChange(e, id)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      color: isChecked ? 'white' : 'text.primary',
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: isChecked ? 'white' : 'grey.300',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: isChecked ? 'white' : 'primary.main',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: isChecked ? 'white' : 'grey.300',
                      },
                      '.MuiSvgIcon-root': {
                        color: isChecked ? 'white' : 'text.secondary',
                      },
                    }}
                  >
                    {levelOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
