import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import BASE_URL from '../config';
import ExportDialog from './ExportDialog';

const InspectionsList = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/api/inspections`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        setInspections(data.inspections);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  }, []);


    const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };


  const columns = useMemo(() => [
    {
      field: 'id',
      headerName: 'S/N',
      width: 70,
      renderCell: (params) =>
        inspections.findIndex(row => row.id === params.row.id) + 1,
      sortable: false,
      filterable: false,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'submitted_at',
      headerName: 'Date',
      width: 180,
 
    },
    { field: 'vehicle_reg_number', headerName: 'Vehicle Reg Number', width: 150 },
    { field: 'trailer_reg_number', headerName: 'Trailer Reg Number', width: 150 },
    {
      field: 'has_defects',
      headerName: 'Defects',
      width: 100,
      renderCell: (params) => (
        <Typography
          sx={{
            color: params.value === 'Yes' ? '#d32f2f' : '#388e3c',
            fontWeight: '600',
          }}
        >
          {params.value}
        </Typography>
      ),
      headerAlign: 'center',
      align: 'center',
    },
    { field: 'user_full_name', headerName: 'Driver Name', width: 200 },
    {
      field: 'defect_count',
      headerName: 'Defect Count',
      width: 130,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Typography fontWeight="600">{params.value}</Typography>
      ),
    },
    { field: 'defect_labels', headerName: 'Checklist Items', flex: 1 },
    { field: 'modified_at', headerName: 'Modified At', width: 150 },
    { field: 'modified_by_full_name', headerName: 'Modified By', width: 150 },
  ], [inspections]);

  return (
<Box
  sx={{
    
    background:
      'linear-gradient(135deg, #f0f7f2 0%, #e8f5e9 100%)',
    height: '100vh',      // full viewport height to prevent page scroll
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  }}
>
  <Paper
    elevation={6}
    sx={{
      p: 3,
      borderRadius: 3,
      maxWidth: '100%',
      width: '100%',
      height: '90vh',   // fixed height for paper to constrain DataGrid
      boxShadow:
        '0 12px 20px -10px rgba(76, 175, 80, 0.3), 0 4px 20px 0 rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#000000ff',
              userSelect: 'none',
              flexGrow: 1,
              minWidth: 200,
            }}
          >
            Vehicle Inspections
          </Typography>

          <Button
            variant="contained"
            onClick={() => setExportDialogOpen(true)}
            startIcon={<FileDownloadIcon />}
            sx={{
              background:
                'linear-gradient(45deg, #1C821C 30%, #1C821C 90%)',
              boxShadow:
                '0 4px 15px 0 rgba(76, 175, 80, 0.4)',
              color: '#fff',
              textTransform: 'none',
              borderRadius: 3,
              fontWeight: '600',
              fontSize: '1rem',
              px: 3,
              py: 1.2,
              transition: 'all 0.3s ease',
              '&:hover': {
                background:
                  'linear-gradient(45deg, #388e3c 30%, #1C821C 90%)',
                boxShadow:
                  '0 6px 20px 0 rgba(56, 142, 60, 0.5)',
              },
              whiteSpace: 'nowrap',
            }}
          >
            Export Data
          </Button>
        </Box>

        <Divider sx={{ mb: 3, borderColor: '#a5d6a7' }} />

        {loading ? (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            flexGrow={1}
            gap={2}
          >
            <CircularProgress color="success" size={50} />
            <Typography
              variant="h6"
              sx={{ color: '#000000ff', fontWeight: 600 }}
            >
              Loading inspections...
            </Typography>
          </Box>
        ) : (
             <Box
        sx={{
          flexGrow: 1,  // fill remaining space in Paper
          minHeight: 0, // important for flex children to allow scrolling
          '& .MuiDataGrid-root': {
            border: 'none',
            borderRadius: 3,
            fontSize: '0.9rem',
            fontWeight: 400,
            color: '#000000ff',
            boxShadow:
              'inset 0 0 5px rgba(0,0,0,0.05)',
          },
        }}
      >
        <DataGrid
          rows={inspections}
          columns={columns}
          pagination
          pageSizeOptions={[5, 10, 20, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 20 },
            },
          }}
          onRowClick={(params) => {
            navigate(`/dashboard/inspections/${params.id}`);
          }}
          sx={{
            height: '100%',    // fill the box height
            '.MuiDataGrid-columnHeaders': {
              backgroundColor: '#c8e6c9',
              color: '#1b5e20',
              fontWeight: '700',
              borderRadius: 3,
              borderBottom: '1px solid #a5d6a7',
              letterSpacing: '0.05em',
            },
            '.MuiDataGrid-row': {
              transition: 'background-color 0.3s ease',
              '&:hover': {
                backgroundColor: '#e8f5e9',
              },
              cursor: 'pointer',
            },
            '.MuiDataGrid-cell': {
              borderBottom: 'none',
            },
            '.MuiDataGrid-footerContainer': {
              borderTop: '1px solid #a5d6a7',
              backgroundColor: '#c8e6c9',
              color: '#1b5e20',
              fontWeight: 600,
              letterSpacing: '0.03em',
            },
          }}
        />
      </Box>
    )}
  </Paper>

      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        inspections={inspections}
      />
    </Box>
  );
};

export default InspectionsList;
