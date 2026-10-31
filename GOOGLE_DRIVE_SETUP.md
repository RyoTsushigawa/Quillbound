# Google Drive for Quillbound

Quillbound can browse and download PDFs, map images, ZIP packages and campaign JSON from Google Drive. Imported books feed the ordinary adventure reader and **DM desk → Link adventures**. This is an on-demand local copy, not automatic two-way cloud sync.

## One-time setup for your own Google account

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project. Enable **Google Drive API** in APIs & Services → Library.
2. In **Google Auth Platform**, configure Branding and Audience for your app. For a personal test, leave publishing status **Testing** and add your own Google account under **Test users**. Include the scope `https://www.googleapis.com/auth/drive.readonly` in Data Access. Google may require verification before making this restricted-scope app generally available; personal testing does not mean it is verified for everybody.
3. In Clients, create an OAuth client of type **Web application**. Authorized JavaScript origins: `https://ryotsushigawa.github.io`. Use the origin, without `/Quillbound/`. For local development add the exact localhost origin and port you use, e.g. `http://localhost:5183`.
4. Copy the public **Client ID**, ending in `.apps.googleusercontent.com`. Never put a client secret into Quillbound. No API key or server secret is needed by this implementation.
5. Open **Google Drive…** under Import adventure or **Google Drive assets & adventures…** under Link adventures. Paste the client ID, click Connect and complete Google's account selection and consent yourself.

## At the table

Browse folders or search filenames. Select the PDFs/maps/ZIPs you want, then Import selected files. The app does not download entire folders automatically. It supports pagination and nested ZIP contents (up to three nested archives, 4000 entries and 300 MB total expanded content).

In Import adventure, read the imported books individually or choose **Read all adventures for a campaign**. Open **Link adventures** to select their profiles, order adventures and inspect shared plot threads. Google Drive is the source; the same local reader and planner are used.

A campaign JSON can be restored as a new campaign. For a complete campaign ZIP, use **Restore campaign / ZIP…** in Campaigns (or Restore campaign ZIP under Import adventure). Preview and choose which backup to restore. Existing campaigns remain saved.

## Storage and disconnection

Google tokens are held only in memory, not in campaign backups, local storage or player messages. They expire; reconnect as needed. The public client ID stays in this browser. Disconnect clears the token; imported adventure profiles and saved player maps remain. To revoke Google's grant as well, use your [Google account connections](https://myaccount.google.com/connections).

Library source files are held while the page is open. Re-import them from Drive after reload when you want to read the original books again. Reviewed scene-map pixels and adventure profiles persist locally. Imported content is not re-published to GitHub or sent to an AI service. Read-only authorization allows reading Drive files, not modifying them; the app downloads only files you select. Native Google Docs, shortcuts and Shared Drive navigation are not supported in this version; use exported PDFs or ZIPs in a folder you can browse/search.

## Troubleshooting

- **origin_mismatch**: check the exact origin above in your Web application client.
- **access_denied**: add your account as a test user; check the consent screen and scope.
- **API disabled / forbidden**: enable Drive API in the same Cloud project and check the owner's download permission.
- **Session expired**: reconnect. Files already imported remain available while the page is open.
- **No campaign in ZIP**: use ordinary Choose files for a PDF/map archive, rather than campaign restore.

Implementation references: [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Drive files list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list), [Drive downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads).
