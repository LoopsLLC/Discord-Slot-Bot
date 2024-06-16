// hold.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const logEvent = require('../logger');
const { staffRoleId, embedcolour } = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hold')
    .setDescription('Temporarily puts the specified user\'s slot on hold in the specified slot channel.')
    .addUserOption(option => option.setName('user').setDescription('The user to put on hold').setRequired(true))
    .addChannelOption(option => option.setName('channel').setDescription('The slot channel to put the user on hold').setRequired(true)),
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
      SendMessages: false,
    });

    const embed = new EmbedBuilder()
      .setTitle('Slot On Hold')
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Channel', value: `<#${channel.id}>`, inline: true },
        { name: 'Put on hold by', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor(embedcolour)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `Put the slot for <@${user.id}> on hold in ${channel}.`, ephemeral: true });

    try {
      await user.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Could not send DM to ${user.tag}.`, error);
    }

    await logEvent(interaction.client, `Slot On Hold`, `User: <@${user.id}>\nChannel: <#${channel.id}>\nPut on hold by: <@${interaction.user.id}>`, user);
  },
};