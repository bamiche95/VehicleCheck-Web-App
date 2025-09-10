import React, { useEffect, useState } from 'react';
import { useSidebar } from '../context/SidebarContext';
import BottomNavBar from '../components/BottomNavBar';
import { InspectionCardList } from '../components/InspectionCardList';
import CreateInspection from '../components/CreateInspection'; // import CreateInspection
import BASE_URL from '../config';
import socket from '../socket';
export const DriverDashBoard = () => {
  const { setSidebarVisible } = useSidebar();
  const [inspections, setInspections] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setSidebarVisible(false);
    return () => setSidebarVisible(true);
  }, [setSidebarVisible]);

  const fetchInspections = async () => {

    try {
      const res = await fetch(`${BASE_URL}/api/driver-inspections`, {
        credentials: 'include',
      });
      const data = await res.json();
  
      setInspections(data.inspections);
    } catch (error) {
      console.error('Failed to fetch driver inspections:', error);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  // Close dialog handler
  const handleCreateClose = () => {
    setCreateOpen(false);
  };

  // Callback for refreshing inspections after successful submit
  const handleRefreshInspections = () => {
    fetchInspections();
  };
 useEffect(() => {
    // Listen for new inspections
    socket.on('inspection-created', (newInspection) => {
      setInspections((prev) => [newInspection, ...prev]);
    });

    return () => {
      socket.off('inspection-created');
    };
  }, []);
  return (
    <>
      {/* Add a button or trigger to open the inspection creation dialog */}
      

      <div style={{ paddingBottom: '56px', marginTop:'70px' }}>
        <InspectionCardList inspections={inspections} />
      </div>

      <CreateInspection
        open={createOpen}
        handleClose={handleCreateClose}
        onSubmitSuccess={handleRefreshInspections} // pass refresh callback here
      />

      <BottomNavBar />
    </>
  );
};
