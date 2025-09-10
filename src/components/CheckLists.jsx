import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import BASE_URL from '../config';

export default function CheckLists() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    section: '',
    label: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch(`${BASE_URL}/api/checklist-templates`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const flatRows = Object.entries(data).flatMap(([section, items]) =>
          items.map((item) => ({
            id: item.id,
            section,
            label: item.label,
            position: item.position,
          }))
        );
        setRows(flatRows);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching checklist templates:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { field: 'id', headerName: 'ID', width: 90, headerAlign: 'center', align: 'center' },
    { field: 'section', headerName: 'Section', flex: 1 },
    { field: 'label', headerName: 'Label', flex: 2 },
    { field: 'position', headerName: 'Position', width: 120, headerAlign: 'center', align: 'center' },
  ];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!form.section || !form.label) {
      alert('Please fill in all fields.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/checklist-templates`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add checklist item');
      }

      setOpen(false);
      setForm({ section: '', label: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

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
          mb={2}
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32', userSelect: 'none' }}>
            Vehicle Checklist Templates
          </Typography>

          <Button
            variant="contained"
            color="success"
            onClick={() => setOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Add New Checklist
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ height: '70vh', width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[5, 10, 20]}
            disableSelectionOnClick
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

        {/* Add Checklist Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#2e7d32' }}>Add New Checklist Item</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              name="section"
              label="Section"
              value={form.section}
              onChange={handleChange}
              required
            >
              <MenuItem value="INTERIOR">INTERIOR</MenuItem>
              <MenuItem value="EXTERIOR">EXTERIOR</MenuItem>
            </TextField>

            <TextField
              name="label"
              label="Label"
              value={form.label}
              onChange={handleChange}
              required
              autoFocus
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpen(false)} sx={{ color: '#2e7d32', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleSave}
              disabled={saving}
              sx={{ fontWeight: 700 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
