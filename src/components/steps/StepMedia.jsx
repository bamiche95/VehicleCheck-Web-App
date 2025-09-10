import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import BASE_URL from '../../config';
const EXTERIOR_LABELS = ['Off Side', 'Near Side', 'Front', 'Back'];
const INTERIOR_LABELS = ['Dashboard', 'Cab'];
const DEFECT_LABELS= ['Defect 1', 'Defect 2'];

export default function StepMedia({ form, updateForm }) {
  const fileInputRef = useRef(null);

  // We’ll keep files mapped by label for simplicity
  // Example shape: { "Off Side": File, "Dashboard": File, ... }
  const filesByLabel = form.filesByLabel || {};

  // Local previews URLs by label
  const [previews, setPreviews] = useState({});

  // Update previews whenever filesByLabel changes
useEffect(() => {
  const newPreviews = {};

  Object.entries(filesByLabel).forEach(([label, file]) => {
    // Only create object URL if it's a File object
    if (file instanceof File) {
      newPreviews[label] = URL.createObjectURL(file);
    } else if (file?.file_path) {
      // For existing media from server, use full URL
      newPreviews[label] = `${BASE_URL}${file.file_path}`;
    }
  });

  setPreviews(newPreviews);

  // Cleanup only for local Files
  return () => {
    Object.entries(filesByLabel).forEach(([label, file]) => {
      if (file instanceof File && newPreviews[label]) {
        URL.revokeObjectURL(newPreviews[label]);
      }
    });
  };
}, [filesByLabel]);


useEffect(() => {
    // Initial validation check
    const isInitiallyValid = EXTERIOR_LABELS.every(
        (label) => !!form.filesByLabel?.[label]
    );

    // Only update if the status is different to avoid unnecessary re-renders
    if (form.mediaIsValid !== isInitiallyValid) {
        updateForm({ mediaIsValid: isInitiallyValid });
    }
}, [form.filesByLabel, updateForm, form.mediaIsValid]);


  const openFileDialog = (label) => {
    fileInputRef.current.dataset.label = label; // store label for which placeholder opened file picker
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const label = e.target.dataset.label;
    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length === 0) return;

    const newFile = selectedFiles[0];
    const newFilesByLabel = {
        ...filesByLabel,
        [label]: newFile,
    };

    // Check if all mandatory exterior labels have a file
    const newMediaIsValid = EXTERIOR_LABELS.every(
        (extLabel) => !!newFilesByLabel[extLabel]
    );

    updateForm({
        filesByLabel: newFilesByLabel,
        mediaIsValid: newMediaIsValid,
    });

    e.target.value = null;
};

const removeFile = (label) => {
    const updated = { ...filesByLabel };
    delete updated[label];

    // Check validation status after removing the file
    const newMediaIsValid = EXTERIOR_LABELS.every(
        (extLabel) => !!updated[extLabel]
    );

    updateForm({ filesByLabel: updated, mediaIsValid: newMediaIsValid });
};



  // Single Placeholder component:
  const PlaceholderBox = ({ label }) => {
  const file = filesByLabel[label];
  const previewUrl = previews[label] || (file?.file_path ? BASE_URL + file.file_path : null);

  // Determine if it's an image
  const isImage = file?.type ? file.type.startsWith('image') : true; // default to image for existing media

  return (
    <Box
      sx={{
        width: 120,
        height: 120,
        borderRadius: 2,
        border: file ? 'none' : '2px dashed #aaa',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#777',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          borderColor: file ? 'none' : 'primary.main',
          color: file ? 'inherit' : 'primary.main',
        },
        userSelect: 'none',
        backgroundColor: file ? 'transparent' : 'inherit',
      }}
      onClick={() => {
        if (!file) openFileDialog(label);
      }}
      aria-label={`Upload ${label} media`}
    >
      {!file ? (
        <>
          <AddIcon fontSize="large" />
          <Typography variant="caption" align="center" sx={{ mt: 1 }}>
            {label}
          </Typography>
        </>
      ) : (
        <>
          {isImage ? (
            <img
              src={previewUrl}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <video
              src={previewUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted
              controls={false}
              loop
              autoPlay
            />
          )}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // prevent triggering file picker
              removeFile(label);
            }}
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
            }}
            aria-label={`Remove ${label} media`}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      )}
    </Box>
  );
};


  return (
    <>
      <Typography variant="h6" gutterBottom>
        Exterior Photos
      </Typography>
      <Box display="flex" gap={2} flexWrap="wrap" mb={4}>
        {EXTERIOR_LABELS.map((label) => (
          <PlaceholderBox key={label} label={label} />
        ))}
      </Box>

      <Typography variant="h6" gutterBottom>
        Interior Photos
      </Typography>
      <Box display="flex" gap={2} flexWrap="wrap" mb={4}>
        {INTERIOR_LABELS.map((label) => (
          <PlaceholderBox key={label} label={label} />
        ))}
      </Box>
<Typography variant="h6" gutterBottom>
  Defect Photos
</Typography>
<Box display="flex" gap={2} flexWrap="wrap" mb={4}>
  {DEFECT_LABELS.map((label) => (
    <PlaceholderBox key={label} label={label} />
  ))}
</Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
}
