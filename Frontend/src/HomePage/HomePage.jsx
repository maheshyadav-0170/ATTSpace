import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import NavbarComponent from './NavbarComponent';
import './Home.css';

function HomePage() {
  const userData = {
    attuid: localStorage.getItem("attuid"),
    firstname: localStorage.getItem("firstname"),
    lastname: localStorage.getItem("lastname"),
    welcomeMessage: localStorage.getItem("welcomeMessage"),
    role: localStorage.getItem("role"),
  };

  if (!userData.attuid) {
    return (
      <div className="permission-denied">
        <h2>Permission Denied</h2>
        <p>You do not have access to this page. Please log in or contact support.</p>
        <a href="/" className="back-button">Back to Landing Page</a>
      </div>
    );
  }

  return (
    <div className="App">
      <NavbarComponent />
      <div className="greeting">
        <h2>
          Welcome, {userData.firstname || 'User'} {userData.lastname || ''}! 👋
        </h2>
        <p>
          Explore your workspace bookings and upcoming tasks to streamline your productivity today.
        </p>
      </div>

      <main className="py-5">
        <Container>
          <h2 className="section-heading">Quick Actions</h2>
          <div className="card-container" id="main-cards">
            <div className="card">
              <div className="card-header">
                <i className="fas fa-chair card-icon"></i>
                <h3 className="card-title">Book a Desk</h3>
              </div>
              <div className="card-content">
                <p>
                  Reserve a desk in advance to ensure you always have a comfortable and productive workspace when you
                  arrive at the office.
                </p>
                <Link to="/reservation" className="read-more">Reserve</Link>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <i className="fas fa-door-open card-icon"></i>
                <h3 className="card-title">Reserve a Meeting Room</h3>
              </div>
              <div className="card-content">
                <p>
                  Schedule and manage meeting rooms effortlessly, ensuring your team has the right space for
                  collaboration and discussions.
                </p>
                <Link to="/reservation" className="read-more">Book Now</Link>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <i className="fas fa-gamepad card-icon"></i>
                <h3 className="card-title">Relax & Recharge</h3>
              </div>
              <div className="card-content">
                <p>
                  Take a break and enjoy recreational games within the workspace. Stay refreshed and energized with a
                  dedicated play arena.
                </p>
                <Link to="/play-relax" className="read-more">Explore</Link>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <i className="fas fa-building card-icon"></i>
                <h3 className="card-title">Explore the Space</h3>
              </div>
              <div className="card-content">
                <p>
                  Manage your workspace preferences, access shared areas, and explore all facilities available to make
                  work seamless and engaging.
                </p>
                <Link to="#" className="read-more">Discover</Link>
              </div>
            </div>

            {(userData.role === "Administrator" || userData.role === "Manager") && (
              <>
                <div className="card admin-only">
                  <div className="card-header">
                    <i className="fas fa-users-cog card-icon"></i>
                    <h3 className="card-title">Manage Users</h3>
                  </div>
                  <div className="card-content">
                    <p>Administer user accounts, roles, and permissions to ensure smooth operations.</p>
                    <Link to="#" className="read-more">Manage</Link>
                  </div>
                </div>

                <div className="card admin-only">
                  <div className="card-header">
                    <i className="fas fa-cogs card-icon"></i>
                    <h3 className="card-title">System Settings</h3>
                  </div>
                  <div className="card-content">
                    <p>Configure system settings, policies, and workspace configurations.</p>
                    <Link to="#" className="read-more">Configure</Link>
                  </div>
                </div>

                <div className="card admin-only">
                  <div className="card-header">
                    <i className="fas fa-chart-line card-icon"></i>
                    <h3 className="card-title">Analytics & Occupancy</h3>
                  </div>
                  <div className="card-content">
                    <p>Monitor workspace usage, occupancy rates, and generate analytical reports.</p>
                    <Link to="#" className="read-more">View Analytics</Link>
                  </div>
                </div>

                <div className="card admin-only">
                  <div className="card-header">
                    <i className="fas fa-tasks card-icon"></i>
                    <h3 className="card-title">Manage Requests</h3>
                  </div>
                  <div className="card-content">
                    <p>Handle and track requests for desks, rooms, and resources efficiently.</p>
                    <Link to="#" className="read-more">Manage Requests</Link>
                  </div>
                </div>

                <div className="card admin-only">
                  <div className="card-header">
                    <i className="fas fa-comment-alt card-icon"></i>
                    <h3 className="card-title">Feedback & Reports</h3>
                  </div>
                  <div className="card-content">
                    <p>Collect feedback from users and generate detailed usage reports.</p>
                    <Link to="#" className="read-more">View Feedback</Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}

export default HomePage;