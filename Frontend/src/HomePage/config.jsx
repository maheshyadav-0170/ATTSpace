const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:4000';
const NOTIFICATIONS_BASE_URL = import.meta.env.VITE_PROFILE_BASE_URL || 'http://localhost:4001';
const PROFILE_BASE_URL = import.meta.env.VITE_PROFILE_BASE_URL || 'http://localhost:4003';

export const API_ENDPOINTS = {
  profile: {
    get: `${PROFILE_BASE_URL}/profile/get`,
    update: `${PROFILE_BASE_URL}/profile/update`, // Example endpoint
  },
  notifications: {
    fetch: `${NOTIFICATIONS_BASE_URL}/notifications/fetch`,
    read: `${NOTIFICATIONS_BASE_URL}/notifications/read`,
    readall: `${NOTIFICATIONS_BASE_URL}/notifications/readall`
  },
  auth: {
    login: `${AUTH_BASE_URL}/auth/login`, // Example endpoint
    logout: `${AUTH_BASE_URL}/auth/logout`, // Example endpoint
    refresh: `${AUTH_BASE_URL}/auth/refresh`, // Example endpoint
  },
  // Add more services as needed, e.g.:
  // reservation: {
  //   book: `${RESERVATION_BASE_URL}/reservation/book`,
  //   list: `${RESERVATION_BASE_URL}/reservation/list`,
  // },
};