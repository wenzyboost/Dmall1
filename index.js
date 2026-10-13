const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
  new SlashCommandBuilder()
    .setName('dmall')
    .setDescription('Envoie un DM à tous les membres du serveur')
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Le message à envoyer')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON()
];

client.once('ready', async () => {
  console.log(`[AR] Bot connecté : ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('[AR] Slash command /dmall enregistrée.');
  } catch (err) {
    console.error('[AR] Erreur registration:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'dmall') return;

  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
  }

  const message = interaction.options.getString('message');

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  await guild.members.fetch();

  const members = guild.members.cache.filter(m => !m.user.bot);

  let success = 0;
  let failed = 0;

  const STATUS_UPDATE_INTERVAL = 10;

  for (const [, member] of members) {
    try {
      await member.send(message);
      success++;
    } catch {
      failed++;
    }

    await new Promise(r => setTimeout(r, 1000));

    if ((success + failed) % STATUS_UPDATE_INTERVAL === 0) {
      await interaction.editReply({
        content: `📨 En cours... ✅ ${success} envoyés | ❌ ${failed} échoués | ${members.size - success - failed} restants`
      });
    }
  }

  await interaction.editReply({
    content: `✅ **Terminé !**\n📨 Envoyés : **${success}**\n❌ Échoués : **${failed}**\n👥 Total : **${members.size}**`
  });
});

client.login(TOKEN);
