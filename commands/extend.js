// extend.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logEvent = require('../logger');
const { staffRoleId } = require('../config.json');

const durations = {
  '1 day': 1 * 24 * 60 * 60 * 1000,
  '1 week': 7 * 24 * 60 * 60 * 1000,
  '1 month': 30 * 24 * 60 * 60 * 1000,
  '6 months': 6 * 30 * 24 * 60 * 60 * 1000,
  '1 year': 365 * 24 * 60 * 60 * 1000,
  'lifetime': -1,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('extend')
    .setDescription('Extends the duration of a slot channel.')
    .addChannelOption(option => option.setName('channel').setDescription('The slot channel to extend').setRequired(true))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('The extension duration')
        .setRequired(true)
        .addChoices(
          { name: '1 day', value: '1 day' },
          { name: '1 week', value: '1 week' },
          { name: '1 month', value: '1 month' },
          { name: '6 months', value: '6 months' },
          { name: '1 year', value: '1 year' },
          { name: 'lifetime', value: 'lifetime' }
        )),
  async execute(interaction) {
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const durationString = interaction.options.getString('duration');
    const duration = durations[durationString];

    if (!duration) {
      return interaction.reply({ content: 'Invalid duration format!', ephemeral: true });
    }

    const infoFilePath = path.join(__dirname, '..', 'information.json');
    let information;
    try {
      information = JSON.parse(fs.readFileSync(infoFilePath, 'utf8'));
    } catch (err) {
      information = [];
    }

    const slotInfo = information.find(slot => slot.channelId === channel.id);
    if (!slotInfo) {
      return interaction.reply({ content: 'Slot channel not found.', ephemeral: true });
    }

    if (duration === -1) {
      slotInfo.endDate = -1;
    } else {
      if (slotInfo.endDate === -1) {
        slotInfo.endDate = Date.now() + duration;
      } else {
        slotInfo.endDate += duration;
      }
    }

    fs.writeFileSync(infoFilePath, JSON.stringify(information, null, 2), 'utf8');

    const description = `Channel: <#${channel.id}>\nExtended by: <@${interaction.user.id}>\nNew End Date: ${duration === -1 ? 'Never' : `<t:${Math.floor(slotInfo.endDate / 1000)}:F>`}`;
    const embed = await logEvent(interaction.client, `Slot Extended for ${slotInfo.slotName}`, description, interaction.user);

    await channel.send({ embeds: [embed] }).catch(console.error);
    await interaction.reply({ content: `Extended ${channel}.`, ephemeral: true });

    try {
      const user = await interaction.client.users.fetch(slotInfo.ownerId);
      await user.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Could not send DM to ${slotInfo.ownerUsername}.`, error);
    }
  },
};