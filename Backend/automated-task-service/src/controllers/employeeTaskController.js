const { generateFakeEmployees } = require('../automatedScripts/generateFakeEmployees');
const { cacheAllEmployees } = require('../automatedScripts/cacheEmployees');
const logger = require('../utils/logger');

const triggerFakeEmployees = async (req, res) => {
  try {
    logger.info('Manual trigger for fake Employee generation received.');
    await generateFakeEmployees(100);
    res.status(200).json({ message: 'Fake Employees Data generation triggered successfully.' });
  } catch (error) {
    logger.error(`Error in Fake Employee Data generation trigger: ${error.message}`);
    res.status(500).json({ message: 'Error triggering Fake Employee Data generation.', error: error.message });
  }
};

const triggerCacheEmployees = async (req, res) => {
  try {
    logger.info('Manual trigger for caching Employees received.');
    await cacheAllEmployees();
    res.status(200).json({ message: 'Employees caching triggered successfully.' });
  } catch (error) {
    logger.error(`Error in Employee caching trigger: ${error.message}`);
    res.status(500).json({ message: 'Error triggering Employee caching.', error: error.message });
  }
};

module.exports = { 
  employeeTaskController: { 
    triggerFakeEmployees,
    triggerCacheEmployees
  } 
};
