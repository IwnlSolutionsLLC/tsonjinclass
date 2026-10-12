# 12-2 Android display app

The APK opens `https://12-2.lol/?display=android` using Chrome's Trusted Web Activity. The website and its existing server database stay on your hosting. Updating the website updates what the app displays; the app does not contain a copy of the database, music, photographs, or API keys.

## Website upload

Upload the contents of `12-2-android-website-update.zip` beside the existing `index.php`, preserving the included paths:

- `index.php`
- `assets/js/android-display.js`
- `.well-known/assetlinks.json`
- `ANDROID-DISPLAY-SETUP.md` (optional reference document)

Do not replace the hosted `database/`, `ai-settings.php`, or `12-2-ai-server-settings.php`. None of them is included in this update.

Your file manager may hide `.well-known`: enable **Show hidden files**. Check that `https://12-2.lol/.well-known/assetlinks.json` is publicly available as JSON, without a login, redirect, or HTML error page. This file contains the public APK signing certificate fingerprint, not a password. If your hosting already has an `assetlinks.json` for another app, add this app's statement to the existing JSON array rather than removing the other entries.

This verification lets Chrome display the website without its address bar. Until verification succeeds, Chrome can show a normal browser toolbar. Close and reopen the app after uploading the file; verification can be cached.

## Install on the MENPAD display

1. Keep Google Chrome installed and updated on the display. The app uses Chrome to retain existing website logins, permissions, and browser playback support.
2. Copy `12-2-display.apk` to the display using a USB drive or another file-transfer method. Open it in the display's file manager. Android may ask you to allow installation from that file manager.
3. Open **12-2 Display**. Its setup screen has an action to open the class website and an action to configure automatic startup.
4. Use the automatic-startup action and choose **12-2 Display** as the default **Home app**. Android 10 and newer can show a Home-app chooser; older versions use the Home settings screen. You can also use **Settings → Apps → Default apps → Home app**. MENPAD may use different labels.
5. Restart the display to confirm it opens the website after Android finishes booting/unlocking and Wi-Fi reconnects. The firmware must permit choosing a different default Home app.

Selecting Home is a one-time Android setting. Installing an APK alone cannot reliably force automatic foreground launch on current Android. This app uses Android's normal Home/launcher behavior; it does not request device administrator access or require a factory reset. The APK supports Android 7.0 and newer; the browser's own feature support also depends on the Chrome and Android versions on the device.

If the display does not offer a Home-app setting, a firmware-provided **Startup app / Auto start** option or the school's device-management configuration is needed. The generic MENPAD firmware label `YZ.982.429.20260723.0937.X4.P` does not identify the Android major version.

## Daily use and returning to setup

The website remains online at its usual address. Tabs, playlists, albums, folders, AI chat, and screen sharing continue using the same server. Camera/microphone permissions are still granted in Chrome; existing visible Live indicators and Stop controls remain available. Opening the app does not bypass permissions or change those controls.

Android's Back button returns through the website's navigation history before reaching the app's setup screen. From setup you can reopen the site or change the default Home app back to the display's original launcher. The app does not lock the device or disable Android settings.

The Android display page requests a Screen Wake Lock while visible and releases it when hidden. Chrome or Android power policies can refuse that request; configure the display's sleep/power settings if it still turns off. Waking from standby is different from restarting Android: an already-open app normally resumes, while automatic launch after a full reboot uses the Home setting.

Initial network failures may show Chrome's network-error page. Reconnect Wi-Fi and reload or return to the app's setup screen and open the class website again. Music may still require a tap to start playback, and network or display performance still limits live screen sharing.

## Source and future APK updates

Android source: `/Users/anarkasss/Desktop/12-2-android-display/`.

The private APK signing key and its local configuration are saved separately at `/Users/anarkasss/.codex/android-display-signing/`. Back up that private directory securely; do not upload it to your website. Future APK updates must use the same signing key. The public association file must match the APK's package name and signing certificate.

Official references: [Trusted Web Activities](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities), [Home-app role](https://developer.android.com/reference/android/app/role/RoleManager), [Android background launch restrictions](https://developer.android.com/guide/components/activities/secure-bal), and [website association for fullscreen Chrome](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start).
