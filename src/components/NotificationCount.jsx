import { useState, useEffect } from 'react';
import BASE_URL from '../config';
import socket from '../socket';

export function useUnreadNotificationCount() {
  const [count, setCount] = useState(0);

  const fetchCount = () => {
    fetch(`${BASE_URL}/api/notifications/unread-count`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setCount(data.count))
      .catch(() => setCount(0));
  };

  useEffect(() => {
    fetchCount();

    socket.on('notification-created', () => {
      fetchCount();
    });
socket.on('notification-read', () => {
  fetchCount();
});
    return () => {
      socket.off('notification-created');
      socket.off('notification-read');

    };
  }, []);

  return count;
}
