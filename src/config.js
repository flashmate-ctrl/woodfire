const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

function ensureConfigDir() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getConfig() {
  ensureConfigDir();
  let fileConfig = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (e) {
      console.error('Erro ao ler config.json:', e.message);
    }
  }

  return {
    port: parseInt(process.env.PORT || fileConfig.port || 3000, 10),
    telegramBotToken: fileConfig.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: fileConfig.telegramChatId || process.env.TELEGRAM_CHAT_ID || '',
    cronSchedule: fileConfig.cronSchedule || process.env.CRON_SCHEDULE || '0 0,6,12,18 * * *',
    alertTargetPrice: parseFloat(fileConfig.alertTargetPrice || process.env.ALERT_TARGET_PRICE || 380.00),
    checkTimesPerDay: fileConfig.checkTimesPerDay || 4,
    freeShippingOnly: fileConfig.freeShippingOnly ?? false
  };
}

function updateConfig(newConfig) {
  ensureConfigDir();
  const current = getConfig();
  const updated = {
    ...current,
    ...newConfig
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf8');

  // Also update process.env for the active session
  if (newConfig.telegramBotToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = newConfig.telegramBotToken;
  if (newConfig.telegramChatId !== undefined) process.env.TELEGRAM_CHAT_ID = newConfig.telegramChatId;
  if (newConfig.cronSchedule !== undefined) process.env.CRON_SCHEDULE = newConfig.cronSchedule;

  return updated;
}

module.exports = {
  getConfig,
  updateConfig
};
