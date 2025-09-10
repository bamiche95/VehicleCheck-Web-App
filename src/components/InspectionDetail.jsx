import React, { useEffect, useState, } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  Divider,
  Link,
  Card,
  Dialog,
  IconButton,
  Button,
  Grid,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  useTheme,
  Paper,
  ListItemText,
  useMediaQuery // Imported useMediaQuery
} from '@mui/material';
import { Tabs, Tab } from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import StraightenIcon from '@mui/icons-material/Straighten';
import NumbersIcon from '@mui/icons-material/Numbers';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import BASE_URL from '../config';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SignatureCanvas from 'react-signature-canvas';
import CreateInspection from './CreateInspection';
const InspectionDetail = () => {
  const { id } = useParams();
  const [checklist, setChecklist] = useState(null);
  const [responses, setResponses] = useState([]);
  const [media, setMedia] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [fuelLevels, setFuelLevels] = useState(null);
  const theme = useTheme();
  // Add near the other useState hooks
const [editInspectionId, setEditInspectionId] = useState(null);

const [history, setHistory] = useState([]);


  // Determine if the screen is mobile or desktop
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
const [userRole, setUserRole] = useState('');
  // State for media viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  //history state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const flatMedia = Object.values(media).flat();


  const handleTabChange = (event, newValue) => setTabIndex(newValue);



  // Convert label + index to flatMedia index
  const flatMediaIndex = (label, indexInLabel) => {
    let index = 0;
    for (const key of Object.keys(media)) {
      if (key === label) {
        return index + indexInLabel;
      }
      index += media[key].length;
    }
    return 0; // fallback
  };

const refreshList = () => {
  // Re-fetch the inspection data
  fetch(`${BASE_URL}/api/inspections/${id}`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      setChecklist(data.checklist);
      setResponses(data.responses);
      setMedia(data.mediaByLabel || {});
      setFuelLevels(data.fuelLevels || null);
      setHistory(data.history || []);
    });
};


useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = await fetch(`${BASE_URL}/api/profile`, { credentials: 'include' });
      const profileData = await profileRes.json();
      setUserRole(profileData.role);

      const inspectionRes = await fetch(`${BASE_URL}/api/inspections/${id}`, { credentials: 'include' });
      const data = await inspectionRes.json();
      setChecklist(data.checklist);
      setResponses(data.responses);
      setMedia(data.mediaByLabel || {});
      setFuelLevels(data.fuelLevels || null);
      setHistory(data.history || []); // <-- ADD THIS LINE

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [id]);



  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const handleDelete = () => {
    setDeleteDialogOpen(false); // Close the dialog first
    fetch(`${BASE_URL}/api/inspections/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to delete inspection');
        }
        return res.json();
      })
      .then(() => {
        navigate('/dashboard/inspections');
      })
      .catch((err) => {
        console.error('Error deleting inspection:', err.message);
      });
  };

  
  const exportToExcel = () => {
    if (!checklist) return;

   const excludedLabels = ['adblue', 'fuel', 'oil'];

    const defects = responses.filter(r => r.is_defective === 1 && !excludedLabels.some(exLabel => r.label.toLowerCase().includes(exLabel)));
    const defectsString = defects.map(r => r.label).join(', ');

    const dataForExcel = [
      {
        'Inspection ID': id,
        'Registration Number': checklist.vehicle_reg_number,
        'Trailer Number': checklist.trailer_reg_number,
        'Driver Name': checklist.user_full_name,
        'Date and Time': formatDateTime(checklist.submitted_at),
        'Defects Count': defects.length,
        'Driver Comments': checklist.notes?.trim() || 'No driver comments submitted',
        'Defects': defectsString,
        'Adblue Level': fuelLevels?.adblueLevel || 'N/A',
        'Fuel Level': fuelLevels?.fuelLevel || 'N/A',
        'Oil Level': fuelLevels?.oilLevel || 'N/A',
        

      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspection Detail');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const fileName = `inspection_${id}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, fileName);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportToPDF = async () => {
    if (!checklist) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Placeholder for logo
    const logoUrl = '/recman_logo.jpg';
    let logoBase64 = null;
    try {
      logoBase64 = await getBase64ImageFromURL(logoUrl);
    } catch (err) {
      console.warn('Logo load failed, skipping logo:', err);
    }

    const logoWidth = 40;
    const logoHeight = 20;
    let yPos = 10;

    if (logoBase64) {
      doc.addImage(logoBase64, 'JPEG', 14, yPos, logoWidth, logoHeight);
    }

    // Company address top right
    doc.setFontSize(10);
    doc.setTextColor('#444');
    const address = '106 Aston church road, Nechells, B7 5RX';
    doc.text(address, pageWidth - 14, yPos + 8, { align: 'right' });

    yPos += 20;

    // Title centered
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000');
    doc.text('Vehicle Inspection Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Driver & Vehicle info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Driver: ${checklist.user_full_name || 'N/A'}`, 14, yPos);
    doc.text(`Vehicle Reg: ${checklist.vehicle_reg_number || 'N/A'}`, pageWidth - 14, yPos, { align: 'right' });
    yPos += 8;
  
    doc.text(`Trailer Reg: ${checklist.trailer_reg_number || 'N/A'}`, pageWidth - 14, yPos, { align: 'right' });
    yPos += 8;
    doc.text(`Defect Number: ${checklist.defect_number || 'N/A'}`, pageWidth - 14, yPos, { align: 'right' });
    yPos += 8;
    doc.text(`Date & Time: ${formatDateTime(checklist.submitted_at) || 'N/A'}`, pageWidth - 14, yPos, { align: 'right' });
    yPos += 8;
    // Defect count & fuel levels
   const excludedLabels = ['adblue', 'fuel', 'oil'];
const defectsCount = responses.filter(
  r => r.is_defective === 1 && !excludedLabels.some(exLabel => r.label.toLowerCase().includes(exLabel))
).length;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Defects: ${defectsCount}`, 14, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Adblue Level: ${fuelLevels?.adblueLevel ?? 'N/A'}`, 14, yPos);
    yPos += 8;
    doc.text(`Fuel Level: ${fuelLevels?.fuelLevel ?? 'N/A'}`, 14, yPos);
    yPos += 8;
    doc.text(`Oil Level: ${fuelLevels?.oilLevel ?? 'N/A'}`, 14, yPos);
    yPos += 8;


    const defectItems = responses
      .filter(r => r.is_defective === 1 && !excludedLabels.some(exLabel => r.label.toLowerCase().includes(exLabel)))
      .map((r, index) => [index + 1, r.label]);

    if (defectItems.length > 0) {
      autoTable(doc, {
        startY: yPos + 5,
        head: [['S/N', 'Defect']],
        body: defectItems,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [0, 123, 255] },
      });
      yPos = doc.lastAutoTable.finalY + 10;
    } else {
      doc.text('No defects recorded.', 14, yPos + 10);
      yPos += 20;
    }

    // Vehicle media images
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Vehicle Media', 14, yPos);
    yPos += 5;

    let xPos = 14;
    const maxWidth = pageWidth - 28;
    const thumbSize = 40;

    for (const m of flatMedia) {
      const isImage = m.file_path.match(/\.(jpeg|jpg|gif|png|bmp|webp)$/i);
      if (!isImage) continue;

      try {
        const base64 = await getBase64ImageFromURL(m.file_path);

        if (xPos + thumbSize > maxWidth + 14) {
          xPos = 14;
          yPos += thumbSize + 5;
          if (yPos + thumbSize > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            yPos = 14;
          }
        }
        doc.addImage(base64, 'JPEG', xPos, yPos, thumbSize, thumbSize);
        xPos += thumbSize + 5;
      } catch (e) {
        console.warn('Failed to load image for PDF:', m.file_path);
      }
    }
    yPos += thumbSize + 10;
    if (yPos + 40 > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = 14;
    }

    // Add signature at the bottom
    if (checklist.signature) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Driver Signature', 14, yPos);
      let sigImg = new Image();
      sigImg.src = checklist.signature;
      doc.addImage(sigImg, 'PNG', 14, yPos + 5, 80, 40);
    }
    doc.save(`inspection_${id}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
      var img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var dataURL = canvas.toDataURL('image/jpeg');
        resolve(dataURL);
      };
      img.onerror = function (error) {
        reject(error);
      };
      img.src = url;
    });
  };

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/api/inspections/${id}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Inspection not found');
        return res.json();
      })
      .then(data => {
        setChecklist(data.checklist);
        setResponses(data.responses);
        setMedia(data.mediaByLabel || {});
        setFuelLevels(data.fuelLevels || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!checklist) {
    return (
      <Box p={2}>
        <Typography variant="h6">Inspection not found</Typography>
        <Link component={RouterLink} to="/inspections">
          Back to list
        </Link>
      </Box>
    );
  }



  const groupedResponses = responses.reduce((acc, response) => {
    const { section } = response;
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(response);
    return acc;
  }, {});

  const openViewer = (index) => {
    setCurrentMediaIndex(index);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
  };

  const goPrev = () => {
    setCurrentMediaIndex((idx) => (idx === 0 ? flatMedia.length - 1 : idx - 1));
  };

  const goNext = () => {
    setCurrentMediaIndex((idx) => (idx === flatMedia.length - 1 ? 0 : idx + 1));
  };

const excludedLabels = ['adblue', 'fuel', 'oil'];

const defectsCount = responses.filter(
  r => r.is_defective === 1 && excludedLabels.every(exLabel => !r.label.toLowerCase().includes(exLabel))
).length;

  const DetailCard = ({ icon, label, value }) => (
    <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
      <Box sx={{ color: '#4CAF50', display: 'flex', alignItems: 'center' }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          {value || 'N/A'}
        </Typography>
      </Box>
    </Card>
  );




// Determine the back path based on role and screen size
const backPath = userRole === 'driver' ? '/driver-dashboard' : '/dashboard/inspections';


  return (

    <Box mt={10} mx={1}>
         {/* Action Buttons */}
<Box
  display="flex"
  justifyContent="space-between"
  alignItems="center"
  mb={4}
  gap={2}
>
  {/* Back button: always visible */}
  <Button
    variant="contained"
    color="success"
    startIcon={<ArrowBackIcon />}
    sx={{ textTransform: 'none' }}
    onClick={() => navigate(backPath)}
  >
    Back to List
  </Button>

  {/* Export and Delete buttons: conditionally visible */}
  {userRole !== 'driver' && (


    <Box
      display={{ xs: 'none', sm: 'flex' }} // hide on mobile, show on sm+
      gap={2}
    >

       <Box display={{ xs: 'none', sm: 'flex' }} gap={2}>
<Button
  variant="outlined"
  onClick={() => setEditInspectionId(id)} // use the current inspection id
>
  Edit
</Button>

    {/* Existing Export/Delete buttons */}
  </Box>
      <Button
        variant="contained"
        onClick={exportToExcel}
        startIcon={<FileDownloadIcon />}
        sx={{ textTransform: 'none' }}
      >
        Export to Excel
      </Button>
      <Button
        variant="contained"
        onClick={exportToPDF}
        startIcon={<DescriptionIcon />}
        sx={{ textTransform: 'none' }}
      >
        Export to PDF
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={() => setDeleteDialogOpen(true)}
        startIcon={<DeleteIcon />}
        sx={{ textTransform: 'none' }}
      >
        Delete Inspection
      </Button>
        <Button
    variant="outlined"
    onClick={() => setHistoryDialogOpen(true)}
    sx={{ textTransform: 'none' }}
  >
    View History
  </Button>
    </Box>
    
  )}
</Box>


       <Divider sx={{ my: 4 }} />



   {/* Header and Details Grid */}
  <Grid container spacing={3}>
  <Grid size={{ xs: 12 }}>
    <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#388E3C' }}>
        Inspection Report
    </Typography>
    <Typography variant="subtitle1" color="text.secondary">
        Details for inspection ID: {id}
    </Typography>

    {/* This is the new conditional rendering */}
    {checklist.modified_at && checklist.modified_by_full_name && (
        <Typography variant="subtitle1" color="text.secondary">
            This Inspection was modified by {checklist.modified_by_full_name} at {formatDateTime(checklist.modified_at)}
        </Typography>
    )}
</Grid>

    <Grid size={{ xs: 12,  }}>
      <Box sx={{
        p: 2,
        borderRadius: 3,
        background: 'linear-gradient(to right, #e8f5e9, #c8e6c9)',
        boxShadow: 3,
        overflowX: 'auto' // ensures no overflow issues on small screens
      }}>
        <Grid container spacing={2}>
          {[
            { icon: <DirectionsCarFilledIcon />, label: "Registration Number", value: checklist.vehicle_reg_number },
            { icon: <PersonIcon />, label: "Driver Name", value: checklist.user_full_name },
            { icon: <CalendarMonthIcon />, label: "Date & Time", value: new Date(checklist.submitted_at).toLocaleString() },
            { icon: <ErrorOutlineIcon />, label: "Defects", value: defectsCount },
           // After (correct)
// ...
{ icon: <LocalGasStationIcon />, label: "Adblue Level", value: fuelLevels?.adblueLevel || 'N/A' },
{ icon: <LocalGasStationIcon />, label: "Fuel Level", value: fuelLevels?.fuelLevel || 'N/A' },
{ icon: <LocalGasStationIcon />, label: "Oil Level", value: fuelLevels?.oilLevel || 'N/A' },
// ...

            { icon: <StraightenIcon />, label: "Vehicle mileage", value: checklist.mileage },
            { icon: <NumbersIcon />, label: "Defect number", value: checklist.defect_number },
            { icon: <DirectionsCarFilledIcon />, label: "Trailer number", value: checklist.trailer_reg_number }
          ].map((item, index) => (
            <Grid key={index}  size={{ xs: 12, sm: 6, md:3 }}>
              <DetailCard icon={item.icon} label={item.label} value={item.value} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Grid>
  </Grid>

     

   
  <Divider sx={{ my: 4 }} />
      <Grid container spacing={4}>
        {/* Row 1: Full width cards */}
        <Grid  size={{ xs: 12 }}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 4 }}>
            <Typography variant="h6" gutterBottom>Inspection Checklist</Typography>
            <Divider sx={{ mb: 2 }} />
<Grid container spacing={2}>
  {Object.entries(groupedResponses).map(([section, items]) => (
    <Grid key={section} size={{ xs: 12, sm: 4 }}>
      <Paper elevation={3} sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          {section}
        </Typography>
        <List dense>
          {items.map(r => (
            <Box key={r.template_item_id} sx={{ mb: 1, pl: 1, borderLeft: '2px solid #ff0000ff', ml: 1 }}>
              <ListItem disablePadding>
<ListItemText
  primary={r.label + (r.is_defective ? ' ⚠️' : '')}
  secondary={
    r.comments && r.comments.length > 0 ? (
      <Box component="ul" sx={{ mb: 0, pl: 2 }}>
        {r.comments.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </Box>
    ) : (
      r.response_notes || ''
    )
  }
  slotProps={{
    secondary: { component: 'div' } // <- new recommended way
  }}
/>


              </ListItem>
              <Divider />
            </Box>
          ))}
        </List>
      </Paper>
    </Grid>
  ))}
</Grid>



          </Paper>
        </Grid>

<Grid size={{ xs: 12 }}>
  <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 4,   }}>
    <Typography variant="h6" gutterBottom>Media</Typography>
    <Divider sx={{ mb: 2 }} />

<Box sx={{display:'flex', flexWrap:'wrap', gap: 4}}>
    {Object.entries(media).map(([label, mediaItems]) => (
     
  <Box key={label} sx={{ mb: 3, p:1, borderRadius: 3,  backgroundColor:'hsla(0, 0%, 99%, 1.00)',   }} width="400px">
    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
      {label}
    </Typography>

    {/* Flex container for media items */}
   <Box display="flex" flexWrap="wrap" gap={2} >
  {mediaItems.map((m, index) => {
    const isImage = m.file_path.match(/\.(jpeg|jpg|gif|png|bmp|webp)$/i);
    const flatIndex = flatMediaIndex(label, index);

    return isImage ? (
      <img
        key={m.id}
        src={m.file_path}
        alt={`Media for ${label}`}
        style={{
          width: 400,            // fixed width
          height: 300,           // fixed height
          objectFit: 'cover',
          borderRadius: 8,
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => openViewer(flatIndex)}
      />
    ) : (
      <video
        key={m.id}
        src={m.file_path}
        style={{
          width: 300,            // fixed width
          height: 200,           // fixed height
          objectFit: 'cover',
          borderRadius: 8,
          cursor: 'pointer',
          flexShrink: 0,
        }}
        controls={false}
        onClick={() => openViewer(flatIndex)}
      />
    );
  })}
</Box>

  </Box>
))}
</Box>
  </Paper>
</Grid>

      </Grid>

      {/* Row 2: Comment box */}
     <Grid  size={{ xs: 12}}>
  <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
    <Grid container spacing={4} justifyContent={'space-between'} >


      {/* Driver Signature */}
      <Grid size={{ xs: 12, }}>
        <Typography variant="h6" gutterBottom>Driver Signature</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px solid #ddd',
            borderRadius: 1,
            minHeight: 150,
            backgroundColor: theme.palette.grey[50],
            // Responsive width
            width: {
              xs: '100%', // Full width on extra small screens (mobile)
              md: '20vw', // 20vw on medium screens and up (desktop)
            },
          }}
        >
          {checklist.signature ? (
            <img
              src={checklist.signature}
              alt="Driver's Signature"
              style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 4 }}
            />
          ) : (
            <Typography>No signature recorded.</Typography>
          )}
        </Box>
      </Grid>
    </Grid>
  </Paper>
</Grid>

      {/* Fullscreen media viewer */}
      <Dialog
        open={viewerOpen}
        onClose={closeViewer}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            minHeight: '80vh',
          },
        }}
      >
        <IconButton
          onClick={closeViewer}
          sx={{ position: 'absolute', top: 16, right: 16, color: 'white', zIndex: 10 }}
          aria-label="Close"
        >
          <CloseIcon />
        </IconButton>

        <IconButton
          onClick={goPrev}
          sx={{ position: 'absolute', top: '50%', left: 16, color: 'white', zIndex: 10, transform: 'translateY(-50%)' }}
          aria-label="Previous"
        >
          <ArrowBackIosNewIcon />
        </IconButton>

        <IconButton
          onClick={goNext}
          sx={{ position: 'absolute', top: '50%', right: 16, color: 'white', zIndex: 10, transform: 'translateY(-50%)' }}
          aria-label="Next"
        >
          <ArrowForwardIosIcon />
        </IconButton>

        {flatMedia.length > 0 && (() => {
          const current = flatMedia[currentMediaIndex];
          const isImage = current.file_path.match(/\.(jpeg|jpg|gif|png|bmp|webp)$/i);
          return isImage ? (
            <img
              src={current.file_path}
              alt={`Media ${current.id}`}
              style={{ maxHeight: '80vh', maxWidth: '100%', objectFit: 'contain' }}
            />
          ) : (
            <video src={current.file_path} controls autoPlay style={{ maxHeight: '80vh', maxWidth: '100%' }} />
          );
        })()}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          {"Delete Inspection?"}
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Are you sure you want to delete this inspection? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {editInspectionId && (
<CreateInspection
  open={!!editInspectionId}
  handleClose={() => setEditInspectionId(null)}
  onSubmitSuccess={refreshList}
  isEdit={!!editInspectionId}
  editId={editInspectionId}
  initialData={{
    vehicle: checklist.vehicle ? { id: checklist.vehicle_id, reg_number: checklist.vehicle_reg_number } : null,
    trailer: checklist.trailer ? { id: checklist.trailer_id, reg_number: checklist.trailer_reg_number } : null,
    mileage: checklist.mileage,
    hasTrailer: !!checklist.trailer,
  }}
/>

)}

<Dialog
  open={historyDialogOpen}
  onClose={() => setHistoryDialogOpen(false)}
  fullWidth
  maxWidth="md"
>
  <DialogTitle>
    Inspection History
    <IconButton
      aria-label="close"
      onClick={() => setHistoryDialogOpen(false)}
      sx={{
        position: 'absolute',
        right: 8,
        top: 8,
        color: (theme) => theme.palette.grey[500],
      }}
    >
      <CloseIcon />
    </IconButton>
  </DialogTitle>
  <DialogContent dividers>
    {history.length === 0 ? (
      <Typography>No history available for this inspection.</Typography>
    ) : (
     <List>
  {history.length > 0 ? (
    history.map((h) => (
      <ListItem key={h.audit_id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <Typography variant="subtitle2">
          <strong>{h.changed_by}</strong> changed <strong>{h.field_name}</strong>
          {h.old_value !== null && ` from "${h.old_value}"`}
          {h.new_value !== null && ` to "${h.new_value}"`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDateTime(h.changed_at)}
        </Typography>
        <Divider sx={{ my: 1 }} />
      </ListItem>
    ))
  ) : (
    <Typography>No history available for this inspection.</Typography>
  )}
</List>

    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
  </DialogActions>
</Dialog>
    </Box>

  );


};

export default InspectionDetail;