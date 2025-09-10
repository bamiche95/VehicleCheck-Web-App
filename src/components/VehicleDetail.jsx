import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import BASE_URL from '../config';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// This component displays detailed information about a vehicle and its inspection history.
export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [inspections, setInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(true);

  useEffect(() => {
    // Fetch vehicle details
    fetch(`${BASE_URL}/api/vehicles/${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setVehicle(data);
        setLoadingVehicle(false);
      })
      .catch((err) => {
        console.error('Error fetching vehicle:', err);
        setLoadingVehicle(false);
      });

    // Fetch inspections filtered by vehicle id
    fetch(`${BASE_URL}/api/inspections/vehicle/${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setInspections(data.inspections || []);
        setLoadingInspections(false);
      })
      .catch((err) => {
        console.error('Error fetching inspections:', err);
        setLoadingInspections(false);
      });
  }, [id]);

  // Define columns for the inspections DataGrid
  const inspectionColumns = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'submitted_at',
      headerName: 'Date',
      flex: 1,
      valueFormatter: (params) => dayjs(params.value).format('YYYY-MM-DD HH:mm'),
    },
    { field: 'user_full_name', headerName: 'Inspector', flex: 1.5 },
    {
      field: 'has_defects',
      headerName: 'Defects',
      width: 100,
      renderCell: (params) => (
        <Typography color={params.value ? 'error' : 'success.main'}>
          {params.value ? 'Yes' : 'No'}
        </Typography>
      ),
    },
    { field: 'defect_count', headerName: '# Defects', width: 110 },
    { field: 'defect_labels', headerName: 'Defect Labels', flex: 2 },
    {
      field: 'notes',
      headerName: 'Notes',
      flex: 2,
      renderCell: (params) => (
        <Typography noWrap title={params.value}>
          {params.value || '-'}
        </Typography>
      ),
    },
  ], []);

  // Show a loading spinner while fetching vehicle details.
  if (loadingVehicle) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!vehicle) {
    return (
      <Typography variant="h6" color="error" align="center" mt={4}>
        Vehicle not found.
      </Typography>
    );
  }

  // Export inspections to Excel
  const exportToExcel = () => {
    if (inspections.length === 0) return;
    const dataForExcel = inspections.map(
      ({ id, submitted_at, user_full_name, has_defects, defect_count, defect_labels, notes }) => ({
        ID: id,
        Date: dayjs(submitted_at).format('YYYY-MM-DD HH:mm'),
        Inspector: user_full_name,
        Defects: has_defects ? 'Yes' : 'No',
        '# Defects': defect_count,
        'Defect Labels': defect_labels,
        Notes: notes,
      })
    );
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspections');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `vehicle_${vehicle.reg_number}_inspections.xlsx`);
  };

  // Export inspections to PDF
  const exportToPDF = () => {
    if (inspections.length === 0 || !vehicle) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Inspections for Vehicle ${vehicle.reg_number}`, 14, 22);
    const tableColumn = [
      'ID',
      'Date',
      'Inspector',
      'Defects',
      '# Defects',
      'Defect Labels',
      'Notes',
    ];
    const tableRows = inspections.map(
      ({
        id,
        submitted_at,
        user_full_name,
        has_defects,
        defect_count,
        defect_labels,
        notes,
      }) => [
        id,
        dayjs(submitted_at).format('YYYY-MM-DD HH:mm'),
        user_full_name,
        has_defects ? 'Yes' : 'No',
        defect_count,
        defect_labels,
        notes || '-',
      ]
    );
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 175, 80] },
    });
    doc.save(`vehicle_${vehicle.reg_number}_inspections.pdf`);
  };

  return (
    <Box sx={{ p: 3, maxWidth: '100vw' }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        {/* Banner with a modern gradient overlay */}
        <Box
          sx={{
            width: '100%',
            height: 300,
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/uploads/image00004.jpeg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'flex-end',
            p: 3,
            position: 'relative',
          }}
        >
          <Box sx={{ color: 'white', zIndex: 1 }}>
            <Typography variant="h3" component="h1" fontWeight="bold">
              {vehicle.make} {vehicle.model}
            </Typography>
            <Typography variant="h4" component="h2" mt={1}>
              {vehicle.reg_number}
            </Typography>
          </Box>
        </Box>

        {/* Vehicle Details Cards */}
        <Grid container spacing={2} mb={4}>
          {[
            { label: 'Registration Number', value: vehicle.reg_number },
            { label: 'Make', value: vehicle.make },
            { label: 'Model', value: vehicle.model },
            { label: 'Year', value: vehicle.year },
            {
              label: 'MOT Expiry',
              value: vehicle.mot_expiry_date
                ? dayjs(vehicle.mot_expiry_date).format('DD-MM-YYYY')
                : 'N/A',
            },
            {
              label: 'PMI ',
              value: vehicle.pmi_date
                ? dayjs(vehicle.pmi_date).format('DD-MM-YYYY')
                : 'N/A',
            },
        
           

           
          ].map(({ label, value }) => (
            <Grid  size={{ xs: 12, sm: 6, md:2 }} key={label}>
              <Card sx={{ borderRadius: 2, height: '100%', backgroundColor:'rgba(184, 235, 197, 1)' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold" noWrap>
                    {label}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          {/* Inspections Section Header */}
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#388E3C' }}>
            Inspection History
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={() => navigate(`/dashboard/vehicles/${id}/edit`)}
              startIcon={<EditIcon />}
              sx={{
                background: 'linear-gradient(45deg, #4CAF50 30%, #81C784 90%)',
                boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                color: 'white',
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              Edit Vehicle
            </Button>
            <Button
              variant="outlined"
              onClick={exportToExcel}
              startIcon={<FileDownloadIcon />}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              onClick={exportToPDF}
              startIcon={<FileDownloadIcon />}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              PDF
            </Button>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />

        {/* Inspections DataGrid */}
        {loadingInspections ? (
          <Box display="flex" justifyContent="center" height="400px" alignItems="center">
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={inspections}
              columns={inspectionColumns}
              pageSizeOptions={[5, 10, 20, 50]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 10 },
                },
              }}
              getRowId={(row) => row.id}
              disableSelectionOnClick
              sx={{
                border: 'none',
                '.MuiDataGrid-columnHeaders': {
                  backgroundColor: '#f1f8e9',
                  borderRadius: 1,
                },
                '.MuiDataGrid-row': {
                  '&:hover': {
                    backgroundColor: '#e8f5e9',
                  },
                },
              }}
              onRowClick={(params) => navigate(`/dashboard/inspections/${params.id}`)}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
