const fs = require('fs');
const path = require('path');
const { ChannelType } = require('discord.js');
const { guildId } = require('./config.json');

async function checkExpiredSlots(client) {
  const infoFilePath = path.join(__dirname, 'information.json');
  let information;

  try {
    information = JSON.parse(fs.readFileSync(infoFilePath, 'utf8'));
  } catch (err) {
    information = [];
  }

  const now = Date.now();
  const updatedInformation = [];

  for (const slot of information) {
    if (slot.endDate !== -1 && now >= slot.endDate) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const channel = guild.channels.cache.get(slot.channelId);
        if (channel && channel.deletable) {
          await channel.delete();
          const user = await client.users.fetch(slot.ownerId);
          await user.send(`Your slot channel ${slot.slotName} has expired and has been deleted.`);
        }
      }
    } else {
      updatedInformation.push(slot);
    }
  }

  fs.writeFileSync(infoFilePath, JSON.stringify(updatedInformation, null, 2), 'utf8');
}

function startCheckingSlots(client) {
  setInterval(() => {
    checkExpiredSlots(client);
  }, 60 * 1000);
}

module.exports = startCheckingSlots;