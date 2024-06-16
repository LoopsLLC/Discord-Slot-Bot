const { EmbedBuilder } = require('discord.js');
const { logsChannelId, embedcolour } = require('./config.json');

const logEvent = async (client, title, description, user = null) => {
  const logsChannel = client.channels.cache.get(logsChannelId);
  if (!logsChannel) {
    console.error('Logs channel not found.');
    return null;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(embedcolour)
    .setTimestamp();

  if (user) {
    embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
  }

  await logsChannel.send({ embeds: [embed] });

  return embed;
};

module.exports = logEvent;