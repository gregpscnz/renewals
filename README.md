# Renewal portal (client form)

A static web page. Clients open one link, check their prefilled details, answer the questions, and press **Send**. You get an email with their answers attached and a copy is saved in a Google Sheet.

## 1. Publish the page on GitHub Pages

1. Create a new GitHub repository (private repos need a paid plan for Pages, so a public repo is simplest. The page contains no client data).
2. Upload everything in this folder (`index.html`, `app.js`, `model.js`, `help.js`, the `data` folder and `.nojekyll`) to the repository root.
3. Repository **Settings > Pages**: Source = "Deploy from a branch", Branch = `main`, folder `/ (root)`. Save.
4. After a minute the page is live at `https://YOUR-NAME.github.io/REPO-NAME/`.

## 2. Set up the receiver (Google Apps Script)

1. In Google Sheets create a new blank spreadsheet called "Renewal responses". Keep it private.
2. **Extensions > Apps Script**. Delete the sample code, paste in the contents of `apps-script/Code.gs`, and save.
3. **Deploy > New deployment > Web app**. Execute as **Me**, Who has access **Anyone**. Authorise when asked (Google shows an "unverified app" warning for your own scripts: Advanced > Go to project).
4. Copy the **Web app URL** (it ends in `/exec`).
5. Open `help.js` in your GitHub repository and set `var SEND_URL='PASTE-THE-URL-HERE';`. Commit.

Test it yourself first: open the page, fill in a dummy client, press Send. You should get the email within a minute.

## 3. Prefilled links from the Renewals Register

In the Register, change the portal address (`PORTAL_URL`) to your GitHub Pages address. From then on **Send renewal information to client** creates a single link that opens the form with the client's details already filled in. Nothing to paste.

The prefill sits in the part of the link after `#`, which browsers never send to GitHub or any server.

## 4. Importing a response

Open the email, save the attachment (`renewal-client-name.txt`), then in the Register choose **Import client response > Choose file**.

## Privacy

- Client answers pass through your Google account (Apps Script, Gmail and the Sheet). Keep the Sheet private and delete old rows when you no longer need them.
- The page keeps a copy of answers in the client's own browser while they work. Clients can clear it from the last screen.
- Gmail sends up to 100 emails a day from a personal account.
- Consider adding a short privacy statement link under the Send button (the portal already carries a general notice and disclosure statement).

## Changing your details

`help.js` holds your name, FSP number, phone and email. Edit them there. Leave `firm` empty for no business name.
