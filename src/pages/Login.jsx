import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
  Card,
  Divider,
  Paper, // Changed from Card for a cleaner look
  Grid, // Added Grid for flexible layout
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../config';
import { Link } from 'react-router-dom';

export default function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required.';
    }
    if (!formData.password || formData.password.length < 3) {
      newErrors.password = 'Password must be at least 3 characters.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        return setErrors({ general: data.message || 'Login failed' });
      }

      setUser(data); // save user in context

      if (data.role === 'driver') {
        navigate('/driver-dashboard');
      } else {
        navigate('/dashboard/inspections');
      }
    } catch (err) {
      setErrors({ general: 'Network error. Please try again.' });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f2f1, #c8e6c9)',
        p: 2,
      }}
    >
      <Paper
        elevation={isMobile ? 0 : 8}
        sx={{
          maxWidth: 450,
          width: '100%',
          padding: 4,
          borderRadius: isMobile ? 0 : 3,
          boxShadow: isMobile ? 'none' : '0 10px 30px rgba(0,0,0,0.1)',
          backgroundColor: isMobile ? 'transparent' : 'white',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: isMobile ? 'none' : '0 15px 40px rgba(0,0,0,0.2)',
          },
        }}
      >
        {/* Decorative Green Blob */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            backgroundColor: '#4caf50',
            borderRadius: '50%',
            opacity: 0.2,
            zIndex: 0,
            display: isMobile ? 'none' : 'block',
          }}
        />
        {/* Decorative Lighter Green Blob */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 100,
            height: 100,
            backgroundColor: '#81c784',
            borderRadius: '50%',
            opacity: 0.15,
            zIndex: 0,
            display: isMobile ? 'none' : 'block',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h4"
            align="center"
            gutterBottom
            sx={{ fontWeight: 'bold', color: '#333' }}
          >
         Recman Vehcheck
          </Typography>
          <Typography
            variant="body2"
            align="center"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Sign in to your account
          </Typography>
<form onSubmit={handleSubmit} noValidate>
  <Grid container spacing={2}>
    <Grid  size={{ xs: 12, sm: 6 }}>
      <TextField
        fullWidth
        label="Username"
        name="username"
        value={formData.username}
        onChange={handleChange}
        error={!!errors.username}
        helperText={errors.username}
        variant="outlined"
        autoFocus
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            '&.Mui-focused fieldset': {
              borderColor: '#4caf50',
            },
          },
        }}
      />
    </Grid>
    <Grid  size={{ xs: 12, sm: 6 }}>
      <TextField
        fullWidth
        label="Password"
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        error={!!errors.password}
        helperText={errors.password}
        variant="outlined"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            '&.Mui-focused fieldset': {
              borderColor: '#4caf50',
            },
          },
        }}
      />
    </Grid>
  </Grid>

            <FormControlLabel
              control={<Checkbox color="success" />}
              label="Remember me"
              sx={{ mt: 1 }}
            />

            {errors.general && (
              <Typography color="error" align="center" sx={{ mt: 2 }}>
                {errors.general}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{
                mt: 3,
                backgroundColor: '#4caf50',
                borderRadius: '10px',
                py: 1.5,
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#388e3c',
                },
              }}
            >
              Sign In
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>or</Divider>
          <Typography align="center" variant="body2" color="text.secondary">
            Contact the Office to create an Account
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}