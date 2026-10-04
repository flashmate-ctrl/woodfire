const cron = require('node-cron');
const { getConfig } = require('./config');
const { runPriceCheck } = require('./scrapers');

let cronTask = null;
let lastRun = null;
let nextRun = null;

function getNextScheduledTimes() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next.toISOString();
}

function startMonitor() {
  const config = getConfig();
  const schedule = config.cronSchedule || '0 * * * *';

  console.log(`⏰ Agendador de vigilância contínua ativo: De hora a hora (${schedule})`);
  nextRun = getNextScheduledTimes();

  cronTask = cron.schedule(schedule, async () => {
    const timeStr = new Date().toLocaleTimeString('pt-PT', { timeZone: 'Europe/Lisbon' });
    console.log(`🕒 [Agendador Horário] A executar verificação automática das ${timeStr}...`);
    try {
      lastRun = new Date().toISOString();
      await runPriceCheck();
      nextRun = getNextScheduledTimes();
    } catch (err) {
      console.error('❌ Erro na verificação agendada de hora a hora:', err);
    }
  });

  return {
    active: true,
    schedule,
    nextRun
  };
}

function stopMonitor() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}

function getMonitorStatus() {
  const config = getConfig();
  return {
    active: cronTask !== null,
    schedule: config.cronSchedule || '0 * * * *',
    frequency: 'De hora a hora (24 vezes ao dia, 24/7)',
    lastRun,
    nextRun: getNextScheduledTimes()
  };
}

module.exports = {
  startMonitor,
  stopMonitor,
  getMonitorStatus,
  triggerCheck: runPriceCheck
};
