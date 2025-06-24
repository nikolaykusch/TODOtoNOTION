# TODOtoNOTION 🚀

[![VS Code](https://img.shields.io/badge/VSCode-Extension-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/)  
Sync your code TODO comments with a Notion database. Keep your TODOs in sync between your codebase and Notion, including unique IDs, file paths, and line numbers.

---

## ✨ Features
- **Syncs** `TODO`, `FIXME`, `BUG`, `HACK`, `XXX` comments to Notion
- **Unique persistent ID** for every TODO
- **File path** and **line number** tracking
- **No duplicates** in Notion
- **IDs are injected** into code after sync
- **Two-way sync**: Notion → Code and Code → Notion

---

## 🚀 Step-by-Step Usage Guide

### 1. Prepare Your Notion Database
- Create a new database in Notion (Table view recommended).
- Add the following columns (case-sensitive!):
  - **Name** (type: Title) — main TODO text
  - **Type** (type: Select) — e.g. TODO, FIXME, etc.
  - **Status** (type: Select) — e.g. Not started, In Progress, Done
  - **File Path** (type: Text/Rich text)
  - **Line Number** (type: Text/Rich text or Number)
  - **TODO_ID** (type: Text/Rich text)
- Share the database with your Notion integration (API token) via the "Share" button.

### 2. Get Your Notion Integration Token
- Go to [Notion Integrations](https://www.notion.com/my-integrations) and create a new integration.
- Copy the generated **Internal Integration Token**.

### 3. Install the Extension
- Install from the VS Code Marketplace, or run:
  ```sh
  code --install-extension <your-vsix-file>
  ```

### 4. Configure the Extension
- Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac).
- Run `TODOtoNOTION: Set Notion Credentials`.
- Paste your Notion Integration Token.
- Paste your Notion Database ID (found in the database URL: `https://www.notion.so/yourworkspace/<database_id>?v=...`).

### 5. Add TODOs in Your Code
- Add comments like:
  ```csharp
  //TODO: Refactor this function 
  //FIXME: Handle edge cases 
  //BUG: This crashes on null input 
  ```
- Save the file. The extension will:
  - Assign a unique `[id:...]` to each TODO (if missing)
  - Sync all TODOs to your Notion database
  - Inject IDs into your code automatically

### 6. View and Manage TODOs in Notion
- Open your Notion database. You will see new rows for each TODO, with file path, line number, and status.
- You can update status or text in Notion, and changes will sync back to code (on next sync).

### 7. Sync from Notion to Code (Optional)
- Run `TODOtoNOTION: Sync TODOs from Notion` from the Command Palette to pull changes from Notion into your code.

### 8. Troubleshooting
- **No TODOs in Notion?** Check that your integration has access to the database (Share > Invite integration).
- **Duplicates?** Make sure you do not manually edit `[id:...]` in code.
- **Debug logs:** Open the "TODOtoNOTION" output channel in VS Code for detailed logs.

---

## 📝 Example
```csharp
//TODO: Refactor this function 
```

---

## 🛠️ Notion Database Setup
Your Notion database should have the following columns:
- **Name** (title)
- **Type** (select, e.g. TODO/FIXME)
- **Status** (select, e.g. Not started/In Progress/Done)
- **File Path** (rich_text)
- **Line Number** (rich_text)
- **TODO_ID** (rich_text)



---

## ⚙️ Extension Settings
- `TODOtoNOTION.databaseId`: The Notion database ID for syncing TODOs.

---

## 📦 Scripts
- `npm run webpack` — build the extension
- `vsce package` — package for Marketplace

---

## 🧑‍💻 Contributing
Pull requests and issues are welcome! Please add tests and update documentation as needed.

---

## 📜 License
MIT License. See [LICENSE.txt](./LICENSE.txt).

---

## 🗒️ Release Notes
See [CHANGELOG.md](./CHANGELOG.md) for details.

---

## 👤 Author
Made with ❤️ in Ukraine by **Mykola Kushch**.
