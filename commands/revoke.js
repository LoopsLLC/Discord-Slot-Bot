// revoke.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logEvent = require('../logger');
const { staffRoleId } = require('../config.json');

async function revokeSlot(client, user, channel, interactionUser) {
  if (channel.type !== ChannelType.GuildText) {
    return 'Please specify a valid text channel.';
  }

  await channel.permissionOverwrites.edit(user, {
    ViewChannel: false,
    SendMessages: false,
  });

  const description = `User: <@${user.id}>\nChannel: <#${channel.id}>\nRevoked by: <@${interactionUser.id}>`;
  const embed = await logEvent(client, 'User Access Revoked', description, user);

  const infoFilePath = path.join(__dirname, '..', 'information.json');
  let information;
  try {
    information = JSON.parse(fs.readFileSync(infoFilePath, 'utf8'));
  } catch (err) {
    information = [];
  }

  const updatedInformation = information.filter(slot => !(slot.ownerId === user.id && slot.channelId === channel.id));

  fs.writeFileSync(infoFilePath, JSON.stringify(updatedInformation, null, 2), 'utf8');

  await channel.send({ embeds: [embed] });

  try {
    await user.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Could not send DM to ${user.tag}.`, error);
  }

  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('revoke')
    .setDescription('Revokes the specified user\'s access to the specified slot channel.')
    .addUserOption(option => option.setName('user').setDescription('The user to revoke access from').setRequired(true))
    .addChannelOption(option => option.setName('channel').setDescription('The slot channel to revoke the user from').setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const channel = interaction.options.getChannel('channel');

    const error = await revokeSlot(interaction.client, user, channel, interaction.user);
    if (error) {
      return interaction.reply({ content: error, ephemeral: true });
    }

    await interaction.reply({ content: `Revoked access for <@${user.id}> from ${channel}.`, ephemeral: true });
  },
  revokeSlot,
};