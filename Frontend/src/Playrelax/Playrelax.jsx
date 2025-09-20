import { Container, Form, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import NavbarComponent from '../HomePage/NavbarComponent';
import '../HomePage/Home.css';

function PlayRelax() {
  const userData = {
    attuid: localStorage.getItem("attuid"),
    firstname: localStorage.getItem("firstname"),
    lastname: localStorage.getItem("lastname"),
  };

  // Mock data for open game invitations (replace with API call in production)
  const [invitations, setInvitations] = useState([
    { id: 1, game: 'Carrom', user: 'John Doe', team: 'Engineering', time: 'Today, 3:00 PM' },
    { id: 2, game: 'Chess', user: 'Jane Smith', team: 'Marketing', time: 'Tomorrow, 2:00 PM' },
    { id: 3, game: 'Foosball', user: 'Mike Johnson', team: 'Sales', time: 'Today, 4:00 PM' },
  ]);

  // State for the registration form
  const [selectedGame, setSelectedGame] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  const handleRegister = (e) => {
    e.preventDefault();
    if (!selectedGame || !preferredTime) {
      alert('Please select a game and enter a preferred time.');
      return;
    }
    // Mock adding a new invitation (replace with API call)
    const newInvitation = {
      id: invitations.length + 1,
      game: selectedGame,
      user: `${userData.firstname} ${userData.lastname}`,
      team: 'Your Team', // Replace with actual team data from userData or backend
      time: preferredTime,
    };
    setInvitations([...invitations, newInvitation]);
    setSelectedGame('');
    setPreferredTime('');
    alert('Game registered successfully! Others can now join.');
  };

  const handleJoin = (invitationId) => {
    // Mock joining a game (replace with API call)
    alert(`You have joined the ${invitations.find(inv => inv.id === invitationId).game} game!`);
    // Optionally remove the invitation or update its status
    setInvitations(invitations.filter(inv => inv.id !== invitationId));
  };

  if (!userData.attuid) {
    return (
      <div className="permission-denied">
        <h2>Permission Denied</h2>
        <p>You do not have access to this page. Please log in or contact support.</p>
        <Link to="/" className="back-button">Back to Landing Page</Link>
      </div>
    );
  }

  return (
    <div className="App">
      <NavbarComponent />
      <div className="greeting">
        <h2>
          Welcome to Play & Relax, {userData.firstname || 'User'} {userData.lastname || ''}!
        </h2>
        <p>
          Take a break with fun games in our play arena to unwind and connect with colleagues.
        </p>
      </div>

      <main className="py-5">
        <Container>
          <h2 className="section-heading">Play & Relax</h2>
          <div className="card-container game-container" id="game-section">
            <Link to="/home" className="back-button">
              <i className="fas fa-arrow-circle-left back-icon"></i>
              <span className="back-tooltip">Back to Home</span>
            </Link>

            <div className="card">
              <div className="card-header">
                <i className="fas fa-table card-icon"></i>
                <h3 className="card-title">Carrom</h3>
              </div>
              <div className="card-content">
                <p>Enjoy a strategic and fun carrom game with colleagues in the play arena.</p>
                <Link to="#" className="read-more">Play Now</Link>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <i className="fas fa-chess-board card-icon"></i>
                <h3 className="card-title">Chess</h3>
              </div>
              <div className="card-content">
                <p>Challenge your mind with a classic chess match in a relaxing environment.</p>
                <Link to="#" className="read-more">Play Now</Link>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <i className="fas fa-futbol card-icon"></i>
                <h3 className="card-title">Foosball</h3>
              </div>
              <div className="card-content">
                <p>Engage in an exciting foosball game to unwind and socialize.</p>
                <Link to="#" className="read-more">Play Now</Link>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <i className="fas fa-table-tennis card-icon"></i>
                <h3 className="card-title">Table Tennis</h3>
              </div>
              <div className="card-content">
                <p>Experience fast-paced table tennis matches to boost your energy.</p>
                <Link to="#" className="read-more">Play Now</Link>
              </div>
            </div>
          </div>

          <div className="section-heading-container">
            <i className="fas fa-gamepad section-heading-icon"></i>
            <h2 className="section-heading">Play Arena</h2>
          </div>
          <div className="game-container">
            <div className="register-container">
              <hr className="section-divider" />
              <div className="register-header">
                <i className="fas fa-user-plus register-icon"></i>
                <h3 className="register-title">Register for a Game</h3>
                <p className="register-description">Looking for a game partner? Register your interest and let others join you!</p>
                <p className="register-subdescription">Select your preferred game and time to create an open invitation for colleagues.</p>
              </div>
              <div className="register-form">
                <Form onSubmit={handleRegister}>
                  <Form.Group controlId="gameSelect" className="mb-3">
                    <Form.Label>Select Game</Form.Label>
                    <Form.Select
                      value={selectedGame}
                      onChange={(e) => setSelectedGame(e.target.value)}
                    >
                      <option value="">Choose a game</option>
                      <option value="Carrom">Carrom</option>
                      <option value="Chess">Chess</option>
                      <option value="Foosball">Foosball</option>
                      <option value="Table Tennis">Table Tennis</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group controlId="preferredTime" className="mb-3">
                    <Form.Label>Preferred Time</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g., Today, 3:00 PM"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                    />
                  </Form.Group>
                  <Button variant="primary" type="submit" className="logout-btn">
                    Register
                  </Button>
                </Form>
              </div>
              <hr className="section-divider" />
            </div>

            <div className="invitations-container">
              <hr className="section-divider" />
              <div className="invitations-header">
                <i className="fas fa-users invitations-icon"></i>
                <h3 className="invitations-title">Open Game Invitations</h3>
                <p className="invitations-description">Join a game posted by colleagues from other teams!</p>
                <p className="invitations-subdescription">Browse available games and join one that fits your schedule.</p>
              </div>
              <div className="invitations-list">
                {invitations.length === 0 ? (
                  <p className="no-invitations">No open invitations at the moment.</p>
                ) : (
                  invitations.map((invitation) => (
                    <div key={invitation.id} className="invitation-item">
                      <p className="invitation-details">
                        <strong>{invitation.game}</strong> by {invitation.user} ({invitation.team}) at {invitation.time}
                      </p>
                      <Button
                        variant="primary"
                        className="logout-btn"
                        onClick={() => handleJoin(invitation.id)}
                      >
                        Join Game
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <hr className="section-divider" />
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}

export default PlayRelax;