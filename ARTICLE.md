---
title: Stop losing translations in Angular: A better way to sync XLF files 🛡️
published: false
description: How to keep your Angular i18n files in sync without losing developer notes or custom attributes.
tags: angular, i18n, open source, webdev
cover_image: https://raw.githubusercontent.com/atheodosiou/xlf-sync/master/assets/landing_page.png
---

If you have ever worked with Angular Internationalization (i18n), you know the struggle.

You run `ng extract-i18n`, generate a fresh `messages.xlf`, and then... **panic**.

- How do I merge the new keys into my `messages.fr.xlf`?
- What happens to the keys I removed?
- *Wait, did I just overwrite the translator's notes?* 😱

The standard tools are great for extraction, but they often fall short on **synchronization**. That's why I built **`xlf-sync`**.

## The Problem: "Drifting" Translations

As your application grows, your source code changes. New keys are added, old ones are removed. Keeping your locale files (French, German, Spanish, etc.) in sync with the source is a manual, error-prone nightmare.

If you use standard merge tools, you might face **Data Loss**:
1.  **Lost Metadata**: Custom attributes like `approved="yes"` or `priority="high"` often get stripped.
2.  **Vanishing Notes**: `<note>` elements for context are crucial for translators, but easy to lose during a merge.
3.  **Dirty Diffs**: XML files that constantly change order make Pull Requests unreadable.

## The Solution: `xlf-sync`

`xlf-sync` is a CLI tool designed to solve exactly these problems with a focus on **Zero Data Loss**.

### 1. Smart Synchronization
It automatically adds new translation units from your source to your locale files. But unlike other tools, it respects your existing work.
- **Missing keys?** Added automatically.
- **Obsolete keys?** Marked as obsolete (or moved to a graveyard file), so you never delete history accidentally.

### 2. Zero Data Loss (New in v1.3!) 🧠
We now strictly preserve **all** metadata.
- Developer notes (`<context-group>`)? **Kept.**
- Translator comments (`<note>`)? **Kept.**
- Custom attributes (`translate="no"`)? **Kept.**

### 3. Visual Dashboard 📊
Syncing is one thing, but knowing *what* is missing is another.
Running `npx xlf-sync dashboard` generates a standalone HTML report:

![Dashboard](https://raw.githubusercontent.com/atheodosiou/xlf-sync/master/assets/dashboard.png)

You get a full matrix of every key across every language, so you know exactly what to translate next.

## How to use it

You don't even need to install it globally. Just run it in your Angular project:

```bash
# Sync your files
npx xlf-sync sync --source src/locale/messages.xlf --locales "src/locale/messages.*.xlf"
```

Or generate a dashboard report:

```bash
# Generate HTML report
npx xlf-sync dashboard --out report.html
```

## CI/CD Friendly 🤖

Want to fail the build if translations are missing? We got you.

```bash
npx xlf-sync check --fail-on-missing
```

## Give it a try!

It's open source, written in TypeScript, and designed to make Angular i18n less painful.

- **GitHub**: [atheodosiou/xlf-sync](https://github.com/atheodosiou/xlf-sync)
- **npm**: [npmjs.com/package/xlf-sync](https://www.npmjs.com/package/xlf-sync)

Let me know what you think in the comments! 👇
