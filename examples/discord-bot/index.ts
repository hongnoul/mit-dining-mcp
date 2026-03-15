import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { fetchCafeMenu, fetchAllHallMenus } from "../../src/scraper.js";
import { HALLS, DIET_FILTERS } from "../../src/constants.js";
import type { CafeMenu, MenuItem } from "../../src/types.js";

const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;

if (!TOKEN || !CLIENT_ID) {
  console.error("Set DISCORD_TOKEN and DISCORD_CLIENT_ID environment variables");
  process.exit(1);
}

// --- Slash command definitions ---

const hallChoices = Object.keys(HALLS).map((h) => ({ name: h, value: h }));
const dietChoices = DIET_FILTERS.map((d) => ({ name: d, value: d }));

const commands = [
  new SlashCommandBuilder()
    .setName("dinner")
    .setDescription("What's for dinner tonight?")
    .addStringOption((o) =>
      o.setName("hall").setDescription("Dining hall").addChoices(...hallChoices)
    ),

  new SlashCommandBuilder()
    .setName("menu")
    .setDescription("Get a dining hall menu")
    .addStringOption((o) =>
      o.setName("hall").setDescription("Dining hall").setRequired(true).addChoices(...hallChoices)
    )
    .addStringOption((o) =>
      o.setName("date").setDescription("Date (YYYY-MM-DD)")
    )
    .addStringOption((o) =>
      o.setName("meal").setDescription("Meal period").addChoices(
        { name: "breakfast", value: "breakfast" },
        { name: "lunch", value: "lunch" },
        { name: "brunch", value: "brunch" },
        { name: "dinner", value: "dinner" },
      )
    ),

  new SlashCommandBuilder()
    .setName("diet")
    .setDescription("Find options by dietary preference")
    .addStringOption((o) =>
      o.setName("diet").setDescription("Dietary filter").setRequired(true).addChoices(...dietChoices)
    )
    .addStringOption((o) =>
      o.setName("hall").setDescription("Dining hall").addChoices(...hallChoices)
    ),
];

// --- Helpers ---

function formatMenuEmbed(menu: CafeMenu, mealFilter?: string): EmbedBuilder[] {
  const embeds: EmbedBuilder[] = [];
  const dayparts = mealFilter
    ? menu.dayparts.filter((dp) => dp.label.toLowerCase() === mealFilter)
    : menu.dayparts;

  for (const dp of dayparts) {
    const embed = new EmbedBuilder()
      .setTitle(`${menu.hallName} — ${dp.label}`)
      .setDescription(`${dp.startTime} – ${dp.endTime} · ${menu.date}`)
      .setColor(0x750014); // MIT crimson

    const stations = dp.stations.slice(0, 25);
    for (const station of stations) {
      const items = station.items
        .slice(0, 10)
        .map((i) => {
          const tags = i.diets.map((d) => d[0]).join("");
          return `${i.label}${tags ? ` \`${tags}\`` : ""}`;
        })
        .join("\n");
      const extra = station.items.length > 10 ? `\n*+${station.items.length - 10} more*` : "";
      embed.addFields({ name: station.name, value: (items + extra) || "—", inline: true });
    }

    embeds.push(embed);
  }

  if (embeds.length === 0) {
    embeds.push(
      new EmbedBuilder()
        .setTitle(menu.hallName)
        .setDescription(mealFilter ? `No ${mealFilter} menu available today.` : "No menus available today.")
        .setColor(0x750014)
    );
  }

  return embeds;
}

function filterByDiet(menu: CafeMenu, diet: string): MenuItem[] {
  const items: MenuItem[] = [];
  for (const dp of menu.dayparts) {
    for (const station of dp.stations) {
      for (const item of station.items) {
        if (diet === "gluten-free") {
          if (!item.allergens.includes("Wheat/Gluten")) items.push(item);
        } else {
          const label = diet.charAt(0).toUpperCase() + diet.slice(1);
          if (item.diets.includes(label)) items.push(item);
        }
      }
    }
  }
  return items;
}

// --- Command handlers ---

async function handleDinner(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const hall = interaction.options.getString("hall");

  if (hall) {
    const menu = await fetchCafeMenu(hall);
    const embeds = formatMenuEmbed(menu, "dinner");
    await interaction.editReply({ embeds: embeds.slice(0, 10) });
  } else {
    const menus = await fetchAllHallMenus();
    const embed = new EmbedBuilder()
      .setTitle("Tonight's Dinner Across MIT")
      .setColor(0x750014);

    for (const menu of menus) {
      const dinner = menu.dayparts.find((dp) => dp.label.toLowerCase() === "dinner");
      if (!dinner) continue;
      const highlights = dinner.stations
        .filter((s) => !["condiments", "beverages", "toppings", "ice cream", "desserts"].includes(s.name))
        .flatMap((s) => s.items.slice(0, 2))
        .slice(0, 5)
        .map((i) => i.label)
        .join(", ");
      embed.addFields({ name: menu.hallName, value: highlights || "—", inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleMenu(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const hall = interaction.options.getString("hall", true);
  const date = interaction.options.getString("date") ?? undefined;
  const meal = interaction.options.getString("meal") ?? undefined;

  const menu = await fetchCafeMenu(hall, date);
  const embeds = formatMenuEmbed(menu, meal);
  await interaction.editReply({ embeds: embeds.slice(0, 10) });
}

async function handleDiet(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const diet = interaction.options.getString("diet", true);
  const hall = interaction.options.getString("hall");

  let menus: CafeMenu[];
  if (hall) {
    menus = [await fetchCafeMenu(hall)];
  } else {
    menus = await fetchAllHallMenus();
  }

  const embed = new EmbedBuilder()
    .setTitle(`${diet.charAt(0).toUpperCase() + diet.slice(1)} Options Today`)
    .setColor(0x750014);

  for (const menu of menus) {
    const items = filterByDiet(menu, diet);
    if (items.length === 0) continue;
    const unique = [...new Set(items.map((i) => i.label))];
    const display = unique.slice(0, 15).join(", ");
    const extra = unique.length > 15 ? ` +${unique.length - 15} more` : "";
    embed.addFields({ name: menu.hallName, value: display + extra, inline: false });
  }

  if (!embed.data.fields?.length) {
    embed.setDescription(`No ${diet} options found today.`);
  }

  await interaction.editReply({ embeds: [embed] });
}

// --- Bot setup ---

const rest = new REST().setToken(TOKEN);
console.log("Registering slash commands...");
await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands.map((c) => c.toJSON()) });
console.log("Commands registered.");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case "dinner": await handleDinner(interaction); break;
      case "menu": await handleMenu(interaction); break;
      case "diet": await handleDiet(interaction); break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Something went wrong";
    if (interaction.deferred) {
      await interaction.editReply({ content: msg });
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  }
});

client.once("ready", (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.login(TOKEN);
