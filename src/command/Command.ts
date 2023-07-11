import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { LocalizedTranslations } from "../localization/Translations";
import { BotClient } from "../client/BotClient";

export abstract class Command {
    public abstract readonly builder: SlashCommandBuilder;
    protected readonly client: BotClient;

    public constructor() {
        // @ts-ignore
        this.client = null;
    }

    public setClient(client: BotClient): void {
        // @ts-ignore
        this.client = client;
    }

    public abstract handle(
        t: LocalizedTranslations,
        interaction: CommandInteraction
    ): void;

    public _handleInteraction(interaction: CommandInteraction): void {
        const t = this.getTranslator(interaction);
        this.handle(t, interaction);
    }

    public getTranslator(
        interaction: CommandInteraction
    ): LocalizedTranslations {
        if (!this.client) {
            throw new Error("Command has no client! Did you change it?");
        }
        return this.client.translations.getLocalized(
            interaction.locale || this.client.translations.getFallbackLocale()
        );
    }
}
