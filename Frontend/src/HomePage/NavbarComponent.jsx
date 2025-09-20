import { useState, useRef, useEffect } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { API_ENDPOINTS } from './config';
import './Home.css';

function NavbarComponent() {
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  // Fetch profile data
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const attuid = localStorage.getItem('attuid') || 'my2474';

      if (!token || !attuid) {
        setError('Authentication details missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.profile.get, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ attuid }),
      });

      const result = await response.json();
      if (result.success) {
        setUser(result.data);
      } else {
        setError(result.message || 'Failed to fetch profile');
      }
    } catch (err) {
      setError('Error fetching profile data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    setNotificationError(null);
    try {
      const token = localStorage.getItem('token');
      const attuid = localStorage.getItem('attuid') || 'my2474';

      if (!token || !attuid) {
        setNotificationError('Authentication details missing. Please log in again.');
        setLoadingNotifications(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.notifications.fetch, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ attuid }),
      });

      const result = await response.json();
      if (result.success) {
        setNotifications(result.data);
      } else {
        setNotificationError(result.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      setNotificationError('Error fetching notifications');
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mark notification as read (single click, no toggle)
  const markAsRead = async (id) => {
    if (notifications.find(n => n._id === id).read) {
      return; // Skip if already read
    }
    try {
      const token = localStorage.getItem('token');
      const attuid = localStorage.getItem('attuid');

      if (!token || !attuid) {
        setNotificationError('Authentication details missing.');
        return;
      }

      const response = await fetch(API_ENDPOINTS.notifications.read, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ attuid, id }),
      });

      const result = await response.json();
      if (result.success) {
        setNotifications(notifications.map(n =>
          n._id === id ? { ...n, read: true } : n
        ));
      } else {
        setNotificationError(result.message || 'Failed to update notification status');
      }
    } catch (err) {
      setNotificationError('Error updating notification status');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!notifications.some(n => !n.read)) {
      return; // Skip if no unread notifications
    }
    try {
      const token = localStorage.getItem('token');
      const attuid = localStorage.getItem('attuid');

      if (!token || !attuid) {
        setNotificationError('Authentication details missing.');
        return;
      }

      const response = await fetch(API_ENDPOINTS.notifications.readall, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ attuid }),
      });

      const result = await response.json();
      if (result.success) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
      } else {
        setNotificationError(result.message || 'Failed to mark all notifications as read');
      }
    } catch (err) {
      setNotificationError('Error marking all notifications as read');
    }
  };

  // Handle logout confirmation
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

