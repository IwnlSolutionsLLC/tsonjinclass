# Photobooth

Upload the application files beside index.php and keep the existing database/ folder and your private AI settings files. Include the entire assets/js/vendor/mediapipe/ folder, including its wasm/ subfolder, models, and hidden .htaccess file. No new database upload or paid API is needed. The first save creates the small guarded Photobooth index automatically inside your existing database.

Open Photobooth, choose a frame, colour filter, and face accessory, then start the camera. Chrome needs HTTPS on the live site and camera permission. Photobooth requests video only, with a visible camera control. Stop or leave this section to release its camera.

Each of the four countdowns takes a full-resolution still and a separate short motion burst. PNG downloads one strip containing four still photos. GIF downloads a separate strip in which all four photos move together. You can turn motion capture off before taking photos. Selecting four existing pictures creates a still strip only.

After taking photos, enable NO BACKGROUND to replace the surroundings with white. Person segmentation and face landmarks run locally in the browser, including on every motion frame. Models load only when these tools are used; the first use can take a few seconds. Face accessories apply to the captured photos and GIF, while the live camera preview shows the colour filter. Up to four people can receive accessories. Clear lighting and faces looking toward the camera give the best results; hair and fast-moving edges may still have a soft outline. If processing fails, the previous look or Original photos remain available.

Choose from 36 colour recipes, 13 face accessories, and 56 stickers. Browse by category or search stickers, then drag them onto the strip and adjust their size, colour, and rotation. Changes apply to both exports. NO BACKGROUND keeps the backdrop white even with colour filters.

Save using the existing album code (default 4200). PNG and GIF are stored as separate files in the existing class album. The QR download page includes both. Anyone with that QR link can view and download only that pair. Recreate or revoke the link to invalidate the old QR. Links use the live website address when saved on the live website.

The orange Good Vibes frame uses the supplied PDF artwork with its four sample photo layers removed. The original IwnlX logo and decorations remain. Other frames also carry IwnlX branding. QR generation, face processing, background removal, and GIF encoding are all local; photos are sent to your website only when you press Save.

For hosts that do not read .htaccess, serve .wasm as application/wasm and .mjs/.js as text/javascript. Keep the model files accessible as static assets. MediaPipe libraries and official models are bundled and versioned in assets/js/vendor/mediapipe/SOURCE.json.
