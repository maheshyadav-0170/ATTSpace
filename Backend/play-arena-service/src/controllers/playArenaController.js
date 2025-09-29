const { redisClient, initRedis } = require('../services/helperService');
const logger = require('../utils/logger');
const { verify } = require('../services/jwtService');
const { isTokenBlacklisted } = require('../services/helperService');
const { GameBooking, Score } = require('../models/gameModels');
const { publishNotification } = require('../services/rabbitmqPublisher');
const moment = require('moment');

// 🔐 Auth middleware
async function authMiddleware(req, res, next) {
  try {
    const token =
      req.cookies?.auth_token ||
      (req.headers['authorization']?.split(' ')[1]);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing authentication token.' });
    }

    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Token has been revoked.' });
    }

    const decoded = verify(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.error(`Auth error: ${err.message}`);
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token.' });
  }
}

// Helper function to validate attuids against all_authusers
async function checkValidUsers(attuids) {
  try {
    await initRedis();
    const data = await redisClient.get('all_authusers');
    if (!data) {
      logger.info('checkValidUsers: No users found in Redis.');
      return false;
    }
    const users = JSON.parse(data);
    return attuids.every(attuid => users.some(user => user.attuid === attuid));
  } catch (err) {
    logger.error(`checkValidUsers: Error - ${err.message}`);
    throw err;
  }
}