// Handle logout
const handleLogout = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setNotificationError('No token found. Please log in again.');
      return;
    }

    const response = await fetch('http://localhost:4000/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    const result = await response.json();
    if (result.success) {
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('attuid');
      // Redirect to homepage
      window.location.href = '/';
    } else {
      setNotificationError(result.message || 'Logout failed. Please try again.');
    }
  } catch (err) {
    setNotificationError('Error during logout. Please try again.');
  }
  setShowLogoutConfirm(false);
};

  // Cancel logout
  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Toggle profile info visibility and fetch data
  const handleProfileClick = () => {
    if (!showProfileInfo && !user) {
      fetchProfile();
    }
    setShowProfileInfo(!showProfileInfo);
    setShowNotifications(false);
  };

  // Toggle notifications visibility
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowProfileInfo(false);
  };

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close profile or notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current && !profileRef.current.contains(event.target) &&
        notificationRef.current && !notificationRef.current.contains(event.target)
      ) {
        setShowProfileInfo(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Convert UTC timestamp to IST
  const toIST = (utcDate) => {
    const date = new Date(utcDate);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <Navbar bg="white" expand="lg" className="navbar navbar-shadow px-3">
      <Container fluid>
        <Navbar.Brand href="/home">
          <i className="fas fa-home me-2"></i>
          Attspace
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/home">Home</Nav.Link>
            <Nav.Link href="/reservation">Reservation</Nav.Link>
          </Nav>
          <Nav>
            <Nav.Link
              as="div"
              className="d-flex align-items-center notification-link position-relative"
              onClick={handleNotificationClick}
              onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick()}
              role="button"
              tabIndex={0}
              aria-label="Toggle notifications"
              ref={notificationRef}
            >
              <i className="fas fa-bell notification-icon"></i>
              {notifications.some(n => !n.read) && (
                <span className="notification-badge">{notifications.filter(n => !n.read).length}</span>
              )}
              <span className="notification-tooltip">Notifications</span>
              {showNotifications && (
                <div className="notification-info" role="dialog" aria-labelledby="notification-title">
                  <div className="notification-info-header">
                    <h5 id="notification-title" className="notification-info-title">Notifications</h5>
                  </div>
                  <div className="notification-info-content">
                    {loadingNotifications ? (
                      <div className="notification-info-loading text-center">
                        <div className="spinner"></div>
                        <p>Loading...</p>
                      </div>
                    ) : notificationError ? (
                      <div className="text-center text-danger">
                        <p>{notificationError}</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="text-center text-muted">No notifications</p>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent closing dropdown
                            markAsRead(notification._id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation(); // Prevent closing dropdown
                              markAsRead(notification._id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="notification-message-container">
                            <div className="notification-message">{notification.title}</div>
                            <div className="notification-body">{notification.body}</div>
                            <div className="notification-time">{toIST(notification.createdAt)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="notification-info-footer">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={markAllAsRead}
                      disabled={!notifications.some(n => !n.read)}
                      aria-label="Mark all notifications as read"
                    >
                      Mark All Read
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setShowNotifications(false)}
                      aria-label="Close notifications"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </Nav.Link>
            <Nav.Link
              as="div"
              className="d-flex align-items-center profile-link position-relative"
              onClick={handleProfileClick}
              onKeyDown={(e) => e.key === 'Enter' && handleProfileClick()}
              role="button"
              tabIndex={0}
              aria-label="Toggle profile information"
              ref={profileRef}
            >
              <i className="fas fa-user profile-icon"></i>
              <span className="profile-tooltip">Profile</span>
              {showProfileInfo && (
                <div className="profile-info" role="dialog" aria-labelledby="profile-info-title">
                  {loading ? (
                    <div className="profile-info-loading text-center">
                      <div className="spinner"></div>
                      <p>Loading...</p>
                    </div>
                  ) : error ? (
                    <div className="profile-info-content text-center text-danger">
                      <p>{error}</p>
                    </div>
                  ) : user ? (
                    <>
                      <div className="profile-info-header">
                        <div className="profile-info-avatar">
                          {user.firstname?.[0]}{user.lastname?.[0]}
                        </div>
                        <h5 id="profile-info-title" className="profile-info-title">
                          {user.firstname} {user.lastname}
                        </h5>
                      </div>
                      <div className="profile-info-content">
                        <div className="profile-info-item">
                          <span className="profile-info-label">Email:</span>
                          <span className="profile-info-value">{user.email}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="profile-info-label">Job Title:</span>
                          <span className="profile-info-value">{user.jobTitle}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="profile-info-label">Business Unit:</span>
                          <span className="profile-info-value">{user.businessUnit}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="profile-info-label">Manager:</span>
                          <span className="profile-info-value">{user.manager}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="profile-info-label">Shift:</span>
                          <span className="profile-info-value">{user.shift}</span>
                        </div>
                      </div>
                      <div className="profile-info-footer">
                        <button
                          className="btn btn-sm btn-outline-primary w-100"
                          onClick={() => setShowProfileInfo(false)}
                          aria-label="Close profile information"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </Nav.Link>
            <Nav.Link as="div" className="d-flex align-items-center">
              <button className="logout-btn" onClick={handleLogoutClick}>
                <i className="fas fa-sign-out-alt me-1"></i>
                Logout
              </button>
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>

{/* Logout Confirmation Modal */}
{showLogoutConfirm && (
  <div className="logout-modal-overlay" onClick={handleCancelLogout}>
    <div className="logout-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="logout-modal-title">
      <div className="logout-modal-header">
        <h5 id="logout-modal-title" className="logout-modal-title">Confirm Logout</h5>
      </div>
      <div className="logout-modal-body">
        <p>Are you sure you want to log out of your account?</p>
      </div>
      <div className="logout-modal-footer">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={handleCancelLogout}
          aria-label="Cancel logout"
        >
          Cancel
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={handleLogout}
          aria-label="Confirm logout"
        >
          Log Out
        </button>
      </div>
    </div>
  </div>
)}
    </Navbar>
  );
}

export default NavbarComponent;