const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logEvent = require('../logger');
const { staffRoleId } = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Adds the specified user to the specified slot channel.')
    .addUserOption(option => option.setName('user').setDescription('The user to add to the slot channel').setRequired(true))
    .addChannelOption(option => option.setName('channel').setDescription('The slot channel to add the user to').setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const channel = interaction.options.getChannel('channel');

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({ content: 'Please specify a valid text channel.', ephemeral: true });
    }

    await channel.permissionOverwrites.edit(user, {
      ViewChannel: true,
      SendMessages: true,
    });

    const description = `<@${user.id}> has been added to the channel ${channel}\nAdded by: <@${interaction.user.id}>`;
    const embed = await logEvent(interaction.client, 'User Added to Slot Channel', description, user);

    const infoFilePath = path.join(__dirname, '..', 'information.json');
    let information;
    try {
      information = JSON.parse(fs.readFileSync(infoFilePath, 'utf8'));
    } catch (err) {
      information = [];
    }

    for (const slot of information) {
      if (slot.channelId === channel.id) {
        slot.ownerId = user.id;
        slot.ownerUsername = user.username;
        break;
      }
    }

    fs.writeFileSync(infoFilePath, JSON.stringify(information, null, 2), 'utf8');

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `Added <@${user.id}> to ${channel}.`, ephemeral: true });

    try {
      await user.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Could not send DM to ${user.tag}.`, error);
    }
  },
};