// Get all users from Redis
async function getAllUsers(req, res) {
  try {
    await initRedis();
    const data = await redisClient.get('all_authusers');
    if (!data) {
      logger.info('get-all-users: No users found in Redis.');
      return res.status(404).json({ success: false, message: 'No users found.' });
    }

    const users = JSON.parse(data);
    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    logger.error(`get-all-users: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.', error: err.message });
  }
}

// Helper function to generate time slots for a day
function generateTimeSlots(startHour = 9, endHour = 22, intervalMinutes = 30) {
  const slots = [];
  let current = moment().startOf('day').hour(startHour);
  const end = moment().startOf('day').hour(endHour);

  while (current.isBefore(end)) {
    const startTime = current.format('HH:mm');
    current.add(intervalMinutes, 'minutes');
    const endTime = current.format('HH:mm');
    slots.push({ startTime, endTime });
  }
  return slots;
}

// Get available slots
async function getAvailableSlots(req, res) {
  try {
    await initRedis();
    const { date, gameType } = req.body;
    if (!date || !gameType) {
      return res.status(400).json({ success: false, message: 'Date and gameType are required.' });
    }

    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    if (moment(date).isBefore(moment().startOf('day'))) {
      return res.status(400).json({ success: false, message: 'Cannot fetch slots for past dates.' });
    }

    if (!['carrom', 'chess', 'foosball', 'table_tennis'].includes(gameType)) {
      return res.status(400).json({ success: false, message: 'Invalid game type.' });
    }

    const redisKey = `slots:${gameType}:${date}`;
    let availableSlots = await redisClient.get(redisKey);

    if (!availableSlots) {
      const allSlots = generateTimeSlots();
      const bookings = await GameBooking.find({
        'slot.date': new Date(date),
        gameType,
      }).lean();

      const bookedSlots = bookings.map(booking => ({
        startTime: booking.slot.startTime,
        endTime: booking.slot.endTime,
      }));

      availableSlots = allSlots.filter(slot =>
        !bookedSlots.some(booked =>
          booked.startTime === slot.startTime && booked.endTime === slot.endTime
        )
      );

      await redisClient.setEx(redisKey, 3600, JSON.stringify(availableSlots));
      logger.info(`Cached available slots for ${redisKey}`);
    } else {
      availableSlots = JSON.parse(availableSlots);
    }

    return res.json({ success: true, slots: availableSlots });
  } catch (err) {
    logger.error(`get-available-slots: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch available slots.', error: err.message });
  }
}

// Book a private game
async function bookPrivateGame(req, res) {
  try {
    await initRedis();
    const { gameType, slot, location, colleagues } = req.body;

    if (!gameType || !slot || !location || !colleagues || !Array.isArray(colleagues)) {
      return res.status(400).json({ success: false, message: 'gameType, slot, location, and colleagues array are required.' });
    }

    if (!['carrom', 'chess', 'foosball', 'table_tennis'].includes(gameType)) {
      return res.status(400).json({ success: false, message: 'Invalid game type.' });
    }

    if (!moment(slot.date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ success: false, message: 'Invalid slot date format. Use YYYY-MM-DD.' });
    }

    if (moment(slot.date).isBefore(moment().startOf('day'))) {
      return res.status(400).json({ success: false, message: 'Cannot book a game in the past.' });
    }

    if (!slot.startTime || !slot.endTime || !/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime)) {
      return res.status(400).json({ success: false, message: 'Invalid slot time format. Use HH:mm.' });
    }

    if (colleagues.length > 3 || colleagues.length < 1) {
      return res.status(400).json({ success: false, message: 'Colleagues must be 1-3 players.' });
    }

    if (colleagues.some(c => !c.attuid)) {
      return res.status(400).json({ success: false, message: 'Each colleague must have an attuid.' });
    }

    const attuids = [req.user.attuid, ...colleagues.map(c => c.attuid)];
    const validUsers = await checkValidUsers(attuids);
    if (!validUsers) {
      return res.status(400).json({ success: false, message: 'One or more attuids are invalid.' });
    }

    const slotDateTime = moment(`${slot.date} ${slot.startTime}`, 'YYYY-MM-DD HH:mm');
    if (slotDateTime.isBefore(moment())) {
      return res.status(400).json({ success: false, message: 'Cannot book a slot in the past.' });
    }

    const redisKey = `slot:${gameType}:${slot.date}:${slot.startTime}`;
    const isSlotTaken = await redisClient.get(redisKey);
    if (isSlotTaken) {
      return res.status(409).json({ success: false, message: 'This slot is already booked.' });
    }

    await redisClient.setEx(redisKey, 300, 'reserved');

    const booking = new GameBooking({
      gameType,
      bookingType: 'private',
      players: [{ attuid: req.user.attuid, checkinStatus: false }, ...colleagues.map(c => ({ attuid: c.attuid, checkinStatus: false }))],
      slot: {
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
      location,
    });

    await booking.save();
    logger.info(`Private game booked: ${gameType} at ${slot.startTime} on ${slot.date} by ${req.user.attuid}`);

    const slotCacheKey = `slots:${gameType}:${slot.date}`;
    let availableSlots = await redisClient.get(slotCacheKey);
    if (availableSlots) {
      availableSlots = JSON.parse(availableSlots).filter(s =>
        s.startTime !== slot.startTime || s.endTime !== slot.endTime
      );
      await redisClient.setEx(slotCacheKey, 3600, JSON.stringify(availableSlots));
    }

    // Notify all players
    const notificationPromises = attuids.map(attuid =>
      publishNotification({
        attuid,
        title: 'Private Game Booked',
        body: `You are booked for a ${gameType} game at ${location} on ${slot.date} from ${slot.startTime} to ${slot.endTime}.`,
      }).catch(err => logger.error(`Failed to notify ${attuid}: ${err.message}`))
    );
    await Promise.all(notificationPromises);

    return res.json({ success: true, booking });
  } catch (err) {
    logger.error(`book-private-game: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to book private game.', error: err.message });
  }
}

// Book an arena game
async function bookArenaGame(req, res) {
  try {
    await initRedis();
    const { gameType, slot, location } = req.body;

    if (!gameType || !slot || !location) {
      return res.status(400).json({ success: false, message: 'gameType, slot, and location are required.' });
    }

    if (!['carrom', 'chess', 'foosball', 'table_tennis'].includes(gameType)) {
      return res.status(400).json({ success: false, message: 'Invalid game type.' });
    }

    if (!moment(slot.date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ success: false, message: 'Invalid slot date format. Use YYYY-MM-DD.' });
    }

    if (moment(slot.date).isBefore(moment().startOf('day'))) {
      return res.status(400).json({ success: false, message: 'Cannot book a game in the past.' });
    }

    if (!slot.startTime || !slot.endTime || !/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime)) {
      return res.status(400).json({ success: false, message: 'Invalid slot time format. Use HH:mm.' });
    }

    const validUser = await checkValidUsers([req.user.attuid]);
    if (!validUser) {
      return res.status(400).json({ success: false, message: 'User attuid is invalid.' });
    }

    const slotDateTime = moment(`${slot.date} ${slot.startTime}`, 'YYYY-MM-DD HH:mm');
    if (slotDateTime.isBefore(moment())) {
      return res.status(400).json({ success: false, message: 'Cannot book a slot in the past.' });
    }

    const redisKey = `slot:${gameType}:${slot.date}:${slot.startTime}`;
    const isSlotTaken = await redisClient.get(redisKey);
    if (isSlotTaken) {
      return res.status(409).json({ success: false, message: 'This slot is already booked.' });
    }

    await redisClient.setEx(redisKey, 300, 'reserved');

    const booking = new GameBooking({
      gameType,
      bookingType: 'arena',
      players: [{ attuid: req.user.attuid, checkinStatus: false }],
      slot: {
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
      location,
    });

    await booking.save();
    logger.info(`Arena game booked: ${gameType} at ${slot.startTime} on ${slot.date} by ${req.user.attuid}`);

    const slotCacheKey = `slots:${gameType}:${slot.date}`;
    let availableSlots = await redisClient.get(slotCacheKey);
    if (availableSlots) {
      availableSlots = JSON.parse(availableSlots).filter(s =>
        s.startTime !== slot.startTime || s.endTime !== slot.endTime
      );
      await redisClient.setEx(slotCacheKey, 3600, JSON.stringify(availableSlots));
    }

    await publishNotification({
      attuid: req.user.attuid,
      title: 'Arena Game Booked',
      body: `You have created an arena ${gameType} game at ${location} on ${slot.date} from ${slot.startTime} to ${slot.endTime}. Others can join!`,
    }).catch(err => logger.error(`Failed to notify ${req.user.attuid}: ${err.message}`));

    return res.json({ success: true, booking });
  } catch (err) {
    logger.error(`book-arena-game: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to book arena game.', error: err.message });
  }
}

// Join an existing arena game
async function joinArenaGame(req, res) {
  try {
    await initRedis();
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required.' });
    }

    const validUser = await checkValidUsers([req.user.attuid]);
    if (!validUser) {
      return res.status(400).json({ success: false, message: 'User attuid is invalid.' });
    }

    const booking = await GameBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.bookingType !== 'arena') {
      return res.status(400).json({ success: false, message: 'Can only join arena-type games.' });
    }

    if (booking.players.length >= 4) {
      return res.status(400).json({ success: false, message: 'Game is already full (max 4 players).' });
    }

    const slotDateTime = moment(`${booking.slot.date.toISOString().split('T')[0]} ${booking.slot.startTime}`, 'YYYY-MM-DD HH:mm');
    if (slotDateTime.isBefore(moment())) {
      return res.status(400).json({ success: false, message: 'Cannot join a game in the past.' });
    }

    if (booking.players.some(player => player.attuid === req.user.attuid)) {
      return res.status(400).json({ success: false, message: 'You are already in this game.' });
    }

    const redisKey = `lock:booking:${bookingId}`;
    const lock = await redisClient.set(redisKey, 'locked', { EX: 10, NX: true });
    if (!lock) {
      return res.status(409).json({ success: false, message: 'Booking is being modified, try again.' });
    }

    try {
      booking.players.push({ attuid: req.user.attuid, checkinStatus: false });
      await booking.save();
      logger.info(`User ${req.user.attuid} joined arena game ${bookingId}`);

      // Invalidate open-arena cache
      const cacheKey = `open-arena:${booking.slot.date.toISOString().split('T')[0]}:${booking.gameType}`;
      await redisClient.del(cacheKey);

      await publishNotification({
        attuid: req.user.attuid,
        title: 'Joined Arena Game',
        body: `You have joined a ${booking.gameType} game at ${booking.location} on ${booking.slot.date} from ${booking.slot.startTime} to ${booking.slot.endTime}.`,
      }).catch(err => logger.error(`Failed to notify ${req.user.attuid}: ${err.message}`));

      return res.json({ success: true, booking });
    } finally {
      await redisClient.del(redisKey);
    }
  } catch (err) {
    logger.error(`join-arena-game: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to join game.', error: err.message });
  }
}

// Check-in to a game
async function checkin(req, res) {
  try {
    await initRedis();
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required.' });
    }

    const validUser = await checkValidUsers([req.user.attuid]);
    if (!validUser) {
      return res.status(400).json({ success: false, message: 'User attuid is invalid.' });
    }

    const booking = await GameBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const slotDateTime = moment(`${booking.slot.date.toISOString().split('T')[0]} ${booking.slot.startTime}`, 'YYYY-MM-DD HH:mm');
    if (slotDateTime.isBefore(moment())) {
      return res.status(400).json({ success: false, message: 'Cannot check in to a past game.' });
    }

    const player = booking.players.find(p => p.attuid === req.user.attuid);
    if (!player) {
      return res.status(400).json({ success: false, message: 'You are not a participant in this game.' });
    }

    if (player.checkinStatus) {
      return res.status(400).json({ success: false, message: 'You have already checked in.' });
    }

    const redisKey = `lock:booking:${bookingId}`;
    const lock = await redisClient.set(redisKey, 'locked', { EX: 10, NX: true });
    if (!lock) {
      return res.status(409).json({ success: false, message: 'Booking is being modified, try again.' });
    }

    try {
      player.checkinStatus = true;
      await booking.save();
      logger.info(`User ${req.user.attuid} checked in to game ${bookingId}`);

      let scoreDoc = await Score.findOne({ bookingId });
      if (scoreDoc) {
        const playerScore = scoreDoc.scores.find(s => s.attuid === req.user.attuid);
        if (playerScore) {
          playerScore.score += 1;
        } else {
          scoreDoc.scores.push({ attuid: req.user.attuid, score: 1 });
        }
      } else {
        scoreDoc = new Score({
          bookingId,
          gameType: booking.gameType,
          scores: [{ attuid: req.user.attuid, score: 1 }],
        });
      }
      await scoreDoc.save();
      logger.info(`Check-in score updated for ${req.user.attuid} in game ${bookingId}`);

      await publishNotification({
        attuid: req.user.attuid,
        title: 'Game Check-In',
        body: `You have checked in to a ${booking.gameType} game at ${booking.location} on ${booking.slot.date} from ${booking.slot.startTime} to ${booking.slot.endTime}.`,
      }).catch(err => logger.error(`Failed to notify ${req.user.attuid}: ${err.message}`));

      return res.json({ success: true, booking, score: scoreDoc });
    } finally {
      await redisClient.del(redisKey);
    }
  } catch (err) {
    logger.error(`checkin: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to check in.', error: err.message });
  }
}

