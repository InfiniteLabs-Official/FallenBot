const {
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');

const config = require('../config.json');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.content.startsWith('?edit') && message.guild && message.guild.id === config.guildId) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply("You don't have permission to use this command.");
            }

            const args = message.content.slice(6).trim(); // after ?edit

            const channel = await client.channels.fetch(config.rolesChannelId);

            let embedDesc;

            if (args) {
                embedDesc = args;
            } else {
                // generate list of roles
                const roles = message.guild.roles.cache.filter(role =>
                    !role.name.toLowerCase().includes('level') &&
                    role.name.toLowerCase() !== 'unverified' &&
                    !role.name.includes('--staff')
                );
                embedDesc = roles.map(role => `**${role.name}**: Description not set`).join('\n');
            }

            const embed = new EmbedBuilder()
                .setTitle('Server Roles')
                .setDescription(embedDesc)
                .setColor(0x5865F2);

            // find existing embed
            const messages = await channel.messages.fetch({ limit: 50 });
            const existingMessage = messages.find(msg =>
                msg.embeds.length > 0 &&
                msg.embeds[0].title === 'Server Roles' &&
                msg.author.id === client.user.id
            );

            if (existingMessage) {
                await existingMessage.edit({ embeds: [embed] });
                return message.reply("Roles embed updated.");
            } else {
                await channel.send({ embeds: [embed] });
                return message.reply("Roles embed sent.");
            }
        }
    }
};