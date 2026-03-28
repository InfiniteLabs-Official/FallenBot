const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} = require('discord.js');

const config = require('../config.json');

const QUESTIONS = [
    "**Name:**",
    "**Age:**",
    "**Timezone:**",
    "**Experience:**",
    "**Proof of Experience (upload image, link, or type 'skip'):**",
    "**Why do you want to join?**",
    "**How active are you?**"
];

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'cancel') {
                const app = client.activeApps.get(interaction.user.id);
                if (!app) {
                    return interaction.reply({
                        content: "You don't have an active application.",
                        ephemeral: true
                    });
                }
                client.activeApps.delete(interaction.user.id);
                return interaction.reply({
                    content: "Application cancelled.",
                    ephemeral: true
                });
            }
        }

        // Handle modal submits
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('decision_')) {
                const parts = interaction.customId.split('_');
                const targetId = parts[1];
                const decision = parts[2];
                const messageId = parts[3];
                const accepted = decision === 'accept';
                const reason = interaction.fields.getTextInputValue('reason') || null;

                const message = await interaction.channel.messages.fetch(messageId);
                const embed = EmbedBuilder.from(message.embeds[0]);

                embed.setTitle(accepted ? "Accepted" : "Denied");
                embed.setColor(accepted ? 0x00AE86 : 0xFF0000);

                if (reason) {
                    embed.addFields({ name: 'Reason', value: reason });
                }

                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('Accept').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setLabel('Deny').setStyle(ButtonStyle.Danger).setDisabled(true)
                );

                if (accepted) {
                    try {
                        const member = await interaction.guild.members.fetch(targetId);
                        await member.roles.add(config.appRoleId);
                    } catch (err) {
                        console.error("Role error:", err);
                    }
                }

                try {
                    await message.edit({
                        embeds: [embed],
                        components: []
                    });
                } catch (err) {
                    console.error("Message edit error:", err);
                }

                try {
                    const user = await client.users.fetch(targetId);
                    const dmEmbed = new EmbedBuilder()
                        .setTitle("Application Result")
                        .setDescription(
                            accepted
                                ? "Your application was accepted."
                                : "Your application was denied."
                        )
                        .setColor(accepted ? 0x00AE86 : 0xFF0000);
                    if (reason) {
                        dmEmbed.addFields({ name: 'Reason', value: reason });
                    }
                    await user.send({ embeds: [dmEmbed] });
                } catch (err) {
                    console.error("DM send error:", err);
                }

                const user = await client.users.fetch(targetId);
                return interaction.reply({ content: `${accepted ? 'Accepted' : 'Denied'} ${user}'s application.`, ephemeral: true });
            }
            if (interaction.customId.startsWith('edit_roles_modal_')) {
                const messageId = interaction.customId.split('_')[3];
                const newDesc = interaction.fields.getTextInputValue('roles_desc');
                const message = await interaction.channel.messages.fetch(messageId);
                const embed = EmbedBuilder.from(message.embeds[0]);
                embed.setDescription(newDesc);
                await message.edit({ embeds: [embed] });
                return interaction.reply({ content: 'Roles updated.', ephemeral: true });
            }
        }

        // =========================
        // DROPDOWN
        // =========================
        if (interaction.isStringSelectMenu()) {

            if (interaction.customId === 'application_select') {

                const user = interaction.user;

                // 🚫 Prevent multiple apps
                if (client.activeApps.has(user.id)) {
                    return interaction.reply({
                        content: "You already have an active application.",
                        ephemeral: true
                    });
                }

                // ⏱ Cooldown check
                const last = client.cooldowns?.get(user.id);
                if (last && Date.now() - last < config.cooldownHours * 3600000) {
                    return interaction.reply({
                        content: "You must wait before applying again.",
                        ephemeral: true
                    });
                }

                // ✅ ALWAYS ACKNOWLEDGE FIRST
                await interaction.deferReply({ ephemeral: true });

                try {
                    const dm = await user.createDM();

                    // store app BEFORE sending anything else
                    client.activeApps.set(user.id, {
                        type: interaction.values[0],
                        answers: [],
                        step: 0,
                        editing: false
                    });

                    await dm.send(
`Application started.

Answer each question clearly.

---

${QUESTIONS[0]}`
                    );

                    // ✅ guaranteed response
                    return interaction.editReply({
                        content: "Check your DMs."
                    });

                } catch (err) {

                    client.activeApps.delete(user.id);

                    return interaction.editReply({
                        content: "I couldn't DM you. Enable DMs and try again."
                    });
                }

            }

            // =========================
            // EDIT SELECT MENU
            // =========================
            else if (interaction.customId === 'edit_select') {

                const userId = interaction.user.id;
                const app = client.activeApps.get(userId);

                if (!app) {
                    return interaction.reply({
                        content: "No active application.",
                        ephemeral: true
                    });
                }

                const selectedIndex = parseInt(interaction.values[0]);
                app.editing = true;
                app.editIndex = selectedIndex;

                return interaction.reply({
                    content: `Editing: ${QUESTIONS[selectedIndex]}\n\nCurrent answer: ${app.answers[selectedIndex] || 'N/A'}\n\nSend your new answer in this DM.`,
                    ephemeral: true
                });
            }

        }

        // =========================
        // BUTTONS
        // =========================
        else if (interaction.isButton()) {

            const userId = interaction.user.id;
            const app = client.activeApps.get(userId);

            // =========================
            // ❌ CANCEL
            // =========================
            if (interaction.customId === 'cancel_app') {

                if (!app) {
                    return interaction.reply({
                        content: "No active application.",
                        ephemeral: true
                    });
                }

                client.activeApps.delete(userId);

                return interaction.reply({
                    content: "Application cancelled.",
                    ephemeral: true
                });
            }

            // =========================
            // 🔄 RETRY
            // =========================
            if (interaction.customId === 'retry_app') {

                if (!app) {
                    return interaction.reply({
                        content: "No active application.",
                        ephemeral: true
                    });
                }

                app.answers = [];
                app.step = 0;

                return interaction.reply({
                    content: `Restarted.\n\n${QUESTIONS[0]}`,
                    ephemeral: true
                });
            }

            // =========================
            // ✏️ EDIT (opens select menu)
            // =========================
            if (interaction.customId === 'edit_app') {

                if (!app) {
                    return interaction.reply({
                        content: "No active application.",
                        ephemeral: true
                    });
                }

                const menu = new StringSelectMenuBuilder()
                    .setCustomId('edit_select')
                    .setPlaceholder('Select question to edit')
                    .addOptions(
                        QUESTIONS.map((q, i) => ({
                            label: q.replace(':', ''),
                            value: i.toString()
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(menu);

                return interaction.reply({
                    content: "Select a question to edit:",
                    components: [row],
                    ephemeral: true
                });
            }

            // =========================
            // ✅ CONFIRM
            // =========================
            if (interaction.customId === 'confirm_app') {

                if (!app) {
                    return interaction.reply({
                        content: "No active application.",
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                const embed = new EmbedBuilder()
                    .setTitle(app.type)
                    .setColor(0x00AE86)
                    .addFields({ name: "User", value: `<@${userId}>` });

                QUESTIONS.forEach((q, i) => {
                    embed.addFields({
                        name: q,
                        value: app.answers[i] || "N/A"
                    });
                });

                const proof = app.answers[4];
                if (proof && proof !== "Skipped") {
                    embed.setImage(proof);
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`accept_${userId}`).setLabel('Accept').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`deny_${userId}`).setLabel('Deny').setStyle(ButtonStyle.Danger)
                );

                const channel = await client.channels.fetch(config.staffChannelId);

                await channel.send({
                    embeds: [embed],
                    components: [row]
                });

                client.cooldowns.set(userId, Date.now());
                client.activeApps.delete(userId);

                if (app.reviewMessage) {
                    try {
                        await app.reviewMessage.edit({
                            embeds: [app.reviewMessage.embeds[0]],
                            components: []
                        });
                    } catch (err) {
                        console.error("Failed to edit review message:", err);
                    }
                }

                return interaction.editReply({
                    content: "Application submitted."
                });
            }

            // =========================
            // 👮 STAFF ACCEPT / DENY
            // =========================
            if (interaction.customId.startsWith('accept_') || interaction.customId.startsWith('deny_')) {

                if (!interaction.member.roles.cache.has(config.staffRoleId)) {
                    return interaction.reply({
                        content: "Not allowed.",
                        ephemeral: true
                    });
                }

                const targetId = interaction.customId.split('_')[1];
                const accepted = interaction.customId.startsWith('accept_');

                const messageId = interaction.message.id;

                return interaction.showModal({
                    title: 'Application Decision',
                    customId: `decision_${targetId}_${accepted ? 'accept' : 'deny'}_${messageId}`,
                    components: [
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('reason')
                                .setLabel('Reason (optional)')
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(false)
                                .setPlaceholder('Enter a reason for your decision...')
                        )
                    ]
                });
            }

            // =========================
            // EDIT ROLES
            // =========================
            if (interaction.customId === 'edit_roles') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({
                        content: 'Only administrators can edit roles.',
                        ephemeral: true
                    });
                }
                const message = interaction.message;
                const currentDesc = message.embeds[0].description;
                const messageId = message.id;
                return interaction.showModal({
                    title: 'Edit Roles',
                    customId: `edit_roles_modal_${messageId}`,
                    components: [
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('roles_desc')
                                .setLabel('Role Descriptions')
                                .setStyle(TextInputStyle.Paragraph)
                                .setValue(currentDesc)
                                .setRequired(true)
                        )
                    ]
                });
            }
        }
    }
};