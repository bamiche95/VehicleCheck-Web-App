import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  useMediaQuery,
  useTheme,
  Box,
  Slide,
  CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';
import StepVehicle from './steps/StepVehicle';
import StepInterior from './steps/StepInterior';
import StepExterior from './steps/StepExterior';
import StepMedia from './steps/StepMedia';
import StepReview from './steps/StepReview';
import StepStartup from './steps/stepStartupCheck';
import BASE_URL from '../config';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';

const steps = ['Select Vehicle', 'Startup Check', 'Interior Check', 'Exterior Check', 'Upload Media', 'Review & Submit'];

export default function CreateInspection({ open, handleClose, onSubmitSuccess, isEdit = false, editId = null }, initialData = {} ) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [reviewValid, setReviewValid] = useState(true);

  const [startupItems, setStartupItems] = useState([]);
  const [interiorItems, setInteriorItems] = useState([]);
  const [exteriorItems, setExteriorItems] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);


const [form, setForm] = useState({
  vehicleId: initialData.vehicle?.id || '',
  vehicle: initialData.vehicle || null,
  trailerId: initialData.trailer?.id || '',
  trailer: initialData.trailer || null,
  hasTrailer: initialData.hasTrailer ?? !!initialData.trailer, // <-- use trailer existence if hasTrailer is undefined
  mileage: initialData.mileage || '',
  startupChecks: {},
  startupLevels: {},
  interiorChecks: {},
  exteriorChecks: {},
  comments: {},
  filesByLabel: {},
  signature: ''
});


