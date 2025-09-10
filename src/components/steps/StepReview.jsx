import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Paper,
  Chip,
  Button
} from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';
import BASE_URL from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '@mui/material/styles';

export default function StepReview({
  form,
  interiorItems = [],
  exteriorItems = [],
  startupItems = [],
  updateForm,
  filesByLabel = {},
  setReviewValidity
}) {
  const sigCanvasRef = useRef(null);
  const signatureCanvasWrapperRef = useRef(null);
  const [savedSignature, setSavedSignature] = useState(null);
  const [usingSaved, setUsingSaved] = useState(false);
  const { user } = useAuth();
  const theme = useTheme();
  const [previews, setPreviews] = useState({});
  const [commentError, setCommentError] = useState(false);

  // Utility to get label by ID
  const getLabel = (items, id) => {
    const found = items.find((item) => item.id === Number(id));
    return found ? found.label : id;
  };

  const interiorChecked = Object.entries(form.interiorChecks || {}).filter(([_, checked]) => checked);
  const exteriorChecked = Object.entries(form.exteriorChecks || {}).filter(([_, checked]) => checked);
  const startupChecked = Object.entries(form.startupChecks || {}).filter(([_, checked]) => checked);

  const anyChecksSelected = interiorChecked.length > 0 || exteriorChecked.length > 0 || startupChecked.length > 0;

  // Comment & signature validation
  useEffect(() => {
    const defects = [...interiorChecked, ...exteriorChecked, ...startupChecked];
    let allCommentsFilled = true;
    defects.forEach(([id]) => {
      if (!form.comments?.[id] || form.comments[id].trim() === '') {
        allCommentsFilled = false;
      }
    });

    const isSignatureValid = !!form.signature;
    setCommentError(anyChecksSelected && !allCommentsFilled);
    if (setReviewValidity) setReviewValidity(allCommentsFilled && isSignatureValid);
  }, [form.comments, form.signature, anyChecksSelected, interiorChecked, exteriorChecked, startupChecked, setReviewValidity]);

  // Media previews
  useEffect(() => {
    const newPreviews = {};
    Object.entries(filesByLabel).forEach(([label, file]) => {
      const isLocalFile = file instanceof File;
      if (isLocalFile) {
        newPreviews[label] = URL.createObjectURL(file);
      }
    });

    setPreviews(newPreviews);

    return () => {
      Object.values(newPreviews).forEach(URL.revokeObjectURL);
    };
  }, [filesByLabel]);

  // Fetch saved signature
  useEffect(() => {
    const fetchSignature = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`${BASE_URL}/api/signature/${user.id}`, {
          method: 'GET',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.signature) {
            setSavedSignature(data.signature);
            setUsingSaved(true);
            updateForm({ signature: data.signature });
          }
        }
      } catch (err) {
        console.error('Error fetching saved signature:', err);
      }
    };
    fetchSignature();
  }, [user?.id, updateForm]);

  // Signature canvas resizing
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
    const canvas = sigCanvasRef.current.getCanvas();
    const sigData = canvas.toDataURL('image/png');
    updateForm({ signature: sigData });
    setUsingSaved(false);

    fetch(`${BASE_URL}/api/users/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ signature: sigData })
    })
      .then(res => res.json())
      .then(() => setSavedSignature(sigData))
      .catch(err => console.error('Error saving signature:', err));
  };

  const useSavedSignature = () => {
    if (savedSignature) {
      updateForm({ signature: savedSignature });
      setUsingSaved(true);
    }
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Vehicle Info */}
// Inside StepReview component, in the Vehicle Info Paper section
<Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
  <Typography variant="h6" gutterBottom>Vehicle Information</Typography>
  <Grid container spacing={2}>
    <Grid item xs={12} sm={4}>
      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Vehicle Reg Number:</Typography>
      <Typography>{form.vehicle?.reg_number || 'No vehicle selected.'}</Typography>
    </Grid>
    <Grid item xs={12} sm={4}>
      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Mileage:</Typography>
      <Typography>{form.mileage || 'N/A'}</Typography>
    </Grid>
    <Grid item xs={12} sm={4}>
      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Trailer Reg Number:</Typography>
      <Typography>{form.trailer?.reg_number || 'N/A'}</Typography>
    </Grid>
  </Grid>
</Paper>


      {/* Defects */}
      {anyChecksSelected && (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Defects Detected</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {interiorChecked.map(([id]) => (
              <Chip key={`int-def-${id}`} label={getLabel(interiorItems, id)} color="warning" />
            ))}
            {exteriorChecked.map(([id]) => (
              <Chip key={`ext-def-${id}`} label={getLabel(exteriorItems, id)} color="warning" />
            ))}
            {startupChecked.map(([id]) => (
              <Chip key={`startup-def-${id}`} label={getLabel(startupItems, id)} color="warning" />
            ))}
          </Box>
        </Paper>
      )}

      {/* Uploaded Media */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>Uploaded Media</Typography>
        <Grid container spacing={2}>
          {Object.entries(filesByLabel).map(([label, file]) => {
            const isLocalFile = file instanceof File;
            const previewUrl = isLocalFile ? previews[label] : `${BASE_URL}${file.file_path}`;
            const isImage = file?.type?.startsWith('image') || (file?.file_path && file.file_path.match(/\.(jpg|jpeg|png|gif)$/i));

            return (
              <Grid item xs={6} sm={4} md={3} key={label}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  {isImage ? (
                    <img
                      src={previewUrl}
                      alt={label}
                      style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : (
                    <video
                      src={previewUrl}
                      style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 4 }}
                      muted
                      controls={false}
                      loop
                      autoPlay
                    />
                  )}
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {label}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Dynamic Comments per defect */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>Comments / Additional Notes</Typography>
        {anyChecksSelected ? (
          <>
            {[...interiorChecked, ...exteriorChecked, ...startupChecked].map(([id]) => {
              const label = interiorChecked.find(([i]) => i === id)
                ? getLabel(interiorItems, id)
                : exteriorChecked.find(([i]) => i === id)
                  ? getLabel(exteriorItems, id)
                  : getLabel(startupItems, id);

              return (
                <Box key={id} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    label={`Comment for ${label}`}
                    value={form.comments?.[id] || ''}
                    onChange={(e) =>
                      updateForm({
                        comments: {
                          ...form.comments,
                          [id]: e.target.value,
                        },
                      })
                    }
                    multiline
                    rows={2}
                    error={commentError && (!form.comments?.[id] || form.comments[id].trim() === '')}
                  />
                </Box>
              );
            })}
          </>
        ) : (
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            No defects selected, no comments required.
          </Typography>
        )}
      </Paper>

      {/* Signature */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>Signature</Typography>
        {usingSaved && savedSignature ? (
          <Box>
            <Typography variant="body2" color="text.secondary">Using saved signature:</Typography>
            <img
              src={savedSignature}
              alt="Saved Signature"
              style={{ border: '1px solid #ccc', borderRadius: 4, maxWidth: '100%', height: 'auto' }}
            />
            <Button variant="contained" onClick={() => setUsingSaved(false)} sx={{ mt: 2 }}>
              Draw New Signature
            </Button>
          </Box>
        ) : (
          <Box>
            <Box
              ref={signatureCanvasWrapperRef}
              sx={{
                border: '1px solid #ccc',
                borderRadius: 2,
                overflow: 'hidden',
                height: 200,
                width: '100%',
                backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
              }}
            >
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="black"
                canvasProps={{ className: 'sigCanvas' }}
                onEnd={saveSignature}
              />
            </Box>
            <Box mt={2} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button onClick={clearSignature} variant="outlined" color="secondary">
                Clear
              </Button>
              <Button onClick={saveSignature} variant="contained" color="primary">
                Save
              </Button>
              {savedSignature && (
                <Button onClick={useSavedSignature} variant="outlined">
                  Use Saved
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}