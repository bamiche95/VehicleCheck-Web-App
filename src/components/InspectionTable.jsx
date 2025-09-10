import { DataGrid } from '@mui/x-data-grid';
import { Box } from '@mui/material';

const columns = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'reg_number', headerName: 'Reg Number', width: 130 },
  { field: 'submitted_at', headerName: 'Submitted At', width: 180 },
  { field: 'has_defects', headerName: 'Has Defects', width: 120 },
  { field: 'defect_count', headerName: 'Defect Count', width: 120 },
  { field: 'defect_labels', headerName: 'Defect Labels', width: 200 },
  { field: 'notes', headerName: 'Notes', width: 200 },
];

export const InspectionTable = ({ inspections }) => {
  return (
    <Box sx={{ height: 750, width: '100%' }}>
      <DataGrid
        rows={inspections}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={10}
        rowsPerPageOptions={[10]}
      />
    </Box>
  );
};
