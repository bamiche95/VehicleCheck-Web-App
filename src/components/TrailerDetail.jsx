import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Divider,
  Button,
  TextField,
} from '@mui/material';
import BASE_URL from '../config';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';

export default function TrailerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [trailer, setTrailer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');

  const fetchTrailer = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/trailers/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch trailer');
      const data = await res.json();
      setTrailer(data);
      setFormData(data);
    } catch (err) {
      console.error('Error fetching trailer:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrailer();
  }, [id]);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/trailers/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to update trailer');
      setEditing(false);
      fetchTrailer(); // reload data
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress color="success" />
      </Box>
    );
  }

  if (!trailer) {
    return (
      <Box p={3}>
        <Typography variant="h6" color="error">
          Trailer not found
        </Typography>
      </Box>
    );
  }

  const renderExpiry = date => {
    if (!date) return 'N/A';
    const today = dayjs();
    const expiry = dayjs(date);
    const daysLeft = expiry.diff(today, 'day');

    let color = 'inherit';
    if (daysLeft < 0) color = '#d32f2f';
    else if (daysLeft <= 30) color = '#f9a825';

    return (
      <span style={{ color }}>
        {expiry.format('DD-MM-YYYY')} ({daysLeft} days)
      </span>
    );
  };

  const renderPMI = date => {
    if (!date) return 'N/A';
    const today = dayjs();
    const pmiDate = dayjs(date);
    const weeksLeft = Math.ceil(pmiDate.diff(today, 'day') / 7);

    let color = 'inherit';
    if (weeksLeft <= 0) color = '#d32f2f';
    else if (weeksLeft <= 1) color = '#f9a825';
    else color = '#388e3c';

    return (
      <span style={{ color }}>
        {pmiDate.format('DD-MM-YYYY')} ({weeksLeft} wk{weeksLeft !== 1 ? 's' : ''})
      </span>
    );
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f9fafb', minHeight: '90vh' }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32' }}>
            Trailer Detail – {trailer.reg_number}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/dashboard/trailers')}>
            Back to Trailers
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {editing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Reg Number" name="reg_number" value={formData.reg_number || ''} onChange={handleChange} fullWidth />
            <TextField label="Make" name="make" value={formData.make || ''} onChange={handleChange} fullWidth />
            <TextField label="Model" name="model" value={formData.model || ''} onChange={handleChange} fullWidth />
            <TextField label="Year" name="year" type="number" value={formData.year || ''} onChange={handleChange} fullWidth />
            <TextField
              label="MOT Expiry Date"
              name="mot_expiry_date"
              type="date"
              value={formData.mot_expiry_date || ''}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Next PMI Date"
              name="pmi_date"
              type="date"
              value={formData.pmi_date || ''}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Box display="flex" gap={2}>
              <Button variant="contained" color="success" onClick={handleSave}>
                Save
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography><strong>Registration:</strong> {trailer.reg_number}</Typography>
            <Typography><strong>Make:</strong> {trailer.make || 'N/A'}</Typography>
            <Typography><strong>Model:</strong> {trailer.model || 'N/A'}</Typography>
            <Typography><strong>Year:</strong> {trailer.year || 'N/A'}</Typography>
            <Typography><strong>MOT Expiry:</strong> {renderExpiry(trailer.mot_expiry_date)}</Typography>
            <Typography><strong>PMI Date:</strong> {renderPMI(trailer.pmi_date)}</Typography>

            {user && ['admin', 'supervisor'].includes(user.role) && (
              <Button
                variant="contained"
                color="success"
                sx={{ mt: 2 }}
                onClick={() => setEditing(true)}
              >
                Edit Trailer
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
