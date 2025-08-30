const { cacheAllAuthUsers } = require('../automatedScripts/cacheAuthUsers');
const logger = require('../utils/logger');

const triggerCache = async (req, res) => {
  try {
    logger.info('Manual trigger for caching AuthUsers received.');
    await cacheAllAuthUsers();
    res.status(200).json({ message: 'AuthUsers caching triggered successfully.' });
  } catch (error) {
    logger.error(`Error in manual caching trigger: ${error.message}`);
    res.status(500).json({ message: 'Error triggering caching.', error: error.message });
  }
};

module.exports = { authUserTaskController: { triggerCache } };
