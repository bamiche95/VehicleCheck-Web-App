import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import BASE_URL from '../config';

export default function VehicleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

const [formData, setFormData] = useState({
  reg_number: '',
  make: '',
  model: '',
  year: '',
  mot_expiry_date: '',
  pmi_date: '', // new
});


  useEffect(() => {
    fetch(`${BASE_URL}/api/vehicles/${id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setVehicle(data);
      setFormData({
  reg_number: data.reg_number || '',
  make: data.make || '',
  model: data.model || '',
  year: data.year || '',
  mot_expiry_date: data.mot_expiry_date ? data.mot_expiry_date.slice(0, 10) : '',
  pmi_date: data.pmi_date ? data.pmi_date.slice(0, 10) : '', // prefill PMI
});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${BASE_URL}/api/vehicles/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save');

      navigate(`/dashboard/vehicles/${id}`);
    } catch (err) {
      setError(err.message || 'Error saving vehicle');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500 }}>
      <Typography variant="h4" gutterBottom>
        Edit Vehicle
      </Typography>

      <TextField
        label="Registration Number"
        name="reg_number"
        value={formData.reg_number}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      />
      <TextField
        label="Make"
        name="make"
        value={formData.make}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      />
      <TextField
        label="Model"
        name="model"
        value={formData.model}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      />
      <TextField
        label="Year"
        name="year"
        type="number"
        value={formData.year}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        inputProps={{ min: 1900, max: new Date().getFullYear() }}
      />
      <TextField
        label="MOT Expiry Date"
        name="mot_expiry_date"
        type="date"
        value={formData.mot_expiry_date}
        onChange={handleChange}
        fullWidth
        margin="normal"
        InputLabelProps={{ shrink: true }}
      />
<TextField
  label="Next PMI Date"
  name="pmi_date"
  type="date"
  value={formData.pmi_date}
  onChange={handleChange}
  fullWidth
  margin="normal"
  InputLabelProps={{ shrink: true }}
/>
      {error && (
        <Typography color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={saving}
        sx={{ mt: 2 }}
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </Box>
  );
}