const handleNext = (items) => {
  // Step 0 validation: Vehicle and Mileage
  if (activeStep === 0) {
    if (!form.vehicleId) {
      alert('Please select a vehicle before proceeding.');
      return;
    }

    if (!form.mileage || String(form.mileage).trim() === '') {
      alert('Please enter the vehicle mileage before proceeding.');
      return;
    }

    // <<< Add trailer validation here >>>
    if (form.hasTrailer && !form.trailerId) {
      alert('Please select a trailer before proceeding.');
      return;
    }
  }

  // Step 1 validation: Startup checks...
  const mandatoryLevels = ['fuel level', 'adblue level', 'oil level'];
  if (activeStep === 1) {
    const allLevelsFilled = mandatoryLevels.every(levelLabel => {
      const levelItem = items.find(item => item.label.toLowerCase().includes(levelLabel));
      if (!levelItem) return false;
      return !!form.startupLevels[levelItem.id];
    });

    if (!allLevelsFilled) {
      alert('Please fill out all mandatory levels (Fuel, AdBlue, Oil) before proceeding.');
      return;
    }
  }

  // Step 4 validation: Media...
  if (activeStep === 4 && !form.mediaIsValid) {
    alert('Please upload all mandatory exterior photos (Off Side, Near Side, Front, Back).');
    return;
  }

  // If all checks pass
  setActiveStep((prev) => prev + 1);
};


  const handleBack = () => setActiveStep((prev) => prev - 1);

  const updateForm = useCallback((updates) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  // -------- Load checklists --------
  useEffect(() => {
    async function fetchChecklists() {
      try {
        const [resStartup, resInterior, resExterior] = await Promise.all([
          fetch(`${BASE_URL}/api/checklist-templates?section=STARTUP CHECKS`, { credentials: 'include' }),
          fetch(`${BASE_URL}/api/checklist-templates?section=INTERIOR`, { credentials: 'include' }),
          fetch(`${BASE_URL}/api/checklist-templates?section=EXTERIOR`, { credentials: 'include' })
        ]);

        const dataStartup = await resStartup.json();
        const dataInterior = await resInterior.json();
        const dataExterior = await resExterior.json();

        setStartupItems(dataStartup['STARTUP CHECKS'] || []);
        setInteriorItems(dataInterior.INTERIOR || []);
        setExteriorItems(dataExterior.EXTERIOR || []);
      } catch (err) {
        console.error('Failed to load checklist templates:', err);
      }
    }
    fetchChecklists();
  }, []);

  // -------- Load existing inspection for Edit --------
useEffect(() => {
  if (!isEdit || !editId || startupItems.length === 0) return;

  const findIdByLabel = (items, label) => {
    const normalizedLabel = label.toLowerCase().replace(/\s/g, '');
    const foundItem = items.find(item => {
      const normalizedItemLabel = item.label.toLowerCase().replace(/\s/g, '');
      return normalizedItemLabel === normalizedLabel;
    });
    return foundItem ? foundItem.id : null;
  };

  async function fetchInspection() {
    try {
      const res = await fetch(`${BASE_URL}/api/inspections/${editId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load inspection data');
      const data = await res.json();

      const { checklist, responses, mediaByLabel, fuelLevels, trailer } = data; // <-- trailer included
      const startupChecks = {};
      const interiorChecks = {};
      const exteriorChecks = {};
      const comments = {};
      const startupLevels = {};

      responses.forEach((r) => {
        const id = r.template_item_id;
        const isDefective = Boolean(r.is_defective);
        const section = r.section.toUpperCase();

        if (section === 'STARTUP CHECKS') startupChecks[id] = isDefective;
        else if (section === 'INTERIOR') interiorChecks[id] = isDefective;
        else if (section === 'EXTERIOR') exteriorChecks[id] = isDefective;

        if (r.comments && r.comments.length > 0) {
          comments[id] = r.comments.join(', ');
        }
      });

      Object.entries(fuelLevels).forEach(([key, level]) => {
        const id = findIdByLabel(startupItems, key);
        if (id) startupLevels[id] = level;
      });

      const filesByLabel = {};
      Object.entries(mediaByLabel).forEach(([label, files]) => {
        if (files.length > 0) filesByLabel[label] = files[0];
      });

setForm(prev => ({
  ...prev,
  vehicleId: checklist.vehicle_id || prev.vehicleId,
  vehicle: { id: checklist.vehicle_id, reg_number: checklist.vehicle_reg_number } || prev.vehicle,
  trailerId: checklist.trailer?.id || prev.trailerId,
  trailer: checklist.trailer || prev.trailer,
  hasTrailer: !!checklist.trailer || prev.hasTrailer,
  mileage: checklist.mileage || prev.mileage,
  startupChecks,
  startupLevels,
  interiorChecks,
  exteriorChecks,
  comments,
  filesByLabel,
  signature: checklist.signature || prev.signature
}));


    } catch (err) {
      console.error('Failed to load inspection:', err);
    }
  }

  fetchInspection();
}, [isEdit, editId, startupItems]);


const handleSubmit = async () => {
  if (!reviewValid) {
    toast.error('Please fill out all comments for selected defects and provide a signature.');
    return;
  }

  setLoading(true); // start loading

  const formData = new FormData();
  formData.append('vehicle_id', form.vehicleId);
  formData.append('mileage', form.mileage);
  formData.append('signature', form.signature);
  if (form.hasTrailer && form.trailerId) {
  formData.append('trailer_id', form.trailerId); // <-- make sure this is included
}

  Object.entries(form.startupChecks).forEach(([id, val]) => val && formData.append(`startup_${id}`, '1'));
  Object.entries(form.startupLevels).forEach(([id, val]) => val && formData.append(`startup_level_${id}`, val));
  Object.entries(form.interiorChecks).forEach(([id, val]) => val && formData.append(`interior_${id}`, '1'));
  Object.entries(form.exteriorChecks).forEach(([id, val]) => val && formData.append(`exterior_${id}`, '1'));
  Object.entries(form.comments).forEach(([id, comment]) => comment && formData.append(`comment_${id}`, comment));

  const existingMediaIds = [];
  Object.entries(form.filesByLabel).forEach(([label, file]) => {
    if (!(file instanceof File) && file.id) existingMediaIds.push(file.id);
  });
  formData.append('existing_media_ids', JSON.stringify(existingMediaIds));

  Object.entries(form.filesByLabel).forEach(([label, file]) => {
    if (file instanceof File) {
      formData.append('media', file);
      formData.append('media_labels', label);
    }
  });

  try {
    const url = isEdit
      ? `${BASE_URL}/api/inspections/${editId}`
      : `${BASE_URL}/api/inspections`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, { method, credentials: 'include', body: formData });
    if (!res.ok) throw new Error('Failed to save inspection.');

    toast.success(isEdit ? 'Inspection updated!' : 'Inspection submitted!');
    handleClose?.();
    onSubmitSuccess?.();
  } catch (err) {
    toast.error(err.message);
  } finally {
    setLoading(false); // stop loading
  }
};


  return (
    <Dialog
      fullScreen={fullScreen}
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slots={{ transition: Slide }}
      slotProps={{ transition: { direction: 'up' } }}
      PaperProps={{ sx: { borderTopLeftRadius: '20px', borderTopRightRadius: '20px' } }}
    >
      <DialogTitle
        sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        {isEdit ? 'Edit Vehicle Inspection' : 'Create Vehicle Inspection'}
        <IconButton aria-label="close" onClick={handleClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          backgroundColor: 'grey.200',
          p: 2,
          borderRadius: '10px',
        }}>
          <Stepper activeStep={activeStep} sx={{ minWidth: '600px' }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box mt={3}>
          {activeStep === 0 && <StepVehicle form={form} updateForm={updateForm} />}
          {activeStep === 1 && <StepStartup form={form} updateForm={updateForm} items={startupItems} />}
          {activeStep === 2 && <StepInterior form={form} updateForm={updateForm} items={interiorItems} />}
          {activeStep === 3 && <StepExterior form={form} updateForm={updateForm} items={exteriorItems} />}
          {activeStep === 4 && <StepMedia form={form} updateForm={updateForm} />}
          {activeStep === 5 && (
            <StepReview
              form={form}
              interiorItems={interiorItems}
              exteriorItems={exteriorItems}
              startupItems={startupItems}
              updateForm={updateForm}
              filesByLabel={form.filesByLabel}
              setReviewValidity={setReviewValid}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ pb: 3 }}>
        {activeStep > 0 && <Button onClick={handleBack}>Back</Button>}
        {activeStep < steps.length - 1 ? (
          <Button onClick={() => handleNext(startupItems)} variant="contained">Next</Button>
        ) : (
          <Button
  onClick={handleSubmit}
  variant="contained"
  disabled={loading} // disable while submitting
>
  {loading ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <CircularProgress size={20} color="inherit" />
      Submitting...
    </Box>
  ) : (
    'Submit'
  )}
</Button>

        )}
      </DialogActions>
    </Dialog>
  );
}