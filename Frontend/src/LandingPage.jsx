import { Navbar, Nav, Container } from 'react-bootstrap';

function LandingPage() {
  return (
    <div className="App">
      {/* White Navbar with Shadow */}
      <Navbar bg="white" expand="lg" className="navbar navbar-shadow px-3">
        <Container fluid>
          {/* Brand/Logo */}
          <Navbar.Brand href="/">
            <i className="fas fa-home me-2"></i>  {/* Font Awesome home icon */}
            Attspace
          </Navbar.Brand>
          
          {/* Toggle button for mobile */}
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          
          {/* Collapsible Nav Items */}
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="/home">Home</Nav.Link>
              <Nav.Link href="/reservation">Reservation</Nav.Link>
              {/* Add more links as needed */}
            </Nav>
            {/* Profile Icon and Logout Button (right-aligned) */}
            <Nav>
              <Nav.Link href="#profile" className="d-flex align-items-center profile-link">
                <i className="fas fa-user profile-icon"></i>
                <span className="profile-tooltip">Profile</span>
              </Nav.Link>
              <Nav.Link as="div" className="d-flex align-items-center">
                <button className="logout-btn">
                  <i className="fas fa-sign-out-alt me-1"></i>
                  Logout
                </button>
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Landing Content */}
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1>Welcome to Attspace</h1>
        <p>Discover a modern workspace solution. Click <a href="/home">here</a> to enter your dashboard.</p>
      </div>
    </div>
  );
}

export default LandingPage;