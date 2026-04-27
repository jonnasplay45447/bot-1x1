const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const { createTranscript } = require('discord-html-transcripts');
const fs = require('fs');

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== CONFIG =====
const cargoAdmin = "943302582816890973";
const cargoAdminX1 = "1493367738360660198";

const categoriaTicket = "1492239705843171559";
const canalLogs = "943302717865070632";

const servidorID = "943292592504840273";
const canalRegrasX1 = "1492587300922589340";

// ===== VALORES =====
const tabelaValores = {
  1: "1,50",
  3: "4,00",
  5: "6,00",
  10: "12,00"
};

// ===== MEMÓRIA =====
let filasX1 = {};
let tickets = {};
let paineisX1 = {};
let criandoTicket = false;

// ===== CARREGAR =====
if (fs.existsSync('dados.json')) {
  const data = JSON.parse(fs.readFileSync('dados.json'));
  filasX1 = data.filasX1 || {};
  tickets = data.tickets || {};
}

// ===== SALVAR =====
function salvar() {
  fs.writeFileSync('dados.json',
    JSON.stringify({ filasX1, tickets }, null, 2)
  );
}

// ===== READY =====
client.on('clientReady', () => {
  console.log('🔥 BOT X1 ONLINE');
});

// ===== COMANDO =====
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.member.roles.cache.has(cargoAdminX1)) return;

  if (msg.content.startsWith('!x1')) {

    const valor = msg.content.split(' ')[1];
    filasX1[valor] = [];
    salvar();

    const embed = new EmbedBuilder()
      .setTitle(`🔥1x1 | R$${valor}`)
      .setDescription("Ninguém na fila.")
      .setColor("#1989e2");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`entrar_x1_${valor}`).setLabel('Entrar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`sair_x1_${valor}`).setLabel('Sair').setStyle(ButtonStyle.Danger)
    );

    paineisX1[valor] = await msg.channel.send({ embeds:[embed], components:[row] });
  }
});

