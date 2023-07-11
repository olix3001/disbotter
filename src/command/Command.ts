import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export abstract class Command {
    public abstract readonly builder: SlashCommandBuilder;

    public abstract handle(interaction: CommandInteraction): void;
}
