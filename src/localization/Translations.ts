import { Collection, Locale } from "discord.js";
import YAML from "yaml";
import fs from "fs";
import path from "path";
import { BotClient } from "../client/BotClient";
import signale from "signale";
import chalk from "chalk";

export class LocalizedTranslations {
    private readonly locale: Locale;
    private readonly translations: Translations;

    public constructor(locale: Locale, translations: Translations) {
        this.locale = locale;
        this.translations = translations;
    }

    public translate(
        key: string,
        placeholders: { [key: string]: any } = {}
    ): string {
        return this.translations.getLocaleString(
            this.locale,
            key,
            placeholders
        );
    }

    public t(key: string, placeholders: { [key: string]: any } = {}): string {
        return this.translate(key, placeholders);
    }

    public getLocale(): Locale {
        return this.locale;
    }

    public raw(key: string): string | undefined {
        return this.translations.getRawLocaleString(this.locale, key);
    }
}

export class Translations {
    private translations: Collection<Locale, any> = new Collection();
    private readonly client: BotClient;
    private fallbackLocale: Locale = Locale.EnglishUS;

    public constructor(client: BotClient) {
        this.client = client;
    }

    public setFallbackLocale(locale: Locale): void {
        this.fallbackLocale = locale;
    }

    public getFallbackLocale(): Locale {
        return this.fallbackLocale;
    }

    public countTranslations(): number {
        return this.translations.size;
    }

    public getAvailableLocales(): Locale[] {
        const locales: Locale[] = [];
        for (const locale in this.translations.keys()) {
            locales.push(locale as Locale);
        }
        return locales;
    }

    public getLocalized(locale: Locale): LocalizedTranslations {
        return new LocalizedTranslations(locale, this);
    }

    public getLocaleString(
        locale: Locale,
        key: string,
        placeholders: { [key: string]: any } = {}
    ): string {
        const raw = this.getRawLocaleString(locale, key);

        // Replace placeholders
        let result = raw;
        for (const [k, v] of Object.entries(placeholders)) {
            result = result.replace(new RegExp(`{{${k}}}`, "g"), v);
        }

        return result;
    }

    public getRawLocaleString(locale: Locale, key: string): string {
        const translation = this.translations.get(locale);
        if (!translation) {
            return this.getRawLocaleString(this.fallbackLocale, key);
        }

        const keys = key.split(".");
        let current = translation;
        for (const k of keys) {
            current = current[k];
            if (!current) {
                signale.error(
                    `Translation key ${chalk.yellow(
                        key
                    )} is not present in ${chalk.yellow(
                        locale
                    )}! Using fallback...`
                );

                if (locale === this.fallbackLocale) {
                    throw new Error(
                        `Translation key ${chalk.red(
                            key
                        )} is not present in ${chalk.red(locale)} (fallback)!`
                    );
                }

                return this.getRawLocaleString(this.fallbackLocale, key);
            }
        }

        return current;
    }

    public async load(locale: Locale): Promise<void> {
        const file = fs.readFileSync(
            path.join(
                this.client.config.baseDir,
                this.client.config.localesDir || "../locales",
                `${locale}.yml`
            ),
            "utf-8"
        );

        const translation = YAML.parse(file);
        this.translations.set(locale, translation);
        signale.info(`Loaded ${chalk.yellow(locale)} translation`);
    }

    public loadAll(): void {
        const files = fs.readdirSync(
            path.join(
                this.client.config.baseDir,
                this.client.config.localesDir || "../locales"
            )
        );

        for (const file of files) {
            const locale = file.split(".")[0];
            if (!locale || !Object.values(Locale).includes(locale as Locale)) {
                signale.error(`Locale ${chalk.yellow(locale)} is invalid!`);
                continue;
            }
            this.load(locale as Locale);
        }
    }
}
