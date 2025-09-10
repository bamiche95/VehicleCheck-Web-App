import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
  Box,
} from '@mui/material';
import { Link } from 'react-router-dom';

export const InspectionCardList = ({ inspections }) => {
  if (!inspections.length) {
    return <Typography align="center" mt={4}>No inspections found.</Typography>;
  }

  return (
    <Stack spacing={2}>
      {inspections.map((item) => (
        <Card
          key={item.id}
          component={Link}
          to={`/driver-dashboard/${item.id}`}
          sx={{
            borderRadius: 2,
            boxShadow: 3,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Reg Number: {item.reg_number}
            </Typography>

            <Divider sx={{ mb: 1 }} />

            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Submitted At:
              </Typography>
              <Typography variant="body1">{item.submitted_at}</Typography>
            </Box>

            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Has Defects:
              </Typography>
              <Typography
                variant="body1"
                color={item.has_defects === 'Yes' ? 'error' : 'success.main'}
              >
                {item.has_defects}
              </Typography>
            </Box>

            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Defect Count:
              </Typography>
              <Typography variant="body1">{item.defect_count}</Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};
