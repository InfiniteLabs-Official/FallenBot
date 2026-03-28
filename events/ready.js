const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder
} = require('discord.js');

const config = require('../config.json');

const APPLICATION_TYPES = [
    "Staff Application",
    "Admin Application"
];

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {

        console.log(`🔥 FallenBot online as ${client.user.tag}`);

        const channel = await client.channels.fetch(config.panelChannelId);

        const embed = new EmbedBuilder()
            .setTitle('📋 FallenBot Applications')
            .setDescription('Select an application below to begin.\n\nMake sure your DMs are open.')
            .setColor(0x5865F2);

        const menu = new StringSelectMenuBuilder()
            .setCustomId('application_select')
            .setPlaceholder('Choose an application')
            .addOptions(
                APPLICATION_TYPES.map(type => ({
                    label: type,
                    value: type
                }))
            );

        const row = new ActionRowBuilder().addComponents(menu);

        await channel.send({
            embeds: [embed],
            components: [row]
        });

        // Register slash commands
        await client.application.commands.set([
            {
                name: 'cancel',
                description: 'Cancel your active application'
            }
        ]);
    }
};
