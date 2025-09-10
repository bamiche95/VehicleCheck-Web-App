import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Paper,
} from '@mui/material';
import BASE_URL from '../config';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';

export default function Vehicles() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

const [formData, setFormData] = useState({
  reg_number: '',
  make: '',
  model: '',
  year: '',
  mot_expiry_date: '',
  pmi_date: '', // new field
});

  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchVehicles = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/vehicles`, { credentials: 'include' });
      const data = await res.json();
  const formattedRows = data.map(vehicle => ({
  id: vehicle.id,
  reg_number: vehicle.reg_number,
  make: vehicle.make,
  model: vehicle.model,
  year: vehicle.year,
  mot_expiry_date: vehicle.mot_expiry_date,
  pmi_date: vehicle.pmi_date, // include PMI
}));

      setRows(formattedRows);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setFormData({ reg_number: '', make: '', model: '', year: '', mot_expiry_date: '' });
    setError('');
    setOpen(false);
  };

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.reg_number.trim() || !formData.mot_expiry_date) {
      setError('Registration number and MOT expiry date are required.');
      return;
    }
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/newvehicles`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errMsg = await res.json();
        throw new Error(errMsg.message || 'Failed to add vehicle');
      }
      handleClose();
      fetchVehicles();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70, headerAlign: 'center', align: 'center' },
    { field: 'reg_number', headerName: 'Reg Number', flex: 1 },
    { field: 'make', headerName: 'Make', flex: 1 },
    { field: 'model', headerName: 'Model', flex: 1 },
    { field: 'year', headerName: 'Year', width: 100, headerAlign: 'center', align: 'center' },
    {
      field: 'mot_expiry_date',
      headerName: 'MOT Expiry',
      flex: 1,
      renderCell: params => {
        if (!params.value) return 'N/A';
        const today = dayjs();
        const expiry = dayjs(params.value);
        const daysLeft = expiry.diff(today, 'day');

        let color = 'inherit';
        if (daysLeft < 0) color = '#d32f2f'; // red
        else if (daysLeft <= 30) color = '#f9a825'; // amber

        return (
          <span style={{ color }}>
            {expiry.format('DD-MM-YYYY')} ({daysLeft} days)
          </span>
        );
      },
    },

   {
  field: 'pmi_date',
  headerName: 'PMI (6-week check)',
  flex: 1,
  renderCell: params => {
    if (!params.value) return 'N/A';
    const today = dayjs();
    const pmiDate = dayjs(params.value);
    const weeksLeft = Math.ceil(pmiDate.diff(today, 'day') / 7); // round up

    let color = 'inherit';
    if (weeksLeft <= 0) color = '#d32f2f'; // overdue
    else if (weeksLeft <= 1) color = '#f9a825'; // within 1 week
    else color = '#388e3c'; // ok

    return (
      <span style={{ color }}>
        {pmiDate.format('DD-MM-YYYY')} ({weeksLeft} wk{weeksLeft !== 1 ? 's' : ''})
      </span>
    );
  },
}



  ];

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="60vh"
        sx={{ backgroundColor: '#f9fafb' }}
      >
        <CircularProgress color="success" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: '#f9fafb',
        minHeight: '90vh',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          p: 3,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          flexWrap="wrap"
          gap={2}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: '#2e7d32', userSelect: 'none' }}
          >
            Vehicles
          </Typography>
          {user && ['admin', 'supervisor'].includes(user.role) && (
            <Button
              variant="contained"
              color="success"
              onClick={handleOpen}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Add Vehicle
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ height: '70vh', width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            getRowId={row => row.id}
            disableColumnResize
            onRowClick={params => navigate(`/dashboard/vehicles/${params.id}`)}
            sx={{
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              '.MuiDataGrid-columnHeaders': {
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                fontWeight: '700',
                fontSize: '0.95rem',
              },
              '.MuiDataGrid-row:hover': {
                backgroundColor: '#f1f8f5',
                cursor: 'pointer',
              },
              '.MuiDataGrid-footerContainer': {
                borderTop: '1px solid #e0e0e0',
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                fontWeight: '600',
              },
            }}
          />
        </Box>

        {/* Add Vehicle Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#2e7d32' }}>Add New Vehicle</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && (
              <Typography color="error" sx={{ fontWeight: 600 }}>
                {error}
              </Typography>
            )}
            <TextField
              margin="dense"
              label="Reg Number *"
              name="reg_number"
              fullWidth
              value={formData.reg_number}
              onChange={handleChange}
              autoFocus
            />
            <TextField
              margin="dense"
              label="Make"
              name="make"
              fullWidth
              value={formData.make}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              label="Model"
              name="model"
              fullWidth
              value={formData.model}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              label="Year"
              name="year"
              type="number"
              fullWidth
              value={formData.year}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              label="MOT Expiry Date *"
              name="mot_expiry_date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.mot_expiry_date}
              onChange={handleChange}
            />

            <TextField
  margin="dense"
  label="Next PMI Date"
  name="pmi_date"
  type="date"
  fullWidth
  InputLabelProps={{ shrink: true }}
  value={formData.pmi_date}
  onChange={handleChange}
/>

          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} sx={{ color: '#2e7d32', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              sx={{ fontWeight: 700 }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
