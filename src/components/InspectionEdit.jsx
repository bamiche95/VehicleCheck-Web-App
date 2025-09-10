import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SignatureCanvas from 'react-signature-canvas';
import { useParams, useNavigate } from 'react-router-dom';
import BASE_URL from '../config';

// ... previous imports remain the same
import { useTheme } from '@mui/material/styles';

export default function InspectionEdit({ onSubmitSuccess, handleClose }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    vehicle: null,
    vehicleId: '',
    mileage: '',
    defectNumber: '',
    notes: '',
    interiorChecks: {},
    exteriorChecks: {},
    startupChecks: {},
    startupLevels: {},
    exteriorFuelLevels: {},
    comments: {},
    filesByLabel: {}, // media files keyed by label
    signature: ''
  });
  const [templates, setTemplates] = useState({ interior: [], exterior: [], startup: [] });
  const [vehicles, setVehicles] = useState([]);
  const [previews, setPreviews] = useState({});
  const [savedSignature, setSavedSignature] = useState(null);
  const [usingSaved, setUsingSaved] = useState(false);

  const sigCanvasRef = useRef(null);
  const signatureCanvasWrapperRef = useRef(null);
  const levelOptions = ['1/4', '1/2', '3/4', 'Full'];

  const updateForm = (update) => setForm((prev) => ({ ...prev, ...update }));

  // --- Fetch vehicles, templates, existing inspection ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehRes, tmplRes, inspRes] = await Promise.all([
          fetch(`${BASE_URL}/api/vehicles`, { credentials: 'include' }),
          fetch(`${BASE_URL}/api/checklist-templates`, { credentials: 'include' }),
          id ? fetch(`${BASE_URL}/api/inspections/${id}`, { credentials: 'include' }) : Promise.resolve({ json: async () => ({}) })
        ]);
        const [vehData, tmplData, inspData] = await Promise.all([vehRes.json(), tmplRes.json(), inspRes.json()]);
        setVehicles(vehData);

        setTemplates({
          interior: tmplData.filter(t => t.section === 'INTERIOR'),
          exterior: tmplData.filter(t => t.section === 'EXTERIOR'),
          startup: tmplData.filter(t => t.section === 'STARTUP CHECKS')
        });

        if (id && inspData.checklist) {
          const { checklist, fuelLevels, responses } = inspData;
          const interiorChecks = {};
          const exteriorChecks = {};
          const startupChecks = {};
          responses.forEach(r => {
            const val = r.is_defective === 1;
            if (r.section === 'INTERIOR') interiorChecks[r.template_item_id] = val;
            else if (r.section === 'EXTERIOR') exteriorChecks[r.template_item_id] = val;
            else if (r.section === 'STARTUP CHECKS') startupChecks[r.template_item_id] = val;
          });

          updateForm({
            vehicle: checklist.vehicle,
            vehicleId: checklist.vehicle_id,
            mileage: checklist.mileage,
            defectNumber: checklist.defect_number,
            notes: checklist.notes,
            interiorChecks,
            exteriorChecks,
            startupChecks,
            startupLevels: fuelLevels.startupLevels || {},
            exteriorFuelLevels: fuelLevels.exteriorFuelLevels || {},
            comments: inspData.comments || {},
            filesByLabel: inspData.filesByLabel || {},
            signature: inspData.signature || ''
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // --- Media previews ---
  useEffect(() => {
    const newPreviews = {};
    Object.entries(form.filesByLabel).forEach(([label, file]) => {
      newPreviews[label] = URL.createObjectURL(file);
    });
    setPreviews(newPreviews);
    return () => Object.values(newPreviews).forEach(URL.revokeObjectURL);
  }, [form.filesByLabel]);

  // --- Signature canvas resizing ---
  useEffect(() => {
    const resizeCanvas = () => {
      if (sigCanvasRef.current && signatureCanvasWrapperRef.current) {
        const canvas = sigCanvasRef.current.getCanvas();
        const parent = signatureCanvasWrapperRef.current;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
        if (form.signature && sigCanvasRef.current.isEmpty()) {
          sigCanvasRef.current.fromDataURL(form.signature);
        }
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [form.signature]);

  const clearSignature = () => {
    sigCanvasRef.current?.clear();
    updateForm({ signature: '' });
    setUsingSaved(false);
  };

  const saveSignature = () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      alert("Please provide a signature before saving.");
      return;
    }
    const sigData = sigCanvasRef.current.getCanvas().toDataURL('image/png');
    updateForm({ signature: sigData });
    setSavedSignature(sigData);
    setUsingSaved(false);
  };

  const handleLevelChange = (level, type, id) => {
    if (type === 'startup') updateForm({ startupLevels: { ...form.startupLevels, [id]: level } });
    else if (type === 'exterior') updateForm({ exteriorFuelLevels: { ...form.exteriorFuelLevels, [id]: level } });
  };

  const toggleCheck = (type, id) => {
    const key = type + 'Checks';
    updateForm({ [key]: { ...form[key], [id]: !form[key]?.[id] } });
  };

  const handleCommentChange = (id, val) => {
    updateForm({ comments: { ...form.comments, [id]: val } });
  };

  const handleSubmit = async () => {
    const allDefects = [
      ...Object.entries(form.interiorChecks).filter(([_, v]) => v),
      ...Object.entries(form.exteriorChecks).filter(([_, v]) => v),
      ...Object.entries(form.startupChecks).filter(([_, v]) => v)
    ];
    for (let [id] of allDefects) {
      if (!form.comments?.[id] || form.comments[id].trim() === '') {
        alert('Please fill out all comments for selected defects.');
        return;
      }
    }
    if (!form.signature) {
      alert('Please provide a signature.');
      return;
    }

    const formData = new FormData();
    formData.append('vehicle_id', form.vehicleId);
    formData.append('mileage', form.mileage);
    formData.append('notes', form.notes);
    formData.append('signature', form.signature);

    Object.entries(form.comments).forEach(([id, comment]) => { if (comment) formData.append(`comment_${id}`, comment); });
    Object.entries(form.interiorChecks).forEach(([id, val]) => val && formData.append(`interior_${id}`, '1'));
    Object.entries(form.exteriorChecks).forEach(([id, val]) => val && formData.append(`exterior_${id}`, '1'));
    Object.entries(form.startupChecks).forEach(([id, val]) => val && formData.append(`startup_${id}`, '1'));
    Object.entries(form.startupLevels).forEach(([id, level]) => formData.append(`startup_level_${id}`, level));
    Object.entries(form.exteriorFuelLevels).forEach(([id, level]) => formData.append(`exterior_fuel_level_${id}`, level));
    Object.entries(form.filesByLabel).forEach(([label, file]) => {
      formData.append('media', file);
      formData.append('media_labels', label);
    });

    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `${BASE_URL}/api/inspections/${id}` : `${BASE_URL}/api/inspections`;
      const res = await fetch(url, { method, credentials: 'include', body: formData });
      if (!res.ok) throw new Error('Failed to submit inspection.');
      alert('Inspection saved!');
      onSubmitSuccess?.();
      handleClose?.();
      if (!id) navigate('/dashboard/inspections');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Typography>Loading...</Typography>;

  const renderChecklist = (items, type, checks, levels = {}) => (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>{type.charAt(0).toUpperCase() + type.slice(1)} Checklist</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
        {items.map(({ id, label }) => {
          const isChecked = !!checks[id];
          const isLevelItem = ['fuel level', 'adblue level', 'oil level'].some(term => label.toLowerCase().includes(term));
          return (
            <Paper
              key={id}
              elevation={isChecked ? 6 : 1}
              onClick={() => toggleCheck(type, id)}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderRadius: 2,
                border: '2px solid',
                borderColor: isChecked ? 'success.main' : 'grey.300',
                backgroundColor: isChecked ? 'success.light' : 'background.paper',
                '&:hover': { backgroundColor: isChecked ? 'success.light' : 'grey.100' }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: isChecked ? 'bold' : 'normal', color: isChecked ? 'white' : 'text.primary' }}>{label}</Typography>
                {isChecked && <CheckCircleIcon sx={{ color: 'white' }} />}
              </Box>
              {isLevelItem && isChecked && (
                <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                  <InputLabel>Level</InputLabel>
                  <Select
                    value={levels[id] || ''}
                    onChange={(e) => handleLevelChange(e.target.value, type, id)}
                  >
                    {levelOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
            </Paper>
          );
        })}
      </Box>
    </Paper>
  );

  const allSelectedDefects = [
    ...Object.entries(form.interiorChecks).filter(([_, v]) => v),
    ...Object.entries(form.exteriorChecks).filter(([_, v]) => v),
    ...Object.entries(form.startupChecks).filter(([_, v]) => v)
  ];

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 3, mb: 5 }}>
      {/* Vehicle & mileage */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Vehicle"
              fullWidth
              value={form.vehicleId}
              onChange={(e) => updateForm({ vehicleId: e.target.value })}
            >
              {vehicles.map(v => <MenuItem key={v.id} value={v.id}>{v.reg_number} - {v.make} {v.model}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Mileage"
              type="number"
              fullWidth
              value={form.mileage}
              onChange={(e) => updateForm({ mileage: e.target.value })}
            />
          </Grid>
        </Grid>
        <TextField
          label="Notes"
          fullWidth
          multiline
          rows={3}
          sx={{ mt: 2 }}
          value={form.notes}
          onChange={(e) => updateForm({ notes: e.target.value })}
        />
      </Paper>

      {/* Checklists */}
      {renderChecklist(templates.interior, 'interior', form.interiorChecks)}
      {renderChecklist(templates.exterior, 'exterior', form.exteriorChecks, form.exteriorFuelLevels)}
      {renderChecklist(templates.startup, 'startup', form.startupChecks, form.startupLevels)}

      {/* Media Preview */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>Media</Typography>
        {Object.keys(previews).length > 0 ? (
          <Grid container spacing={2}>
            {Object.entries(previews).map(([label, url]) => (
              <Grid item xs={6} sm={4} md={3} key={label}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  {form.filesByLabel[label]?.type.startsWith('image') ? (
                    <img src={url} alt={label} style={{ width: '100%', borderRadius: 4 }} />
                  ) : (
                    <video src={url} style={{ width: '100%', borderRadius: 4 }} controls />
                  )}
                  <Typography variant="caption">{label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : <Typography>No media uploaded.</Typography>}
      </Paper>

      {/* Defect comments */}
      {allSelectedDefects.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Comments per Defect</Typography>
          {allSelectedDefects.map(([id]) => (
            <TextField
              key={id}
              label={`Comment for ${id}`}
              fullWidth
              multiline
              rows={2}
              sx={{ mb: 2 }}
              value={form.comments?.[id] || ''}
              onChange={(e) => handleCommentChange(id, e.target.value)}
            />
          ))}
        </Paper>
      )}

      {/* Signature */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>Signature</Typography>
        <Box ref={signatureCanvasWrapperRef} sx={{ border: '1px solid grey', borderRadius: 2, height: 200, mb: 1 }}>
          <SignatureCanvas ref={sigCanvasRef} penColor="black" canvasProps={{ width: 400, height: 200 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={clearSignature}>Clear</Button>
          <Button variant="contained" onClick={saveSignature}>Save</Button>
        </Box>
      </Paper>

      <Button variant="contained" color="success" fullWidth onClick={handleSubmit}>
        Save Inspection
      </Button>
    </Box>
  );
}

