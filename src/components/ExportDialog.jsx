import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Stack,
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs'; // Import dayjs for robust date handling

const ExportDialog = ({ open, onClose, inspections }) => {
  const theme = useTheme();
  console.log('inspections', inspections);
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  const [filterRegNumber, setFilterRegNumber] = useState('');
  const [filterHasDefects, setFilterHasDefects] = useState('');

  const regNumberOptions = useMemo(() => {
    const uniqueRegs = new Set(inspections.map(i => i.reg_number));
    return Array.from(uniqueRegs);
  }, [inspections]);

  const filteredForExport = useMemo(() => {
    // Correctly handle date comparison using dayjs
    const startDate = filterStartDate ? dayjs(filterStartDate).startOf('day') : null;
    const endDate = filterEndDate ? dayjs(filterEndDate).endOf('day') : null;

    return inspections.filter(i => {
      const submittedDate = dayjs(i.submitted_at); // Use dayjs to parse the date string

      if (startDate && submittedDate.isBefore(startDate)) return false;
      if (endDate && submittedDate.isAfter(endDate)) return false;
      if (filterRegNumber && i.reg_number !== filterRegNumber) return false;

      if (filterHasDefects) {
        const defectVal = String(i.has_defects).toLowerCase();
        if (defectVal !== filterHasDefects.toLowerCase()) return false;
      }

      return true;
    });
  }, [inspections, filterStartDate, filterEndDate, filterRegNumber, filterHasDefects]);

  const formatDateTime = (isoString) => {
    // Use a robust library like dayjs to format the date
    return dayjs(isoString).format('DD/MM/YYYY HH:mm');
  };

  const exportToExcel = () => {
    if (filteredForExport.length === 0) {
      alert('No data matches the selected filters.');
      return;
    }

    const dataForExcel = filteredForExport.map(
      ({ id, submitted_at, reg_number, has_defects, user_full_name, defect_count, defect_labels }) => ({
        'S/N': id,
        Date: formatDateTime(submitted_at), // This now works correctly
        'Reg Number': reg_number,
        Defects: has_defects ? 'Yes' : 'No',
        'Driver Name': user_full_name,
        'Defect Count': defect_count,
        'Check List Items': defect_labels,
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspections');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const fileName = `inspections_export_${new Date().toISOString().slice(0, 10)}.xlsx`;

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

    onClose();
  };

  const exportToPDF = () => {
    if (filteredForExport.length === 0) {
      alert('No data matches the selected filters.');
      return;
    }

    const doc = new jsPDF();
    const tableColumn = ['S/N', 'Date', 'Reg Number', 'Defects', 'Driver Name', 'Defect Count', 'Check List Items'];
    const tableRows = [];

    filteredForExport.forEach((item, index) => {
      const row = [
        index + 1,
        formatDateTime(item.submitted_at), // This now works correctly
        item.reg_number,
        item.has_defects ? 'Yes' : 'No',
        item.user_full_name,
        item.defect_count,
        item.defect_labels,
      ];
      tableRows.push(row);
    });

    doc.setTextColor(theme.palette.success.dark);
    doc.setFontSize(18);
    doc.text('Vehicle Inspections Export', 14, 15);
    doc.setTextColor(40);
    doc.setFontSize(11);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: theme.palette.success.main },
      alternateRowStyles: { fillColor: '#f1f8e9' },
    });

    doc.save(`inspections_export_${new Date().toISOString().slice(0, 10)}.pdf`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 3,
          boxShadow: `0 8px 24px ${theme.palette.success.light}88`,
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, color: theme.palette.success.dark, textAlign: 'center' }}>
        Export Vehicle Inspections
      </DialogTitle>
      <Divider sx={{ mb: 3 }} />

      <DialogContent dividers>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DatePicker
              label="Start Date"
              value={filterStartDate}
              onChange={(newValue) => setFilterStartDate(newValue)}
              slotProps={{ textField: { fullWidth: true, helperText: "" } }}
              disableFuture
              clearable
            />
            <DatePicker
              label="End Date"
              value={filterEndDate}
              onChange={(newValue) => setFilterEndDate(newValue)}
              slotProps={{ textField: { fullWidth: true, helperText: "" } }}
              disableFuture
              clearable
            />
          </Stack>

          <TextField
            select
            label="Vehicle Reg Number"
            value={filterRegNumber}
            onChange={(e) => setFilterRegNumber(e.target.value)}
            fullWidth
            size="medium"
          >
            <MenuItem value="">All Vehicles</MenuItem>
            {regNumberOptions.map((reg) => (
              <MenuItem key={reg} value={reg}>
                {reg}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Has Defects"
            value={filterHasDefects}
            onChange={(e) => setFilterHasDefects(e.target.value)}
            fullWidth
            size="medium"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
            <MenuItem value="no">No</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button
          variant="text"
          onClick={onClose}
          sx={{
            color: theme.palette.grey[600],
            fontWeight: 600,
            '&:hover': { backgroundColor: theme.palette.grey[100] },
          }}
        >
          Cancel
        </Button>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={exportToPDF}
            sx={{
              color: theme.palette.success.main,
              borderColor: theme.palette.success.main,
              fontWeight: 600,
              '&:hover': {
                backgroundColor: theme.palette.success.light,
                borderColor: theme.palette.success.dark,
                color: theme.palette.success.dark,
              },
            }}
          >
            Export to PDF
          </Button>
          <Button
            variant="contained"
            onClick={exportToExcel}
            sx={{
              background: `linear-gradient(45deg, ${theme.palette.success.dark} 30%, ${theme.palette.success.main} 90%)`,
              fontWeight: 700,
              boxShadow: `0 4px 10px ${theme.palette.success.main}77`,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.success.main} 30%, ${theme.palette.success.dark} 90%)`,
                boxShadow: `0 6px 14px ${theme.palette.success.dark}99`,
              },
            }}
          >
            Export to Excel
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;