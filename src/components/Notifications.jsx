import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BASE_URL from '../config';
import socket from '../socket';

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  // Fetch notifications on mount
  useEffect(() => {
    fetch(`${BASE_URL}/api/notifications`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(err => console.error('Failed to load notifications', err));
  }, []);

  // Socket listener for new notifications
  useEffect(() => {
    socket.on('notification-created', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      socket.off('notification-created');
    };
  }, []);

  // Mark notification as read when clicked
const markAsRead = async (id) => {
  try {
    await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
      method: 'PUT',
      credentials: 'include',
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_status: 1 } : n))
    );
    socket.emit('notification-read'); // instantly tell our hook to refresh
  } catch (err) {
    console.error('Failed to mark notification as read', err);
  }
};


  return (
    <div>
      <h1>Notifications</h1>
      {notifications.length === 0 && <p>No notifications yet</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {notifications.map((notif) => (
          <li
            key={notif.id}
            onClick={() => markAsRead(notif.id)}
            style={{
              background: notif.read_status ? '#f5f5f5' : '#ecececff',
              padding: '10px',
              marginBottom: '8px',
              cursor: 'pointer',
            }}
          >
            <Link
              to={`/dashboard/inspections/${notif.related_checklist_id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <strong>{notif.full_name}</strong> — {notif.message}
              <p style={{ margin: 0, fontSize: '0.85em', color: '#666' }}>
                {new Date(notif.created_at).toLocaleString()}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NotificationsPage;
