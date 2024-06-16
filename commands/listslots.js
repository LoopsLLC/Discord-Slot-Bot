const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { staffRoleId, embedcolour } = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listslots')
    .setDescription('Lists all active slot channels.'),
  async execute(interaction) {
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const infoFilePath = path.join(__dirname, '..', 'information.json');
    let information;
    try {
      information = JSON.parse(fs.readFileSync(infoFilePath, 'utf8'));
    } catch (err) {
      information = [];
    }

    if (information.length === 0) {
      return interaction.reply({ content: 'No active slot channels found.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('Active Slot Channels')
      .setColor(embedcolour)
      .setTimestamp();

      information.forEach(slot => {
        embed.addFields(
          { name: 'Slot Name', value: slot.slotName, inline: true },
          { name: 'Owner', value: `<@${slot.ownerId}>`, inline: true },
          { name: 'Expiry Date', value: slot.endDate === -1 ? 'Never' : `<t:${Math.floor(slot.endDate / 1000)}:F>`, inline: true }
        );
      });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};