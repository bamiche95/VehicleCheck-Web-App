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
  MenuItem,
  Divider,
  Paper,
} from '@mui/material';
import BASE_URL from '../config';
import { useAuth } from '../context/AuthContext';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    username: '',
    password: '',
    role: 'driver',
  });
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/users`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

const capitalize = (text) => {
  if (!text) return '';
  return text
    .toString()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const columns = [
  { 
    field: 'id', 
    headerName: 'ID', 
    width: 70, 
    headerAlign: 'center', 
    align: 'center',
    renderCell: (params) => capitalize(params.value),
  },
  { 
    field: 'fullname', 
    headerName: 'Full Name', 
    width: 200,
    renderCell: (params) => capitalize(params.value),
  },
  { 
    field: 'username', 
    headerName: 'Username', 
    width: 150,
    // No capitalization here
  },
  { 
    field: 'role', 
    headerName: 'Role', 
    width: 120, 
    headerAlign: 'center', 
    align: 'center',
    renderCell: (params) => capitalize(params.value),
  },
  { 
    field: 'created_at', 
    headerName: 'Created At', 
    width: 180,
    renderCell: (params) => capitalize(params.value),
  },
];


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add user');
      setOpen(false);
      setForm({ firstname: '', lastname: '', username: '', password: '', role: 'driver' });
      fetchUsers();
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
          mb={3}
          flexWrap="wrap"
          gap={2}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: '#2e7d32', userSelect: 'none' }}
          >
            User List
          </Typography>
          <Button
            variant="contained"
            color="success"
            onClick={() => setOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Add User
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ height: '70vh', width: '100%' }}>
          <DataGrid
            rows={users}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            getRowId={(row) => row.id}
            disableColumnResize
            onRowClick={(params) => navigate(`/dashboard/users/${params.id}`)}
            sx={{
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              '.MuiDataGrid-columnHeaders': {
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                fontWeight: '700',
                fontSize: '0.95rem',
                 textTransform: 'capitalize'
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

        {/* Add User Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#2e7d32' }}>Add New User</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              name="firstname"
              label="First Name"
              value={form.firstname}
              onChange={handleChange}
              autoFocus
            />
            <TextField
              name="lastname"
              label="Last Name"
              value={form.lastname}
              onChange={handleChange}
            />
            <TextField
              name="username"
              label="Username"
              value={form.username}
              onChange={handleChange}
              
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
            />
            <TextField select name="role" label="Role" value={form.role} onChange={handleChange}>
              {user.role === 'admin' && <MenuItem value="admin">Admin</MenuItem>}
              <MenuItem value="supervisor">Supervisor</MenuItem>
              <MenuItem value="driver">Driver</MenuItem>
            </TextField>
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
