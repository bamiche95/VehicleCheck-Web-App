import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../config';
export default function UserRegistrationForm() {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    password: '',
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate(); // hook to navigate

  function handleChange(e) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'driver' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.message || response.statusText}`);
        return;
      }

      setMessage('User registered successfully!');
      setFormData({
        firstname: '',
        lastname: '',
        username: '',
        password: '',
      });

      // Redirect to login page after 1 second
      setTimeout(() => {
        navigate('/login');
      }, 1000);

    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 400,
        margin: 'auto',
        padding: 20,
        borderRadius: 8,
        backgroundColor: '#e6f4ea',
        boxShadow: '0 0 10px rgba(0, 128, 0, 0.3)',
        fontFamily: 'Arial, sans-serif',
        color: '#0b3d0b',
      }}
    >
      <h2 style={{ textAlign: 'center', color: '#116611' }}>Register User</h2>

      <label>
        First Name:
        <input
          type="text"
          name="firstname"
          value={formData.firstname}
          onChange={handleChange}
          required
          style={inputStyle}
        />
      </label>

      <label>
        Last Name:
        <input
          type="text"
          name="lastname"
          value={formData.lastname}
          onChange={handleChange}
          required
          style={inputStyle}
        />
      </label>

      <label>
        Username:
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          required
          style={inputStyle}
        />
      </label>

      <label>
        Password:
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          style={inputStyle}
        />
      </label>

      <button
        type="submit"
        style={{
          marginTop: 20,
          width: '100%',
          padding: 10,
          backgroundColor: '#2e7d32',
          color: 'white',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: 5,
          cursor: 'pointer',
        }}
      >
        Register
      </button>

      {message && (
        <p style={{ marginTop: 15, textAlign: 'center', color: '#116611' }}>
          {message}
        </p>
      )}
    </form>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '8px 6px',
  marginTop: 5,
  marginBottom: 15,
  borderRadius: 4,
  border: '1px solid #4caf50',
};
