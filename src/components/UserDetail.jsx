import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Avatar,
  Paper,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import BASE_URL from '../config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// This component displays detailed information about a user and their inspection history.
export default function UserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingInspections, setLoadingInspections] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`${BASE_URL}/api/users/${id}`, { credentials: 'include' });
        if (!response.ok) throw new Error('User not found');
        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUser();
  }, [id]);

  useEffect(() => {
    async function fetchInspections() {
      try {
        const response = await fetch(`${BASE_URL}/api/inspections/user/${id}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load inspections');
        const data = await response.json();
        setInspections(data.inspections || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInspections(false);
      }
    }
    fetchInspections();
  }, [id]);

  // Define columns for the inspections DataGrid
  const columns = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'reg_number',
      headerName: 'Vehicle Reg',
      width: 130,
      renderCell: (params) => (
        <Button
          component={Link}
          to={`/dashboard/vehicles/${params.value}`}
          variant="text"
          sx={{ textTransform: 'none' }}
        >
          {params.value}
        </Button>
      ),
    },
    {
      field: 'submitted_at',
      headerName: 'Submitted At',
      width: 180,
      valueFormatter: (params) => dayjs(params.value).format('DD-MM-YYYY HH:mm'),
    },
    {
      field: 'has_defects',
      headerName: 'Has Defects',
      width: 130,
     
    
    },
    { field: 'defect_count', headerName: 'Defect Count', width: 130 },
    { field: 'defect_labels', headerName: 'Defect Labels', flex: 1 },
    { field: 'notes', headerName: 'Notes', flex: 1 },
  ], []);

  // Export inspections to Excel
  const exportToExcel = () => {
    if (inspections.length === 0) return;
    const dataForExcel = inspections.map(({ id, reg_number, submitted_at, has_defects, defect_count, defect_labels, notes }) => ({
      ID: id,
      'Vehicle Reg': reg_number,
      'Submitted At': dayjs(submitted_at).format('DD-MM-YYYY HH:mm'),
      'Has Defects': has_defects,
      'Defect Count': defect_count,
      'Defect Labels': defect_labels,
      Notes: notes,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspections');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `user_${id}_inspections.xlsx`);
  };

  // Export inspections to PDF
  const exportToPDF = () => {
    if (inspections.length === 0 || !user) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Inspections by ${user.fullname || `${user.firstname} ${user.lastname}`}`, 14, 22);
    const tableColumn = ['ID', 'Vehicle Reg', 'Submitted At', 'Has Defects', 'Defect Count', 'Defect Labels', 'Notes'];
    const tableRows = inspections.map(({ id, reg_number, submitted_at, has_defects, defect_count, defect_labels, notes }) => [
      id,
      reg_number,
      dayjs(submitted_at).format('DD-MM-YYYY HH:mm'),
      has_defects,
      defect_count,
      defect_labels,
      notes || '-',
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 175, 80] },
    });
    doc.save(`user_${id}_inspections.pdf`);
  };

  if (loadingUser) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !user) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="error">
          Error: {error || 'User not found.'}
        </Typography>
        <Button
          onClick={() => navigate('/dashboard/users')}
          variant="contained"
          sx={{ mt: 2, textTransform: 'none' }}
        >
          Back to User List
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '100vw' }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        {/* Banner with a modern gradient overlay */}
        <Box
          sx={{
            height: 160,
            background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
            position: 'relative',
            mb: 8,
            borderRadius: 2,
          }}
        />

        {/* Profile Picture and User Details */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 3, mb: 4, position: 'relative', top: -80 }}>
          <Avatar
            src={user.profile_picture || ''}
            alt={user.fullname || `${user.firstname} ${user.lastname}`}
            sx={{
              width: 140,
              height: 140,
              border: '4px solid white',
              boxShadow: 3,
              bgcolor: '#4CAF50',
              fontSize: 48,
              mr: 4,
            }}
          >
            {!user.profile_picture && (user.firstname?.[0] || 'U').toUpperCase()}
          </Avatar>

          <Box>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              {user.fullname || `${user.firstname} ${user.lastname}`}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Role: {user.role}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Username: {user.username}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Created At: {dayjs(user.created_at).format('YYYY-MM-DD HH:mm')}
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box px={3} mb={4} display="flex" justifyContent="space-between" alignItems="center">
          <Button
            onClick={() => navigate('/dashboard/users')}
            variant="contained"
            startIcon={<ArrowBackIcon />}
            sx={{
              background: 'linear-gradient(45deg, #4CAF50 30%, #81C784 90%)',
              boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
              color: 'white',
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Back to User List
          </Button>
          <Box display="flex" gap={1}>
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
        <Box px={3} mb={4}>
          <Typography variant="h5" mb={2} sx={{ fontWeight: 'bold', color: '#388E3C' }}>
            Inspection History
          </Typography>

          {loadingInspections ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : inspections.length === 0 ? (
            <Typography>No inspections found.</Typography>
          ) : (
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={inspections}
                columns={columns}
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
        </Box>
      </Paper>
    </Box>
  );
}
