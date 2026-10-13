const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName('dmall')
    .setDescription('Envoie un DM à tous les membres — utilise {user} pour le pseudo')
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Le message. {user} = remplacé par le pseudo du membre automatiquement')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON()
];

client.once('ready', async () => {
  console.log(`Bot connecté : ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('Slash command /dmall enregistrée.');
  } catch (err) {
    console.error('Erreur registration:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'dmall') return;

  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'Admins only.', ephemeral: true });
  }

  const template = interaction.options.getString('message');
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  await guild.members.fetch();
  const members = guild.members.cache.filter(m => !m.user.bot);

  let success = 0;
  let failed = 0;

  for (const [, member] of members) {
    // Remplace {user} par le vrai pseudo du membre
    const personalised = template.replaceAll('{user}', member.displayName);

    try {
      await member.send(personalised);
      success++;
    } catch {
      failed++;
    }

    await new Promise(r => setTimeout(r, 1200)); // anti rate-limit

    if ((success + failed) % 10 === 0) {
      await interaction.editReply({
        content: `📨 En cours... ✅ ${success} envoyés | ❌ ${failed} échoués | ${members.size - success - failed} restants`
      }).catch(() => {});
    }
  }

  await interaction.editReply({
    content: `✅ **Terminé !**\n📨 Envoyés : **${success}**\n❌ Échoués (DM fermés) : **${failed}**\n👥 Total : **${members.size}**`
  });
});

client.login(TOKEN);
