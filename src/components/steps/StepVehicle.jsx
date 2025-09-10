import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  TextField,
  CircularProgress,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  InputAdornment,
  IconButton,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import debounce from 'lodash.debounce';
import ClearIcon from '@mui/icons-material/Clear';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TrailerIcon from '@mui/icons-material/LocalShipping';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BASE_URL from '../../config';

export default function StepVehicle({ form, updateForm }) {
  const [vehicles, setVehicles] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loadingTrailers, setLoadingTrailers] = useState(false);
  const [searchVehicle, setSearchVehicle] = useState('');
  const [searchTrailer, setSearchTrailer] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedTrailer, setSelectedTrailer] = useState(null);

  // ---------------- Vehicle ----------------
  useEffect(() => {
    if (form.vehicle) {
      setSearchVehicle(form.vehicle.reg_number);
      setSelectedVehicle(form.vehicle);
    }
  }, [form.vehicle]);

  const fetchVehicles = useCallback(async (query) => {
    if (!query.trim()) return setVehicles([]);
    setLoadingVehicles(true);
    try {
      const res = await fetch(`${BASE_URL}/api/vehiclesbyreg?q=${query}`, { credentials: 'include' });
      const data = await res.json();
      setVehicles(data);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  const debouncedFetchVehicles = useCallback(debounce(fetchVehicles, 300), [fetchVehicles]);

  useEffect(() => {
    if (!searchVehicle || selectedVehicle?.reg_number === searchVehicle) return setVehicles([]);
    debouncedFetchVehicles(searchVehicle);
    return () => debouncedFetchVehicles.cancel();
  }, [searchVehicle, selectedVehicle, debouncedFetchVehicles]);

  const handleSelectVehicle = (vehicle) => {
    updateForm({ vehicleId: vehicle.id, vehicle });
    setSelectedVehicle(vehicle);
    setSearchVehicle(vehicle.reg_number);
    setVehicles([]);
  };

  const handleClearVehicle = () => {
    updateForm({ vehicleId: null, vehicle: null });
    setSelectedVehicle(null);
    setSearchVehicle('');
    setVehicles([]);
  };

  // ---------------- Trailer ----------------
  useEffect(() => {
    if (form.trailer) {
      setSearchTrailer(form.trailer.reg_number);
      setSelectedTrailer(form.trailer);

      // Ensure the radio button shows "Yes" if trailer exists
      if (!form.hasTrailer) {
        updateForm({ hasTrailer: true });
      }
    }
  }, [form.trailer, updateForm]);

  const fetchTrailers = useCallback(async (query) => {
    if (!query.trim()) return setTrailers([]);
    setLoadingTrailers(true);
    try {
      const res = await fetch(`${BASE_URL}/api/trailersbyreg?q=${query}`, { credentials: 'include' });
      const data = await res.json();
      setTrailers(data);
    } catch (err) {
      console.error('Failed to load trailers:', err);
      setTrailers([]);
    } finally {
      setLoadingTrailers(false);
    }
  }, []);

  const debouncedFetchTrailers = useCallback(debounce(fetchTrailers, 300), [fetchTrailers]);

  useEffect(() => {
    if (!searchTrailer || selectedTrailer?.reg_number === searchTrailer) return setTrailers([]);
    debouncedFetchTrailers(searchTrailer);
    return () => debouncedFetchTrailers.cancel();
  }, [searchTrailer, selectedTrailer, debouncedFetchTrailers]);

  const handleSelectTrailer = (trailer) => {
    updateForm({ trailerId: trailer.id, trailer });
    setSelectedTrailer(trailer);
    setSearchTrailer(trailer.reg_number);
    setTrailers([]);
  };

  const handleClearTrailer = () => {
    updateForm({ trailerId: null, trailer: null });
    setSelectedTrailer(null);
    setSearchTrailer('');
    setTrailers([]);
  };

  // ---------------- Trailer Toggle ----------------
  const handleTrailerToggle = (e) => {
    const hasTrailer = e.target.value === 'yes';
    updateForm({ hasTrailer });
    if (!hasTrailer) handleClearTrailer();
  };

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>Vehicle Details</Typography>

      {/* Vehicle Search */}
      <Box sx={{ position: 'relative' }}>
        <TextField
          label="Vehicle Reg number"
          fullWidth
          value={searchVehicle}
          onChange={(e) => { setSearchVehicle(e.target.value); setSelectedVehicle(null); }}
          disabled={!!selectedVehicle}
          InputProps={{
            startAdornment: <InputAdornment position="start"><DirectionsCarIcon color="primary" /></InputAdornment>,
            endAdornment: searchVehicle && (
              <InputAdornment position="end">
                {selectedVehicle ? <CheckCircleOutlineIcon color="success" /> : <IconButton onClick={handleClearVehicle}><ClearIcon /></IconButton>}
              </InputAdornment>
            ),
          }}
        />
        {loadingVehicles && <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box>}
        {vehicles.length > 0 && !selectedVehicle && (
          <Paper sx={{ position: 'absolute', width: '100%', maxHeight: 200, overflowY: 'auto', zIndex: 10, mt: 1 }}>
            <List dense>
              {vehicles.map(v => (
                <ListItem key={v.id} disablePadding>
                  <ListItemButton onClick={() => handleSelectVehicle(v)}>
                    <ListItemText primary={v.reg_number} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>

      {/* Trailer Toggle */}
      <FormControl component="fieldset" sx={{ mt: 2 }}>
        <FormLabel>Does this vehicle have a trailer?</FormLabel>
        <RadioGroup row value={form.hasTrailer ? 'yes' : 'no'} onChange={handleTrailerToggle}>
          <FormControlLabel value="yes" control={<Radio />} label="Yes" />
          <FormControlLabel value="no" control={<Radio />} label="No" />
        </RadioGroup>
      </FormControl>

      {/* Trailer Search */}
      {form.hasTrailer && (
        <Box sx={{ position: 'relative', mt: 2 }}>
          <TextField
            label="Trailer Reg number"
            fullWidth
            value={searchTrailer}
            onChange={(e) => { setSearchTrailer(e.target.value); setSelectedTrailer(null); }}
            disabled={!!selectedTrailer}
            InputProps={{
              startAdornment: <InputAdornment position="start"><TrailerIcon color="primary" /></InputAdornment>,
              endAdornment: searchTrailer && (
                <InputAdornment position="end">
                  {selectedTrailer ? <CheckCircleOutlineIcon color="success" /> : <IconButton onClick={handleClearTrailer}><ClearIcon /></IconButton>}
                </InputAdornment>
              ),
            }}
          />
          {loadingTrailers && <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box>}
          {trailers.length > 0 && !selectedTrailer && (
            <Paper sx={{ position: 'absolute', width: '100%', maxHeight: 200, overflowY: 'auto', zIndex: 10, mt: 1 }}>
              <List dense>
                {trailers.map(t => (
                  <ListItem key={t.id} disablePadding>
                    <ListItemButton onClick={() => handleSelectTrailer(t)}>
                      <ListItemText primary={t.reg_number} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      )}

      {/* Mileage */}
      <TextField
        label="Vehicle mileage"
        variant="outlined"
        fullWidth
        type="number"
        value={form.mileage || ''}
        onChange={(e) => updateForm({ mileage: e.target.value })}
        margin="normal"
        required
        InputProps={{ startAdornment: <InputAdornment position="start"><SpeedIcon color="primary" /></InputAdornment> }}
      />
    </Paper>
  );
}
