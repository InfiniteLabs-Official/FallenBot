const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const config = require('../config.json');

const QUESTIONS = [
    "**Name:**",
    "**Age:**",
    "**Timezone:**",
    "**Experience:**",
    "**Proof of Experience:** (Upload image OR send link OR type `skip`)",
    "**Why do you want to join?**",
    "**How active are you?**"
];

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {

        // Handle ?cancel command in guild
        if (message.content.toLowerCase() === '?cancel' && message.guild && message.guild.id === config.guildId) {
            const app = client.activeApps.get(message.author.id);
            if (!app) {
                return message.reply("You don't have an active application.");
            }
            client.activeApps.delete(message.author.id);
            return message.reply("Application cancelled.");
        }

        // Handle ?endcooldown command
        if (message.content.toLowerCase().startsWith('?endcooldown') && message.guild && message.guild.id === config.guildId) {
            if (!message.member.roles.cache.has(config.staffRoleId)) {
                return message.reply("You don't have permission to use this command.");
            }
            const mentioned = message.mentions.users.first();
            if (!mentioned) {
                return message.reply("Mention a user to end their cooldown. Usage: `?endcooldown @user`");
            }
            client.cooldowns.delete(mentioned.id);
            return message.reply(`Cooldown ended for ${mentioned}.`);
        }

        if (message.author.bot) return;
        if (!message.channel.isDMBased()) return;

        const app = client.activeApps.get(message.author.id);
        if (!app) return;

        let answer;

        // 🖼 IMAGE DETECTION
        if (app.step === 4) {

            if (message.attachments.size > 0) {
                answer = message.attachments.first().url;
            } else if (message.content.toLowerCase() === 'skip') {
                answer = "Skipped";
            } else if (message.content.startsWith('http')) {
                answer = message.content;
            } else {
                return message.channel.send(
                    "❌ Please upload an image, send a link, or type `skip`."
                );
            }

        } else {
            answer = message.content;
        }

        if (app.editing) {
            app.answers[app.editIndex] = answer;
            app.editing = false;
        } else {
            app.answers.push(answer);
            app.step++;
            if (app.step < QUESTIONS.length) {
                return message.channel.send(`**${QUESTIONS[app.step]}**`);
            }
        }

        // 📋 FINAL REVIEW
        const embed = new EmbedBuilder()
            .setTitle(`📋 ${app.type}`)
            .setDescription("Review your application before submitting.")
            .setColor(0x5865F2);

        QUESTIONS.forEach((q, i) => {
            embed.addFields({
                name: q,
                value: app.answers[i] || "N/A"
            });
        });

        // Show image preview if exists
        const proof = app.answers[4];
        if (proof && proof !== "Skipped") {
            embed.setImage(proof);
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_app').setLabel('Confirm').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('edit_app').setLabel('Edit').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('retry_app').setLabel('Retry').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('cancel_app').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const sentMessage = await message.channel.send({
            embeds: [embed],
            components: [row]
        });

        app.reviewMessage = sentMessage;
    }
};