// ===== INTERAÇÕES =====
client.on('interactionCreate', async (i) => {
  if (!i.isButton()) return;

  try {
    await i.reply({ content: '✔️', flags: MessageFlags.Ephemeral });

    // ===== ENTRAR =====
    if (i.customId.startsWith('entrar_x1_')) {

      const valor = i.customId.split('_')[2];
      let fila = filasX1[valor] || [];

      if (!fila.includes(i.user.id)) {
        fila.push(i.user.id);
        filasX1[valor] = fila;
        salvar();
      }

      await atualizarPainelX1(valor);

      if (fila.length === 2 && !criandoTicket) {

        criandoTicket = true;

        const [id1, id2] = fila;

        const canal = await i.guild.channels.create({
          name: `x1-${valor}`,
          type: ChannelType.GuildText,
          parent: categoriaTicket,
          permissionOverwrites: [
            { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: id1, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: id2, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: cargoAdmin, allow: [PermissionFlagsBits.ViewChannel] },
            { id: cargoAdminX1, allow: [PermissionFlagsBits.ViewChannel] }
          ]
        });

        tickets[canal.id] = {
          jogadores:[id1,id2],
          valor,
          confirmados:[]
        };

        salvar();

        await canal.send(`<@${id1}> <@${id2}>`);

        const embed = new EmbedBuilder()
          .setTitle(`🔥1x1 | R$${valor}`)
          .setDescription("📜 Confirme para iniciar")
          .addFields({ name:"Confirmados:", value:"Nenhum" })
          .setColor("#1989e2");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('confirmar_x1').setLabel('Confirmar').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('cancelar_x1').setLabel('Cancelar').setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setLabel('Regras')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${servidorID}/${canalRegrasX1}`)
        );

        await canal.send({ embeds:[embed], components:[row] });

        filasX1[valor] = [];
        salvar();
        await atualizarPainelX1(valor);

        criandoTicket = false;
      }
    }

    // ===== SAIR =====
    if (i.customId.startsWith('sair_x1_')) {

      const valor = i.customId.split('_')[2];
      let fila = filasX1[valor] || [];

      fila = fila.filter(id => id !== i.user.id);
      filasX1[valor] = fila;
      salvar();

      await atualizarPainelX1(valor);
    }

    // ===== CONFIRMAR =====
    if (i.customId === 'confirmar_x1') {

      const dados = tickets[i.channel.id];
      if (!dados) return;

      if (!dados.confirmados.includes(i.user.id)) {
        dados.confirmados.push(i.user.id);
        salvar();
      }

      const lista = dados.confirmados.map(id=>`<@${id}>`).join('\n') || "Nenhum";

      await i.message.edit({
        embeds:[new EmbedBuilder()
          .setTitle(`🔥1x1 | R$${dados.valor}`)
          .setDescription("📜 Confirme para iniciar")
          .addFields({ name:"Confirmados:", value:lista })
          .setColor("#1989e2")
        ]
      });

      if (dados.confirmados.length === 2) {

        await i.message.edit({ components: [] });

        const embedFinal = new EmbedBuilder()
          .setTitle("⚔️ X1 INICIADO")
          .setDescription(
            `👥 ${dados.jogadores.map(id=>`<@${id}>`).join(' 🆚 ')}\n\n` +
            `💸 Valor: R$${tabelaValores[dados.valor]}\n\n` +
            `📩 Aguarde um admin`
          )
          .setColor("Green");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('fechar_ticket')
            .setLabel('Fechar Ticket')
            .setStyle(ButtonStyle.Danger)
        );

        await i.channel.send({
          content: `<@&${cargoAdminX1}>`,
          embeds: [embedFinal],
          components: [row]
        });
      }
    }

    // ===== CANCELAR =====
    if (i.customId === 'cancelar_x1') {

      const dados = tickets[i.channel.id];
      if (!dados) return;

      const isJogador = dados.jogadores.includes(i.user.id);
      const isAdmin = i.member.roles.cache.has(cargoAdmin);
      const isAdminX1 = i.member.roles.cache.has(cargoAdminX1);

      if (!isJogador && !isAdmin && !isAdminX1) {
        return i.followUp({
          content: 'Sem permissão',
          flags: MessageFlags.Ephemeral
        });
      }

      const logChannel = await client.channels.fetch(canalLogs);

      const attachment = await createTranscript(i.channel, {
        returnType: 'attachment',
        filename: `cancelado.html`,
        saveImages: true,
        poweredBy: false,
        hydrate: true
      });

      const embed = new EmbedBuilder()
        .setTitle("🚫 X1 CANCELADO")
        .addFields(
          { name:"👤 Cancelado por", value:`<@${i.user.id}>` },
          { name:"👥 Jogadores", value:dados.jogadores.map(id=>`<@${id}>`).join(' vs ') },
          { name:"💸 Valor", value:`R$${dados.valor}` },
          { name:"📅 Data", value:`<t:${Math.floor(Date.now()/1000)}:F>` }
        )
        .setColor("Red")
        .setTimestamp();

      await logChannel.send({ embeds:[embed], files:[attachment] });

      delete tickets[i.channel.id];
      salvar();

      await i.channel.delete().catch(()=>{});
    }

    // ===== FECHAR =====
    if (i.customId === 'fechar_ticket') {

      const dados = tickets[i.channel.id];
      if (!dados) return;

      const isAdmin = i.member.roles.cache.has(cargoAdmin);
      const isAdminX1 = i.member.roles.cache.has(cargoAdminX1);

      if (!isAdmin && !isAdminX1) {
        return i.followUp({
          content: '❌ Apenas admins podem fechar.',
          flags: MessageFlags.Ephemeral
        });
      }

      const logChannel = await client.channels.fetch(canalLogs);

      const attachment = await createTranscript(i.channel, {
        returnType: 'attachment',
        filename: `finalizado.html`,
        saveImages: true,
        poweredBy: false,
        hydrate: true
      });

      const embed = new EmbedBuilder()
        .setTitle("📁 X1 FINALIZADO")
        .addFields(
          { name:"👤 Finalizado por", value:`<@${i.user.id}>` },
          { name:"👥 Jogadores", value:dados.jogadores.map(id=>`<@${id}>`).join(' vs ') },
          { name:"💸 Valor", value:`R$${dados.valor}` },
          { name:"📅 Data", value:`<t:${Math.floor(Date.now()/1000)}:F>` }
        )
        .setColor("Green")
        .setTimestamp();

      await logChannel.send({ embeds:[embed], files:[attachment] });

      delete tickets[i.channel.id];
      salvar();

      await i.channel.delete().catch(()=>{});
    }

  } catch (err) {
    console.log("ERRO:", err);
  }
});

// ===== ATUALIZAR PAINEL =====
async function atualizarPainelX1(valor) {
  if (!paineisX1[valor]) return;

  const fila = filasX1[valor] || [];
  const lista = fila.length ? fila.map(id=>`<@${id}>`).join('\n') : "Ninguém na fila.";

  await paineisX1[valor].edit({
    embeds:[new EmbedBuilder()
      .setTitle(`🔥1x1 | R$${valor}`)
      .setDescription(`👥 **Fila:**\n${lista}`)
      .setColor("#1989e2")
    ]
  }).catch(()=>{});
}

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

client.login(process.env.TOKEN);