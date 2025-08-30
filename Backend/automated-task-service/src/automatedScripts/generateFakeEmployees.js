const { faker } = require('@faker-js/faker');
const Employee = require('../models/Employee'); // use Employee model
const logger = require('../utils/logger');

// Predefined realistic shift timings in 24-hour format
const shifts = [
  "06:00-15:00",
  "09:00-18:00",
  "12:30-21:30",
  "14:00-23:00",
  "22:00-07:00"
];

const roles = ["Administrator", "Manager", "RegularUser"];

async function generateFakeEmployees(count = 100) {
  try {
    logger.info(`Flushing existing employees...`);
    await Employee.deleteMany({}); // flush everything before inserting

    logger.info(`Starting to generate ${count} fake employees...`);

    const fakeEmployees = [];

    for (let i = 0; i < count; i++) {
      const attuid = faker.string.alphanumeric({ length: 6 }).toLowerCase();
      const managerAttuid = faker.string.alphanumeric({ length: 6 }).toLowerCase();

      const employee = {
        attuid,
        firstname: faker.person.firstName(),
        lastname: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        jobTitle: faker.person.jobTitle(),
        businessUnit: faker.company.name(),
        manager: managerAttuid,
        shift: faker.helpers.arrayElement(shifts),
        role: faker.helpers.arrayElement(roles)
      };

      fakeEmployees.push(employee);
    }

    const inserted = await Employee.insertMany(fakeEmployees);
    logger.info(`Inserted ${inserted.length} employees successfully.`);

  } catch (error) {
    logger.error(`Error generating employees: ${error.message}`);
  }
}

module.exports = { generateFakeEmployees };