// List open arena games
async function getOpenArenaGames(req, res) {
  try {
    await initRedis();
    const { date, gameType } = req.body;

    if (date && !moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    if (gameType && !['carrom', 'chess', 'foosball', 'table_tennis'].includes(gameType)) {
      return res.status(400).json({ success: false, message: 'Invalid game type.' });
    }

    const query = {
      bookingType: 'arena',
      'players.3': { $exists: false },
      'slot.date': { $gte: moment().startOf('day').toDate() },
    };

    if (date) query['slot.date'] = new Date(date);
    if (gameType) query.gameType = gameType;

    const redisKey = `open-arena:${date || 'all'}:${gameType || 'all'}`;
    let openGames = await redisClient.get(redisKey);

    if (!openGames) {
      const games = await GameBooking.find(query)
        .select('gameType slot location players')
        .lean();

      const filteredGames = games.filter(game => {
        const slotDateTime = moment(`${game.slot.date.toISOString().split('T')[0]} ${game.slot.startTime}`, 'YYYY-MM-DD HH:mm');
        return slotDateTime.isSameOrAfter(moment());
      });

      openGames = filteredGames;
      await redisClient.setEx(redisKey, 3600, JSON.stringify(openGames));
      logger.info(`Cached open arena games for ${redisKey}`);
    } else {
      openGames = JSON.parse(openGames);
    }

    return res.json({ success: true, count: openGames.length, games: openGames });
  } catch (err) {
    logger.error(`get-open-arena-games: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch open arena games.', error: err.message });
  }
}

// Update a booking
async function updateBooking(req, res) {
  try {
    await initRedis();
    const { bookingId } = req.params;
    const { gameType, slot, location, colleagues } = req.body;

    if (!gameType && !slot && !location && !colleagues) {
      return res.status(400).json({ success: false, message: 'At least one field (gameType, slot, location, colleagues) must be provided.' });
    }

    const booking = await GameBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.players[0].attuid !== req.user.attuid) {
      return res.status(403).json({ success: false, message: 'Only the booking creator can update.' });
    }

    const slotDateTime = moment(`${booking.slot.date.toISOString().split('T')[0]} ${booking.slot.startTime}`, 'YYYY-MM-DD HH:mm');
    if (slotDateTime.isBefore(moment())) {
      return res.status(400).json({ success: false, message: 'Cannot update a past booking.' });
    }

    const redisKey = `lock:booking:${bookingId}`;
    const lock = await redisClient.set(redisKey, 'locked', { EX: 10, NX: true });
    if (!lock) {
      return res.status(409).json({ success: false, message: 'Booking is being modified, try again.' });
    }

    try {
      if (gameType) {
        if (!['carrom', 'chess', 'foosball', 'table_tennis'].includes(gameType)) {
          return res.status(400).json({ success: false, message: 'Invalid game type.' });
        }
        booking.gameType = gameType;
      }

      if (slot) {
        if (!moment(slot.date, 'YYYY-MM-DD', true).isValid()) {
          return res.status(400).json({ success: false, message: 'Invalid slot date format. Use YYYY-MM-DD.' });
        }
        if (moment(slot.date).isBefore(moment().startOf('day'))) {
          return res.status(400).json({ success: false, message: 'Cannot update to a past date.' });
        }
        if (!slot.startTime || !slot.endTime || !/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime)) {
          return res.status(400).json({ success: false, message: 'Invalid slot time format. Use HH:mm.' });
        }
        const newSlotDateTime = moment(`${slot.date} ${slot.startTime}`, 'YYYY-MM-DD HH:mm');
        if (newSlotDateTime.isBefore(moment())) {
          return res.status(400).json({ success: false, message: 'Cannot update to a past slot.' });
        }

        const newSlotKey = `slot:${gameType || booking.gameType}:${slot.date}:${slot.startTime}`;
        const isSlotTaken = await redisClient.get(newSlotKey);
        if (isSlotTaken) {
          return res.status(409).json({ success: false, message: 'New slot is already booked.' });
        }
        const oldSlotKey = `slot:${booking.gameType}:${booking.slot.date.toISOString().split('T')[0]}:${booking.slot.startTime}`;
        await redisClient.del(oldSlotKey);
        await redisClient.setEx(newSlotKey, 300, 'reserved');
        booking.slot = { date: new Date(slot.date), startTime: slot.startTime, endTime: slot.endTime };
      }

      if (location) {
        booking.location = location;
      }

      if (colleagues && booking.bookingType === 'private') {
        if (colleagues.length > 3 || colleagues.length < 1) {
          return res.status(400).json({ success: false, message: 'Colleagues must be 1-3 players.' });
        }
        if (!Array.isArray(colleagues) || colleagues.some(c => !c.attuid)) {
          return res.status(400).json({ success: false, message: 'colleagues must be an array of { attuid } objects.' });
        }
        const attuids = [req.user.attuid, ...colleagues.map(c => c.attuid)];
        const validUsers = await checkValidUsers(attuids);
        if (!validUsers) {
          return res.status(400).json({ success: false, message: 'One or more attuids are invalid.' });
        }
        booking.players = [{ attuid: req.user.attuid, checkinStatus: false }, ...colleagues.map(c => ({ attuid: c.attuid, checkinStatus: false }))];
      } else if (colleagues && booking.bookingType === 'arena') {
        return res.status(400).json({ success: false, message: 'Cannot update players for arena games.' });
      }

      await booking.save();
      logger.info(`Booking ${bookingId} updated by ${req.user.attuid}`);

      if (slot) {
        const newSlotCacheKey = `slots:${booking.gameType}:${slot.date}`;
        let availableSlots = await redisClient.get(newSlotCacheKey);
        if (availableSlots) {
          availableSlots = JSON.parse(availableSlots).filter(s =>
            s.startTime !== slot.startTime || s.endTime !== slot.endTime
          );
          await redisClient.setEx(newSlotCacheKey, 3600, JSON.stringify(availableSlots));
        }

        const oldSlotCacheKey = `slots:${booking.gameType}:${booking.slot.date.toISOString().split('T')[0]}`;
        let oldAvailableSlots = await redisClient.get(oldSlotCacheKey);
        if (oldAvailableSlots) {
          oldAvailableSlots = JSON.parse(oldAvailableSlots);
          oldAvailableSlots.push({ startTime: booking.slot.startTime, endTime: booking.slot.endTime });
          oldAvailableSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
          await redisClient.setEx(oldSlotCacheKey, 3600, JSON.stringify(oldAvailableSlots));
        }
      }

      // Invalidate open-arena cache if gameType or slot changed
      if (gameType || slot) {
        const cacheKey = `open-arena:${booking.slot.date.toISOString().split('T')[0]}:${booking.gameType}`;
        await redisClient.del(cacheKey);
      }

      // Notify all players
      const notificationPromises = booking.players.map(player =>
        publishNotification({
          attuid: player.attuid,
          title: 'Booking Updated',
          body: `Your ${booking.gameType} booking at ${booking.location} on ${booking.slot.date} from ${booking.slot.startTime} to ${booking.slot.endTime} has been updated.`,
        }).catch(err => logger.error(`Failed to notify ${player.attuid}: ${err.message}`))
      );
      await Promise.all(notificationPromises);

      return res.json({ success: true, booking });
    } finally {
      await redisClient.del(redisKey);
    }
  } catch (err) {
    logger.error(`update-booking: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update booking.', error: err.message });
  }
}

// Cancel a booking
async function cancelBooking(req, res) {
  try {
    await initRedis();
    const { bookingId } = req.params;

    const booking = await GameBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.players[0].attuid !== req.user.attuid) {
      return res.status(403).json({ success: false, message: 'Only the booking creator can cancel.' });
    }

    const slotDateTime = moment(`${booking.slot.date.toISOString().split('T')[0]} ${booking.slot.startTime}`, 'YYYY-MM-DD HH:mm');
    if (slotDateTime.isBefore(moment())) {
      return res.status(400).json({ success: false, message: 'Cannot cancel a past booking.' });
    }

    const redisKey = `lock:booking:${bookingId}`;
    const lock = await redisClient.set(redisKey, 'locked', { EX: 10, NX: true });
    if (!lock) {
      return res.status(409).json({ success: false, message: 'Booking is being modified, try again.' });
    }

    try {
      const players = [...booking.players];
      await booking.deleteOne();
      logger.info(`Booking ${bookingId} canceled by ${req.user.attuid}`);

      const slotKey = `slot:${booking.gameType}:${booking.slot.date.toISOString().split('T')[0]}:${booking.slot.startTime}`;
      await redisClient.del(slotKey);

      const slotCacheKey = `slots:${booking.gameType}:${booking.slot.date.toISOString().split('T')[0]}`;
      let availableSlots = await redisClient.get(slotCacheKey);
      if (availableSlots) {
        availableSlots = JSON.parse(availableSlots);
        availableSlots.push({ startTime: booking.slot.startTime, endTime: booking.slot.endTime });
        availableSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
        await redisClient.setEx(slotCacheKey, 3600, JSON.stringify(availableSlots));
      }

      // Invalidate open-arena cache
      const cacheKey = `open-arena:${booking.slot.date.toISOString().split('T')[0]}:${booking.gameType}`;
      await redisClient.del(cacheKey);

      // Notify all players
      const notificationPromises = players.map(player =>
        publishNotification({
          attuid: player.attuid,
          title: 'Booking Canceled',
          body: `Your ${booking.gameType} booking at ${booking.location} on ${booking.slot.date} from ${booking.slot.startTime} to ${booking.slot.endTime} has been canceled.`,
        }).catch(err => logger.error(`Failed to notify ${player.attuid}: ${err.message}`))
      );
      await Promise.all(notificationPromises);

      return res.json({ success: true, message: 'Booking canceled successfully.' });
    } finally {
      await redisClient.del(redisKey);
    }
  } catch (err) {
    logger.error(`cancel-booking: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to cancel booking.', error: err.message });
  }
}

// Get user's bookings
async function getMyBookings(req, res) {
  try {
    const bookings = await GameBooking.find({
      'players.attuid': req.user.attuid,
    }).select('gameType bookingType slot location players').lean();

    return res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    logger.error(`get-my-bookings: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch bookings.', error: err.message });
  }
}

// Submit game score
async function submitScore(req, res) {
  try {
    const { bookingId, scores } = req.body;
    if (!bookingId || !scores || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ success: false, message: 'bookingId and non-empty scores array are required.' });
    }

    const booking = await GameBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.players[0].attuid !== req.user.attuid) {
      return res.status(403).json({ success: false, message: 'Only the booking creator can submit scores.' });
    }

    const slotDateTime = moment(`${booking.slot.date.toISOString().split('T')[0]} ${booking.slot.startTime}`, 'YYYY-MM-DD HH:mm');
    if (slotDateTime.isAfter(moment())) {
      return res.status(400).json({ success: false, message: 'Cannot submit scores for a future game.' });
    }

    if (scores.length > booking.players.length) {
      return res.status(400).json({ success: false, message: 'Too many scores provided.' });
    }

    if (scores.some(s => !s.attuid || !Number.isInteger(s.score) || s.score < 0)) {
      return res.status(400).json({ success: false, message: 'Each score must have a valid attuid and a non-negative integer score.' });
    }

    const attuids = scores.map(s => s.attuid);
    const validUsers = await checkValidUsers(attuids);
    if (!validUsers) {
      return res.status(400).json({ success: false, message: 'One or more attuids in scores are invalid.' });
    }

    if (!attuids.every(attuid => booking.players.some(p => p.attuid === attuid))) {
      return res.status(400).json({ success: false, message: 'All score attuids must be participants in the booking.' });
    }

    const existingScore = await Score.findOne({ bookingId });
    if (existingScore) {
      return res.status(400).json({ success: false, message: 'Scores already submitted for this booking.' });
    }

    const score = new Score({
      bookingId,
      gameType: booking.gameType,
      scores,
    });

    await score.save();
    logger.info(`Score submitted for booking ${bookingId} by ${req.user.attuid}`);

    // Notify all players
    const notificationPromises = booking.players.map(player =>
      publishNotification({
        attuid: player.attuid,
        title: 'Game Score Submitted',
        body: `Scores for your ${booking.gameType} game at ${booking.location} on ${booking.slot.date} from ${booking.slot.startTime} to ${booking.slot.endTime} have been submitted.`,
      }).catch(err => logger.error(`Failed to notify ${player.attuid}: ${err.message}`))
    );
    await Promise.all(notificationPromises);

    return res.json({ success: true, score });
  } catch (err) {
    logger.error(`submit-score: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to submit score.', error: err.message });
  }
}

// Get scores for a booking
async function getScores(req, res) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required.' });
    }

    const scores = await Score.find({ bookingId }).lean();
    if (!scores.length) {
      return res.status(404).json({ success: false, message: 'No scores found for this booking.' });
    }

    return res.json({ success: true, scores });
  } catch (err) {
    logger.error(`get-scores: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch scores.', error: err.message });
  }
}

