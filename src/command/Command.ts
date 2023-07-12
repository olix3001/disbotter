import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { LocalizedTranslations } from "../localization/Translations.js";
import { BotClient } from "../client/BotClient.js";

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
    ): Promise<void>;

    public async _handleInteraction(
        interaction: CommandInteraction
    ): Promise<void> {
        const t = this.getTranslator(interaction);
        await this.handle(t, interaction);
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
