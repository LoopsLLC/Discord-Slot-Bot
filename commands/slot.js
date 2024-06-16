const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logEvent = require('../logger');
const { staffRoleId, ownerId, slotRules, categoryId, embedcolour } = require('../config.json');

const durations = {
  '1 day': 1 * 24 * 60 * 60 * 1000,
  '1 week': 7 * 24 * 60 * 60 * 1000,
  '1 month': 30 * 24 * 60 * 60 * 1000,
  '6 months': 6 * 30 * 24 * 60 * 60 * 1000,
  '1 year': 365 * 24 * 60 * 60 * 1000,
  'lifetime': -1,
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slot')
    .setDescription('Creates a slot channel for the specified user.')
    .addUserOption(option => option.setName('user').setDescription('The user to create a slot for').setRequired(true))
    .addStringOption(option => option.setName('slot_name').setDescription('The name of the slot').setRequired(true))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('The duration of the slot')
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

    const user = interaction.options.getUser('user');
    const slotName = interaction.options.getString('slot_name');
    const durationString = interaction.options.getString('duration');
    const duration = durations[durationString];

    const guild = interaction.guild;
    const startDate = new Date();
    const expiryDate = duration === -1 ? -1 : new Date(startDate.getTime() + duration);
    const pingLimits = getPingLimits(duration);

    const permissions = [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AddReactions],
        deny: [PermissionsBitField.Flags.SendMessages],
      },
      {
        id: user.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
      {
        id: staffRoleId,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
      {
        id: ownerId,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
    ];

    try {
      const slotChannel = await guild.channels.create({
        name: slotName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: permissions,
      });

      const userEmbed = new EmbedBuilder()
        .setTitle(`Slot Channel Created`)
        .setDescription(`A new slot channel has been created for <@${user.id}>`)
        .addFields(
          { name: 'Slot Name', value: slotName, inline: true },
          { name: 'User', value: `<@${user.id}>`, inline: true },
          { name: 'Duration', value: durationString, inline: true },
          { name: 'Expiry Date', value: duration === -1 ? 'Never' : `<t:${Math.floor(expiryDate.getTime() / 1000)}:F>`, inline: true },
          { name: 'Ping Limits', value: `\`${pingLimits.here} @here pings\`, \`${pingLimits.everyone} @everyone pings\`` }
        )
        .setColor(embedcolour)
        .setTimestamp();

      const rulesEmbed = new EmbedBuilder()
        .setTitle('Slot Channel Rules')
        .setDescription(slotRules)
        .setColor(embedcolour)
        .setTimestamp();

      await interaction.reply({ content: `Slot channel created: ${slotChannel}`, ephemeral: true });
      await slotChannel.send({ content: `<@${user.id}>`, embeds: [userEmbed, rulesEmbed] });

      const slotInfo = {
        slotName: slotName,
        channelId: slotChannel.id,
        startDate: startDate.getTime(),
        endDate: expiryDate === -1 ? -1 : expiryDate.getTime(),
        ownerId: user.id,
        ownerUsername: user.username,
        duration: duration
      };

      const infoFilePath = path.join(__dirname, '..', 'information.json');
      let information;
      try {
        information = JSON.parse(fs.readFileSync(infoFilePath, 'utf8'));
      } catch (err) {
        information = [];
      }
      information.push(slotInfo);
      fs.writeFileSync(infoFilePath, JSON.stringify(information, null, 2), 'utf8');

      const logDescription = `Slot Name: ${slotName}\nGiven by: <@${interaction.user.id}>\nEnds: ${duration === -1 ? 'Never' : `<t:${Math.floor(expiryDate.getTime() / 1000)}:F>`}`;
      await logEvent(interaction.client, `Slot Created for ${user.tag}`, logDescription, user);

    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'There was an error executing that command!', ephemeral: true });
      }
    }
  },
};
