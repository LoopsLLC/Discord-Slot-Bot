const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const logEvent = require('./logger');
const { categoryId, embedcolour } = require('./config.json');
const { revokeSlot } = require('./commands/revoke');

const pingsFilePath = path.join(__dirname, 'pings.json');
const infoFilePath = path.join(__dirname, 'information.json');

const loadFile = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error loading file ${filePath}:`, err);
    return [];
  }
};

const saveFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const getPingLimits = (duration) => {
  if (duration === -1) {
    return { everyone: 2, here: 0 };
  } else if (duration >= 365 * 24 * 60 * 60 * 1000) {
    return { everyone: 1, here: 1 };
  } else if (duration >= 30 * 24 * 60 * 60 * 1000) {
    return { everyone: 1, here: 1 };
  } else {
    return { everyone: 0, here: 1 };
  }
};

const trackPings = async (client, message) => {
  if (!message.guild || message.author.bot) return;

  const { guild, channel, author, content } = message;
  if (channel.parentId !== categoryId) return;

  const pings = loadFile(pingsFilePath);
  const information = loadFile(infoFilePath);
  const slotInfo = information.find(slot => slot.channelId === channel.id);

  if (!slotInfo) return;

  const limits = getPingLimits(slotInfo.duration);
  let userPings = pings.find(ping => ping.userId === author.id && ping.channelId === channel.id);

  if (!userPings) {
    userPings = { userId: author.id, channelId: channel.id, everyone: [], here: [] };
    pings.push(userPings);
  }

  const now = Date.now();
  const resetTime = 24 * 60 * 60 * 1000;
  userPings.everyone = userPings.everyone.filter(timestamp => now - timestamp < resetTime);
  userPings.here = userPings.here.filter(timestamp => now - timestamp < resetTime);

  let updated = false;
  let messageContent = '';

  if (content.includes('@everyone')) {
    if (userPings.everyone.length >= limits.everyone) {
      const embed = new EmbedBuilder()
        .setTitle('Ping Limit Exceeded')
        .setDescription('You have exceeded your @everyone pings for today.')
        .setColor(embedcolour)
        .setTimestamp();
      await message.reply({ embeds: [embed] });

      await revokeSlot(client, author, channel, client.user);
      return;
    } else {
      userPings.everyone.push(now);
      updated = true;
      const nextResetTimestamp = Math.max(...userPings.everyone) + resetTime;
      messageContent = `Recognized @everyone ping, you've got ${limits.everyone - userPings.everyone.length} remaining. This will reset <t:${Math.floor(nextResetTimestamp / 1000)}:R>`;
    }
  }

  if (content.includes('@here')) {
    if (userPings.here.length >= limits.here) {
      const embed = new EmbedBuilder()
        .setTitle('Ping Limit Exceeded')
        .setDescription('You have exceeded your @here pings for today.')
        .setColor(embedcolour)
        .setTimestamp();
      await message.reply({ embeds: [embed] });

      await revokeSlot(client, author, channel, client.user);
      return;
    } else {
      userPings.here.push(now);
      updated = true;
      const nextResetTimestamp = Math.max(...userPings.here) + resetTime;
      messageContent = `Recognized @here ping, you've got ${limits.here - userPings.here.length} remaining. This will reset <t:${Math.floor(nextResetTimestamp / 1000)}:R>`;
    }
  }

  if (updated) {
    saveFile(pingsFilePath, pings);

    if (messageContent) {
      const embed = new EmbedBuilder()
        .setTitle('Ping Limit Notification')
        .setDescription(messageContent)
        .setColor(embedcolour)
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    }
  }
};

module.exports = trackPings;