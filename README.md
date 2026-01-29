# xlf-sync

> **A deterministic CLI tool to keep Angular XLIFF (1.2 & 2.0) locale files in sync.**

`xlf-sync` solves a common Angular i18n problem:
keeping `messages.xlf` and all locale files (`messages.<locale>.xlf`) **fully synchronized**, without losing translations or accumulating garbage.

It supports:

* XLIFF **1.2** and **2.0**
* safe handling of **new**, **missing**, and **obsolete** keys
* CI-friendly **check mode**
* optional **graveyard** archiving for obsolete translations

---

## ✨ Features

* ✅ Sync locale files with `messages.xlf`
* ✅ Supports **XLIFF 1.2 & 2.0** (mixed projects supported)
* ✅ Adds missing keys with configurable target strategy
* ✅ Detects obsolete keys safely
* ✅ Optional **graveyard mode** (archive obsolete keys)
* ✅ Deterministic output (idempotent runs)
* ✅ CI-friendly `check` command with proper exit codes
* ❌ No translation loss
* ❌ No `[object Object]` / broken XML

---

## 📦 Installation

```bash
npm install -D xlf-sync
```

or run locally via `node`:

```bash
node dist/cli.js
```

---

## 🚀 Basic Usage

### Sync locale files

```bash
xlf-sync sync \
  --source src/locale/messages.xlf \
  --locales "src/locale/messages.*.xlf"
```

This will:

* add missing keys
* keep existing translations
* leave obsolete keys untouched (default behavior)

---

## ⚙️ Sync Options

### `--new-target`

How to initialize new translation targets.

| Mode             | Behavior                 |
| ---------------- | ------------------------ |
| `todo` (default) | `<target>TODO</target>`  |
| `empty`          | `<target></target>`      |
| `source`         | `<target>` = source text |

```bash
xlf-sync sync --new-target todo
```

---

### `--obsolete`

How to handle obsolete keys (keys removed from source).

| Mode             | Behavior                                    |
| ---------------- | ------------------------------------------- |
| `mark` (default) | Keep key, mark target as `state="obsolete"` |
| `delete`         | Remove obsolete keys                        |
| `graveyard`      | Move obsolete keys to separate file         |

```bash
xlf-sync sync --obsolete mark
```

---

## 🪦 Graveyard Mode (Recommended for large projects)

Keeps main locale files clean by **archiving obsolete keys**.

```bash
xlf-sync sync \
  --obsolete graveyard \
  --graveyard-file "src/locale/_obsolete.{locale}.xlf"
```

### Result

* `messages.el.xlf` → only active keys
* `_obsolete.el.xlf` → obsolete translations with `state="obsolete"`

✔ Original translations are preserved
✔ Same XLIFF version as the locale file

---

## 🔍 Check Mode (CI-friendly)

Validate that locale files are in sync **without modifying files**.

```bash
xlf-sync check \
  --source src/locale/messages.xlf \
  --locales "src/locale/messages.*.xlf"
```

### Fails if:

* missing translation targets exist
* obsolete keys exist (optional)
* new keys need to be added (optional)

Exit code:

* `0` → OK
* `1` → Failed (CI-ready)

---

### Strict CI example

```bash
xlf-sync check --fail-on-missing
```

Use in GitHub Actions / GitLab CI.

---

## 📊 Output Example

```
┌────────┬─────┬────────┬────────┬─────┬──────────┬─────────────────┐
│ Locale │ XLF │ Source │ Locale │ Add │ Obsolete │ Missing targets │
├────────┼─────┼────────┼────────┼─────┼──────────┼─────────────────┤
│ de     │ 2.0 │ 2      │ 2      │ 1   │ 0        │ 1               │
│ el     │ 1.2 │ 2      │ 2      │ 1   │ 0        │ 1               │
└────────┴─────┴────────┴────────┴─────┴──────────┴─────────────────┘
```

---

## 🧠 Design Principles

* **Idempotent**: running the tool multiple times produces the same result
* **Non-destructive**: translations are never overwritten or lost
* **Deterministic**: no dependency on XML object serialization quirks
* **Translator-friendly**: obsolete keys remain readable
* **CI-safe**: clear exit codes, no side effects in `check`

---

## 🧪 Supported Formats

| Format         | Supported |
| -------------- | --------- |
| XLIFF 1.2      | ✅         |
| XLIFF 2.0      | ✅         |
| Mixed versions | ✅         |
| Angular i18n   | ✅         |

---

## 📁 Typical Project Structure

```text
src/locale/
  messages.xlf
  messages.el.xlf
  messages.de.xlf
  _obsolete.el.xlf
  _obsolete.de.xlf
```

---

## ❓ Why xlf-sync?

Angular’s built-in `ng extract-i18n`:

* only updates `messages.xlf`
* leaves locale files out of sync
* does not manage obsolete keys

`xlf-sync` fills that gap.

---

## 🛠️ Roadmap (Optional)

* `check --verbose` (list missing keys per locale)
* auto-sorting of units
* comment preservation
* JSON report output

---

## 📄 License

MIT