// Get aggregated user scores by game type for all users
async function getUserScores(req, res) {
  try {
    const { gameType } = req.body;

    if (gameType && !['carrom', 'chess', 'foosball', 'table_tennis'].includes(gameType)) {
      return res.status(400).json({ success: false, message: 'Invalid game type.' });
    }

    const matchStage = gameType ? { gameType } : {};
    const pipeline = [
      { $match: matchStage },
      { $unwind: '$scores' },
      {
        $group: {
          _id: { attuid: '$scores.attuid', gameType: '$gameType' },
          totalScore: { $sum: '$scores.score' },
        },
      },
      {
        $group: {
          _id: '$_id.attuid',
          scores: {
            $push: {
              gameType: '$_id.gameType',
              totalScore: '$totalScore',
            },
          },
        },
      },
      {
        $project: {
          attuid: '$_id',
          scores: 1,
          _id: 0,
        },
      },
      { $sort: { attuid: 1 } },
    ];

    const userScores = await Score.aggregate(pipeline);

    if (!userScores.length) {
      return res.status(404).json({ success: false, message: 'No scores found.' });
    }

    return res.json({ success: true, count: userScores.length, userScores });
  } catch (err) {
    logger.error(`get-user-scores: Error - ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch user scores.', error: err.message });
  }
}

module.exports = {
  authMiddleware,
  getAllUsers,
  getAvailableSlots,
  bookPrivateGame,
  bookArenaGame,
  joinArenaGame,
  checkin,
  getOpenArenaGames,
  updateBooking,
  cancelBooking,
  getMyBookings,
  submitScore,
  getScores,
  getUserScores,
};