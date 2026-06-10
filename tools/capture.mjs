// tools/capture.mjs — WaxFrame screenshot capture driver.
//
// Invoked by tools/capture-screenshots.ps1. All capture logic lives here,
// NOT in the app code. The app is unmodified.
//
// How it works (no races, deterministic):
//   1. Spawn a tiny static HTTP server for the repo (file:// blocks ES modules + query strings).
//   2. Launch Chrome headless with --remote-debugging-port for DevTools Protocol.
//   3. Connect to the CDP WebSocket using Node's built-in WebSocket (Node 22+).
//   4. For each (screen, theme):
//        a. If the screen requires configured state (e.g. Builder picker needs
//           activeAIs populated to show options), inject a localStorage seed via
//           Page.addScriptToEvaluateOnNewDocument so the app reads it during
//           its own init — exactly as if a real user had configured their hive.
//        b. Navigate to /index.html, wait for Page.loadEventFired.
//        c. Re-drive (setTheme + goToScreen) + poll a screen-specific readiness
//           expression. Readiness confirms the right screen is visible AND its
//           content is actually rendered (builder cards present, etc).
//        d. Capture, write PNG, remove the seed.
//
// Why this beats the previous race: the script doesn't fire-and-pray. It waits
// for the page to *prove* it has settled on the target state before capturing.
// And it doesn't fake state in app code — it seeds real state externally.

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const [,, REPO_ROOT, BROWSER, OUT_DIR, THEME_ARG, ONLY_FLAG] = process.argv;
if (!REPO_ROOT || !BROWSER || !OUT_DIR || !THEME_ARG) {
  console.error('usage: node capture.mjs <repo-root> <browser-exe> <output-dir> <both|dark|light> [--only-work]');
  process.exit(2);
}
const ONLY_WORK = ONLY_FLAG === '--only-work';
const SERVER_PORT = 8731;
const DEBUG_PORT = 9222;
const THEMES = THEME_ARG === 'both' ? ['dark', 'light'] : [THEME_ARG];

// ============ shot manifest ============
// ============ seed payloads ============
// Hardcoded, sanitized of real API keys (replaced with 'sk-CAPTURE-DEMO') and
// masked-key log fragments (replaced with bullet-bullet-CAPTURE-bullet-bullet).
// SESSION_SEED is the canonical Cookies dry-run state captured at Round 2 Refine.

const HIVE_SEED_BASE = {"activeAIIds": ["chatgpt", "claude", "gemini", "grok", "perplexity", "mistral"], "knownDefaultIds": ["chatgpt", "claude", "gemini", "grok", "perplexity", "mistral"], "hiveMode": "internet", "builder": "gemini", "keys": {"claude": "sk-CAPTURE-DEMO", "chatgpt": "sk-CAPTURE-DEMO", "gemini": "sk-CAPTURE-DEMO", "grok": "sk-CAPTURE-DEMO", "perplexity": "sk-CAPTURE-DEMO", "mistral": "sk-CAPTURE-DEMO"}, "models": {"claude": "claude-opus-4-8", "chatgpt": "gpt-5.5", "copilot": "gpt-4o", "gemini": "gemini-3.5-flash", "grok": "grok-4.1-fast", "perplexity": "sonar-pro", "mistral": "mistral-large-latest", "deepseek": "deepseek-v4-flash", "together": "meta-llama/Llama-3.3-70B-Instruct-Turbo", "cohere": "command-r-plus"}, "customAIs": [], "customAIConfigs": {}};

// Builder shot: same hive, but builder=claude (matches first-time picker state).
const HIVE_SEED_BUILDER = { ...HIVE_SEED_BASE, builder: 'gemini' };
// Work shot: hive as the Cookies session had it (builder=gemini).
const HIVE_SEED_WORK = HIVE_SEED_BASE;

const PROJECT_SEED = {"projectName": "Recipe - Chocolate Chip Cookies", "projectVersion": "v1.0", "goalDocType": "Recipe", "goalAudience": "Myself and friends that enjoy chocolate chip cookies that are easy to make", "goalOutcome": "Create a recipe that is simple and easy but makes great cookies", "goalScope": "", "goalTone": "", "goalNotes": "No extra ingredients like nuts", "exportMask": "", "lengthMode": "none", "lengthLimit": "", "lengthMin": "", "lengthUnit": "characters", "docTab": "scratch", "pastedDocument": "", "referenceDocs": []};

const SESSION_SEED = {"round": 2, "phase": "refine", "history": [{"round": 1, "phase": "draft", "projectName": "Recipe - Chocolate Chip Cookies", "projectVersion": "v1.0", "doc": "Easy Chocolate Chip Cookies\n\nYield\nAbout 24 cookies\n\nPrep time\n15 minutes\n\nBake time\n10 to 12 minutes\n\nTotal time\nAbout 40 minutes\n\nIngredients\n\n1 cup (2 sticks) unsalted butter, softened to room temperature\n3/4 cup granulated sugar\n3/4 cup packed light brown sugar\n2 large eggs\n2 teaspoons vanilla extract\n2 1/4 cups all-purpose flour\n1 teaspoon baking soda\n1 teaspoon salt\n2 cups semisweet chocolate chips\n\nEquipment\n\nTwo baking sheets\nParchment paper or nonstick baking mats\nLarge mixing bowl\nMedium mixing bowl\nElectric mixer or sturdy wooden spoon\nMeasuring cups and spoons\nCooling rack\n\nInstructions\n\n1. Preheat your oven to 375 degrees Fahrenheit. Line your baking sheets with parchment paper or nonstick baking mats.\n\n2. In the large mixing bowl, beat the softened butter, granulated sugar, and brown sugar together until the mixture is light and creamy, about 2 to 3 minutes.\n\n3. Add the eggs one at a time, mixing well after each. Stir in the vanilla extract until fully combined.\n\n4. In the medium bowl, stir together the flour, baking soda, and salt.\n\n5. Gradually add the dry ingredients to the wet ingredients, mixing just until no streaks of flour remain. Do not overmix.\n\n6. Fold in the chocolate chips until they are evenly distributed throughout the dough.\n\n7. Scoop rounded tablespoons of dough onto the lined baking sheets, spacing them about 2 inches apart to give the cookies room to spread.\n\n8. Bake for 10 to 12 minutes, or until the edges are lightly golden and the centers still look slightly soft.\n\n9. Let the cookies cool on the baking sheets for 5 minutes, then transfer them to a cooling rack to cool completely.\n\nTips and Storage\n\nFor softer cookies, bake closer to 10 minutes. For crispier cookies, bake closer to 12 minutes.\n\nMake sure your butter is soft but not melted. Melted butter will cause the cookies to spread too thin.\n\nIf you have time, chill the dough in the refrigerator for 30 minutes before baking to help the cookies hold their shape and deepen their flavor.\n\nStore cooled cookies in an airtight container at room temperature for up to 5 days.\n\nTo freeze the dough, scoop it into balls and freeze on a tray until firm. Transfer to a freezer-safe container or bag and bake straight from frozen at 375 degrees Fahrenheit, adding 1 to 2 minutes to the baking time.", "notes": "", "standingNotes": "", "conflicts": {"userDecisions": [], "builderDecisions": [], "raw": "Recipe ratios: Gemini proposed a smaller-yield recipe with melted butter, while all other drafts proposed a standard full-batch recipe with softened butter. I chose the standard full-batch recipe for a higher yield and classic texture.\n\nSalt and vanilla measurements: Mistral and Gemini proposed 1/2 teaspoon salt, and Mistral and Grok proposed 1 teaspoon vanilla. The others proposed 1 teaspoon salt and 2 teaspoons vanilla. I chose 1 teaspoon salt and 2 teaspoons vanilla for a better flavor profile.\n\nCooling time on the pan: Perplexity, Mistral, and Grok proposed 2 minutes, while Claude, ChatGPT, and Gemini proposed 5 minutes. I chose 5 minutes to ensure the soft centers set sufficiently before transferring to a cooling rack.\n\nNumber formatting: Grok spelled out all measurement numbers as words. I chose numerical digits (used by all other drafts) for faster and easier readability."}, "appliedChanges": [], "responses": {"perplexity": "Chocolate Chip Cookies\n\nIngredients\n\n1 cup unsalted butter, softened\n3/4 cup granulated sugar\n3/4 cup packed brown sugar\n2 large eggs\n2 teaspoons vanilla extract\n2 1/4 cups all-purpose flour\n1 teaspoon baking soda\n1 teaspoon salt\n2 cups chocolate chips\n\nInstructions\n\n1. Heat the oven to 375\u00b0F.\n2. In a large bowl, cream the butter, granulated sugar, and brown sugar until smooth.\n3. Beat in the eggs and vanilla.\n4. In a separate bowl, mix the flour, baking soda, and salt.\n5. Add the dry ingredients to the wet ingredients and stir until just combined.\n6. Fold in the chocolate chips.\n7. Drop rounded tablespoons of dough onto ungreased baking sheets.\n8. Bake for 9 to 11 minutes, until the edges are lightly golden and the centers still look slightly soft.\n9. Let the cookies cool on the baking sheet for 2 minutes, then move them to a wire rack.\n\nNotes\n\nFor softer cookies, take them out when the centers still look a little underbaked.\nFor chewier cookies, do not overmix the dough.\nIf you want thicker cookies, chill the dough for 30 minutes before baking.", "mistral": "Classic Chocolate Chip Cookies\n\nIngredients\n\n1 cup unsalted butter, softened\n3/4 cup granulated sugar\n3/4 cup packed light brown sugar\n2 large eggs\n1 teaspoon vanilla extract\n2 1/4 cups all-purpose flour\n1 teaspoon baking soda\n1/2 teaspoon salt\n2 cups semi-sweet chocolate chips\n\nEquipment\n\nMixing bowl\nElectric mixer or whisk\nMeasuring cups and spoons\nBaking sheets\nParchment paper or silicone baking mats\nCooling rack\n\nInstructions\n\nPreheat your oven to 375\u00b0F (190\u00b0C). Line your baking sheets with parchment paper or silicone baking mats.\n\nIn a mixing bowl, cream together the softened butter, granulated sugar, and brown sugar until the mixture is light and fluffy. This should take about 2-3 minutes with an electric mixer or 4-5 minutes by hand.\n\nAdd the eggs one at a time, mixing well after each addition. Stir in the vanilla extract.\n\nIn a separate bowl, whisk together the flour, baking soda, and salt.\n\nGradually add the dry ingredients to the wet ingredients, mixing just until combined. Do not overmix.\n\nFold in the chocolate chips using a spatula or wooden spoon.\n\nUsing a cookie scoop or tablespoon, drop rounded portions of dough onto the prepared baking sheets, spacing them about 2 inches apart.\n\nBake in the preheated oven for 9-11 minutes, or until the edges are golden brown and the centers look slightly underbaked. Rotate the baking sheets halfway through the baking time for even cooking.\n\nRemove the baking sheets from the oven and let the cookies cool on the sheets for 2 minutes before transferring them to a cooling rack to cool completely.\n\nEnjoy your classic chocolate chip cookies!\n\nStorage\n\nStore cookies in an airtight container at room temperature for up to 5 days. For longer storage, freeze the baked cookies in a single layer on a baking sheet, then transfer to a freezer-safe container or bag for up to 3 months.\n\nVariations\n\nFor chewier cookies, use an extra 1/4 cup of brown sugar and reduce the granulated sugar by the same amount.\n\nFor crispier cookies, bake for an additional 1-2 minutes and use an extra 1/4 cup of granulated sugar.\n\nFor softer cookies, slightly underbake them and store them in an airtight container with a slice of bread to keep them moist.", "claude": "Easy Chocolate Chip Cookies\n\nYield: About 24 cookies\nPrep time: 15 minutes\nBake time: 10 to 12 minutes per batch\nTotal time: About 40 minutes\n\nIngredients\n\n1 cup (2 sticks) unsalted butter, softened to room temperature\n3/4 cup granulated sugar\n3/4 cup packed light brown sugar\n2 large eggs\n2 teaspoons vanilla extract\n2 1/4 cups all-purpose flour\n1 teaspoon baking soda\n1 teaspoon salt\n2 cups semisweet chocolate chips\n\nEquipment\n\nTwo baking sheets\nParchment paper or a nonstick baking mat\nLarge mixing bowl\nMedium mixing bowl\nElectric mixer or sturdy wooden spoon\nMeasuring cups and spoons\nCooling rack\n\nInstructions\n\n1. Preheat your oven to 375 degrees Fahrenheit. Line your baking sheets with parchment paper.\n\n2. In the large mixing bowl, beat the softened butter, granulated sugar, and brown sugar together until the mixture is light and creamy, about 2 minutes.\n\n3. Add the eggs one at a time, mixing well after each. Then add the vanilla extract and mix until combined.\n\n4. In the medium bowl, stir together the flour, baking soda, and salt.\n\n5. Gradually add the dry ingredients to the wet ingredients, mixing just until no streaks of flour remain. Do not overmix.\n\n6. Stir in the chocolate chips until they are evenly spread through the dough.\n\n7. Scoop rounded tablespoons of dough onto the lined baking sheets, spacing them about 2 inches apart to give the cookies room to spread.\n\n8. Bake for 10 to 12 minutes, or until the edges are lightly golden and the centers still look slightly soft.\n\n9. Let the cookies cool on the baking sheet for 5 minutes, then move them to a cooling rack to finish cooling.\n\nTips\n\nFor softer cookies, take them out at 10 minutes. For crispier cookies, leave them in closer to 12 minutes.\n\nMake sure your butter is soft but not melted. Melted butter will cause the cookies to spread too thin.\n\nIf you have time, chill the dough in the refrigerator for 30 minutes before baking. This helps the cookies hold their shape and deepens the flavor.\n\nStore cooled cookies in an airtight container at room temperature for up to 5 days. You can also freeze scoops of raw dough and bake them straight from the freezer, adding 1 to 2 minutes to the bake time.", "chatgpt": "Easy Chocolate Chip Cookies\n\nYield\n\nAbout 24 cookies\n\nPrep Time\n\n15 minutes\n\nBake Time\n\n10 to 12 minutes per batch\n\nTotal Time\n\nAbout 30 minutes\n\nIngredients\n\n1 cup unsalted butter, softened\n\n3/4 cup granulated sugar\n\n3/4 cup packed brown sugar\n\n2 large eggs\n\n2 teaspoons vanilla extract\n\n2 1/4 cups all-purpose flour\n\n1 teaspoon baking soda\n\n1 teaspoon salt\n\n2 cups chocolate chips\n\nInstructions\n\nPreheat the oven to 375\u00b0F.\n\nLine a baking sheet with parchment paper, or lightly grease the baking sheet.\n\nIn a large mixing bowl, beat the softened butter, granulated sugar, and brown sugar together until smooth and creamy.\n\nAdd the eggs and vanilla extract. Mix until fully combined.\n\nIn a separate bowl, stir together the flour, baking soda, and salt.\n\nAdd the dry ingredients to the butter mixture a little at a time. Mix until a soft cookie dough forms. Do not overmix.\n\nStir in the chocolate chips until evenly spread through the dough.\n\nScoop rounded tablespoons of dough onto the prepared baking sheet, leaving about 2 inches between each cookie.\n\nBake for 10 to 12 minutes, or until the edges are lightly golden and the centers still look a little soft.\n\nLet the cookies cool on the baking sheet for 5 minutes.\n\nMove the cookies to a cooling rack, or enjoy them warm.\n\nSimple Tips\n\nFor softer cookies, bake closer to 10 minutes and let them finish setting on the baking sheet.\n\nFor crispier edges, bake closer to 12 minutes.\n\nUse softened butter, not melted butter, for the best texture.\n\nIf the dough feels too soft, chill it in the refrigerator for 20 to 30 minutes before baking.\n\nStorage\n\nStore cooled cookies in an airtight container at room temperature for up to 4 days.\n\nTo freeze the dough, scoop it into cookie dough balls and freeze them on a tray until firm. Transfer the frozen dough balls to a freezer bag or container. Bake from frozen at 375\u00b0F, adding 1 to 2 extra minutes to the bake time.", "gemini": "Easy Chocolate Chip Cookies\n\nPrep time: 10 minutes\nCook time: 10 minutes\nYields: About 24 cookies\n\nIngredients\n\n1/2 cup unsalted butter, melted\n3/4 cup packed lightly brown sugar\n1/2 cup granulated white sugar\n1 large egg\n1 teaspoon vanilla extract\n1 and 1/2 cups all-purpose flour\n1/2 teaspoon baking soda\n1/2 teaspoon salt\n1 and 1/2 cups semi-sweet chocolate chips\n\nInstructions\n\nStep 1\nPreheat your oven to 350 degrees Fahrenheit. Line a large baking sheet with parchment paper.\n\nStep 2\nIn a large mixing bowl, stir the melted butter, brown sugar, and granulated white sugar together until completely smooth. \n\nStep 3\nAdd the egg and vanilla extract to the bowl. Stir the mixture until it is well combined and glossy.\n\nStep 4\nAdd the all-purpose flour, baking soda, and salt to the wet ingredients. Stir everything together gently just until the dry ingredients disappear into the dough. \n\nStep 5\nPour in the chocolate chips and stir briefly to distribute them evenly throughout the cookie dough.\n\nStep 6\nScoop rounded tablespoons of the dough and place them onto your prepared baking sheet. Leave about two inches of space between each dough ball so the cookies have room to spread.\n\nStep 7\nBake the cookies in the preheated oven for 10 to 12 minutes. The edges should be lightly golden brown, but the centers will still look soft and slightly underbaked. \n\nStep 8\nTake the baking sheet out of the oven. Let the cookies rest on the baking sheet for 5 minutes to set before moving them to a plate or wire rack to finish cooling.", "grok": "Chocolate Chip Cookies\n\nThis recipe produces simple chocolate chip cookies that are easy to prepare at home and yield great results for sharing with friends.\n\nIngredients\n\nTwo and one fourth cups all purpose flour.\nOne teaspoon baking soda.\nOne teaspoon salt.\nOne cup butter softened.\nThree fourth cup granulated sugar.\nThree fourth cup brown sugar.\nOne teaspoon vanilla extract.\nTwo large eggs.\nTwo cups chocolate chips.\n\nInstructions\n\nPreheat the oven to three hundred seventy five degrees Fahrenheit.\nCombine the flour baking soda and salt in one bowl and set aside.\nIn a separate bowl cream together the softened butter granulated sugar and brown sugar until the mixture is light and fluffy.\nMix in the vanilla extract.\nAdd the eggs one at a time beating well after each addition.\nGradually blend the dry ingredients into the wet mixture until fully combined.\nStir in the chocolate chips.\nDrop rounded tablespoons of dough onto ungreased baking sheets leaving space between each cookie.\nBake for nine to eleven minutes until the edges are golden brown.\nAllow the cookies to cool on the baking sheets for two minutes then transfer them to wire racks to cool completely."}, "timestamp": "9:40:17 PM", "timestampISO": "2026-05-30T04:40:17.109Z", "outcome": "continuing", "builderId": "gemini", "resolvedDecisions": [], "referenceMaterialAtRound": []}], "docText": "Easy Chocolate Chip Cookies\n\nYield\nAbout 24 cookies\n\nPrep time\n15 minutes\n\nBake time\n10 to 12 minutes\n\nTotal time\nAbout 40 minutes\n\nIngredients\n\n1 cup (2 sticks) unsalted butter, softened to room temperature\n3/4 cup granulated sugar\n3/4 cup packed light brown sugar\n2 large eggs\n2 teaspoons vanilla extract\n2 1/4 cups all-purpose flour\n1 teaspoon baking soda\n1 teaspoon salt\n2 cups semisweet chocolate chips\n\nEquipment\n\nTwo baking sheets\nParchment paper or nonstick baking mats\nLarge mixing bowl\nMedium mixing bowl\nElectric mixer or sturdy wooden spoon\nMeasuring cups and spoons\nCooling rack\n\nInstructions\n\n1. Preheat your oven to 375 degrees Fahrenheit. Line your baking sheets with parchment paper or nonstick baking mats.\n\n2. In the large mixing bowl, beat the softened butter, granulated sugar, and brown sugar together until the mixture is light and creamy, about 2 to 3 minutes.\n\n3. Add the eggs one at a time, mixing well after each. Stir in the vanilla extract until fully combined.\n\n4. In the medium bowl, stir together the flour, baking soda, and salt.\n\n5. Gradually add the dry ingredients to the wet ingredients, mixing just until no streaks of flour remain. Do not overmix.\n\n6. Fold in the chocolate chips until they are evenly distributed throughout the dough.\n\n7. Scoop rounded tablespoons of dough onto the lined baking sheets, spacing them about 2 inches apart to give the cookies room to spread.\n\n8. Bake for 10 to 12 minutes, or until the edges are lightly golden and the centers still look slightly soft.\n\n9. Let the cookies cool on the baking sheets for 5 minutes, then transfer them to a cooling rack to cool completely.\n\nTips and Storage\n\nFor softer cookies, bake closer to 10 minutes. For crispier cookies, bake closer to 12 minutes.\n\nMake sure your butter is soft but not melted. Melted butter will cause the cookies to spread too thin.\n\nIf you have time, chill the dough in the refrigerator for 30 minutes before baking to help the cookies hold their shape and deepen their flavor.\n\nStore cooled cookies in an airtight container at room temperature for up to 5 days.\n\nTo freeze the dough, scoop it into balls and freeze on a tray until firm. Transfer to a freezer-safe container or bag and bake straight from frozen at 375 degrees Fahrenheit, adding 1 to 2 minutes to the baking time.", "consoleHTML": "<div class=\"console-entry console-info\"><span class=\"console-time\">09:40:17 PM </span><span>\ud83d\udccd Phase advanced to Refine Text</span></div><div class=\"console-entry console-success\"><span class=\"console-time\">09:40:17 PM </span><span>\u2705 Round 1 complete \u2014 document updated (398 words)</span></div><div class=\"console-entry console-warn\"><span class=\"console-time\">09:40:17 PM </span><span>\u26a1 Conflicts detected \u2014 see Conflicts panel</span></div><div class=\"console-entry console-success\"><span class=\"console-time\">09:40:17 PM </span><span>\u2705 Gemini \u2014 responded in 21.1s (~541 words)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:55 PM </span><span>\ud83d\udce4 Gemini (Builder) \u2014 sending request (13,469 chars \u00b7 key: \u2022\u2022\u2022\u2022CAPTURE\u2022\u2022\u2022\u2022)</span></div><div class=\"console-entry console-info\"><span class=\"console-time\">09:39:55 PM </span><span>\ud83d\udd28 Gemini (Builder) \u2014 compiling document from 6 reviews (including its own)\u2026</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:55 PM </span><span>\ud83d\udccb Grok: Chocolate Chip Cookies  This recipe produces simple chocolate chip cookies that are easy to prepare at home and yield great results for sharing with friends.  I\u2026</span></div><div class=\"console-entry console-success\"><span class=\"console-time\">09:39:55 PM </span><span>\u2705 Grok \u2014 responded in 17.7s (~192 words)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:51 PM </span><span>\ud83d\udccb Gemini: Easy Chocolate Chip Cookies  Prep time: 10 minutes Cook time: 10 minutes Yields: About 24 cookies  Ingredients  1/2 cup unsalted butter, melted 3/4 cup packed l\u2026</span></div><div class=\"console-entry console-success\"><span class=\"console-time\">09:39:51 PM </span><span>\u2705 Gemini \u2014 responded in 13.6s (~264 words)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:50 PM </span><span>\ud83d\udccb ChatGPT: Easy Chocolate Chip Cookies  Yield  About 24 cookies  Prep Time  15 minutes  Bake Time  10 to 12 minutes per batch  Total Time  About 30 minutes  Ingredients  1\u2026</span></div><div class=\"console-entry console-success\"><span class=\"console-time\">09:39:50 PM </span><span>\u2705 ChatGPT \u2014 responded in 12.4s (~332 words)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:48 PM </span><span>\ud83d\udccb Claude: Easy Chocolate Chip Cookies  Yield: About 24 cookies Prep time: 15 minutes Bake time: 10 to 12 minutes per batch Total time: About 40 minutes  Ingredients  1 cu\u2026</span></div><div class=\"console-entry console-success\"><span class=\"console-time\">09:39:48 PM </span><span>\u2705 Claude \u2014 responded in 9.9s (~381 words)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:46 PM </span><span>\ud83d\udccb Mistral: Classic Chocolate Chip Cookies  Ingredients  1 cup unsalted butter, softened 3/4 cup granulated sugar 3/4 cup packed light brown sugar 2 large eggs 1 teaspoon v\u2026</span></div><div class=\"console-entry console-success\"><span class=\"console-time\">09:39:46 PM </span><span>\u2705 Mistral \u2014 responded in 7.8s (~368 words)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:40 PM </span><span>\ud83d\udccb Perplexity: Chocolate Chip Cookies  Ingredients  1 cup unsalted butter, softened 3/4 cup granulated sugar 3/4 cup packed brown sugar 2 large eggs 2 teaspoons vanilla extrac\u2026</span></div><div class=\"console-entry console-success\"><span class=\"console-time\">09:39:40 PM </span><span>\u2705 Perplexity \u2014 responded in 2.6s (~187 words)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:38 PM </span><span>\ud83d\udce4 Mistral \u2014 sending request (1,834 chars \u00b7 key: \u2022\u2022\u2022\u2022CAPTURE\u2022\u2022\u2022\u2022)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:38 PM </span><span>\ud83d\udce4 Perplexity \u2014 sending request (1,834 chars \u00b7 key: \u2022\u2022\u2022\u2022CAPTURE\u2022\u2022\u2022\u2022)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:38 PM </span><span>\ud83d\udce4 Grok \u2014 sending request (1,834 chars \u00b7 key: \u2022\u2022\u2022\u2022CAPTURE\u2022\u2022\u2022\u2022)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:38 PM </span><span>\ud83d\udce4 Gemini \u2014 sending request (1,834 chars \u00b7 key: \u2022\u2022\u2022\u2022CAPTURE\u2022\u2022\u2022\u2022)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:38 PM </span><span>\ud83d\udce4 Claude \u2014 sending request (1,834 chars \u00b7 key: \u2022\u2022\u2022\u2022CAPTURE\u2022\u2022\u2022\u2022)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:38 PM </span><span>\ud83d\udce4 ChatGPT \u2014 sending request (1,834 chars \u00b7 key: \u2022\u2022\u2022\u2022CAPTURE\u2022\u2022\u2022\u2022)</span></div><div class=\"console-entry console-info\"><span class=\"console-time\">09:39:38 PM </span><span>\ud83d\udc1d 6 AIs reviewing simultaneously (including Builder)</span></div><div class=\"console-entry\"><span class=\"console-time\">09:39:38 PM </span><span>\u2550\u2550\u2550 Round 1 \u00b7 Phase: 1 \u00b7 Draft \u2550\u2550\u2550</span></div>", "notes": "", "standingNotes": "", "projClockSeconds": 111, "lengthGuardOverride": false, "cleanThisRound": [], "sessionAIs": ["chatgpt", "claude", "gemini", "grok", "perplexity", "mistral"], "ringBuffer": [], "lastFailure": null};

// ============ shot manifest ============
// v3.63.196 — Builder screen was retired in v3.63.147 (DOM removed v3.63.163).
// The standalone Builder selection screen was folded into Setup 1 (Set up your
// hive) via the per-row 🔨 Builder button. Setup flow is now 4 screens, not 5:
// bees → project → reference → document. The screen-builder entry was failing
// every run with "no-screen-element"; removed. Subsequent screens renumbered
// so the file names match the visible step numbers in the live app.
// v3.63.245 — Added two new scenes: checkpoint-save and template-gallery.
//   • checkpoint-save uses the full-session seed so the Current column has
//     non-empty values to display (otherwise every row reads "(none)" /
//     "(empty)" and the screenshot looks broken). After arrival, the
//     `postReady` expression switches the screen into Save mode explicitly
//     so the capture is deterministic regardless of last-state.
//   • template-gallery navigates to screen-project, then fires
//     showTemplateGallery() as the post-ready step. The capture shows the
//     gallery modal sitting on top of the Project screen — same view a
//     user gets when clicking "📋 Use Template" on Setup 2.
const SHOTS = [
  { id: 'screen-welcome',    base: 'welcome',          seed: null,           postReady: null },
  { id: 'screen-bees',       base: 'setup1',           seed: null,           postReady: null },
  { id: 'screen-project',    base: 'setup2',           seed: null,           postReady: null },
  { id: 'screen-reference',  base: 'setup3',           seed: null,           postReady: null },
  { id: 'screen-document',   base: 'setup4',           seed: null,           postReady: null },
  { id: 'screen-settings',   base: 'settings',         seed: null,           postReady: null },
  { id: 'screen-work',       base: 'work',             seed: 'full-session', postReady: null },
  { id: 'screen-checkpoint', base: 'checkpoint-save',  seed: 'full-session',
    postReady: "try { if (typeof switchCheckpointMode === 'function') switchCheckpointMode('save'); } catch(e){}" },
  { id: 'screen-project',    base: 'template-gallery', seed: null,
    postReady: "try { if (typeof showTemplateGallery === 'function') showTemplateGallery(); } catch(e){}" }
];

const shots = ONLY_WORK ? SHOTS.filter(s => s.base === 'work') : SHOTS;

// ============ static HTTP server ============
const MIME = {
  '.html':'text/html', '.htm':'text/html', '.js':'text/javascript',
  '.mjs':'text/javascript', '.css':'text/css', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif',
  '.svg':'image/svg+xml', '.json':'application/json', '.ico':'image/x-icon',
  '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf',
  '.wav':'audio/wav', '.mp3':'audio/mpeg', '.flac':'audio/flac',
  '.pdf':'application/pdf', '.txt':'text/plain', '.md':'text/markdown'
};
const ROOT_ABS = path.resolve(REPO_ROOT);
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.resolve(path.join(ROOT_ABS, p));
  if (!fp.startsWith(ROOT_ABS)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(d);
  });
});
await new Promise((res, rej) => { server.once('error', rej); server.listen(SERVER_PORT, '127.0.0.1', res); });

// ============ launch Chrome with remote debugging ============
const profileDir = path.join(os.tmpdir(), 'wf-cap-' + Date.now());
fs.mkdirSync(profileDir, { recursive: true });
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--no-sandbox',
  '--force-device-scale-factor=1', '--window-size=1920,1080',
  `--user-data-dir=${profileDir}`,
  `--remote-debugging-port=${DEBUG_PORT}`,
  'about:blank'
], { stdio: 'ignore', detached: false });

let cleaned = false;
function cleanup(code) {
  if (cleaned) return;
  cleaned = true;
  try { chrome.kill(); } catch {}
  try { server.close(); } catch {}
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
  if (typeof code === 'number') process.exit(code);
}
process.on('SIGINT', () => cleanup(130));
process.on('SIGTERM', () => cleanup(143));
process.on('uncaughtException', (e) => { console.error('FATAL', e); cleanup(1); });

// ============ wait for CDP, get WS URL ============
async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      const tabs = await r.json();
      const tab = tabs.find(t => t.type === 'page');
      if (tab && tab.webSocketDebuggerUrl) return tab.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome DevTools endpoint did not become available');
}
const wsUrl = await getWsUrl();

// ============ minimal CDP client over WebSocket ============
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = (e) => rej(new Error('WebSocket error: ' + (e?.message || 'unknown')));
});

let cdpId = 0;
const pending = new Map();
const eventHandlers = new Map();
ws.onmessage = (ev) => {
  let m;
  try { m = JSON.parse(ev.data); } catch { return; }
  if (m.id != null) {
    const p = pending.get(m.id);
    if (p) {
      pending.delete(m.id);
      if (m.error) p.rej(new Error(m.error.message || JSON.stringify(m.error)));
      else p.res(m.result);
    }
  } else if (m.method) {
    const handlers = eventHandlers.get(m.method);
    if (handlers) handlers.slice().forEach(fn => { try { fn(m.params); } catch {} });
  }
};
function cdp(method, params = {}) {
  const id = ++cdpId;
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); rej(new Error(`CDP timeout: ${method}`)); }
    }, 30000);
  });
}
function onEvent(method, fn) {
  if (!eventHandlers.has(method)) eventHandlers.set(method, []);
  eventHandlers.get(method).push(fn);
  return () => {
    const list = eventHandlers.get(method) || [];
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };
}
function waitForEvent(method, timeoutMs = 15000) {
  return new Promise((res, rej) => {
    const off = onEvent(method, (params) => { off(); res(params); });
    setTimeout(() => { off(); rej(new Error(`event timeout: ${method}`)); }, timeoutMs);
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

await cdp('Page.enable');
await cdp('Runtime.enable');

// ============ readiness check (the handshake that beats the race) ============
function readyExpr(screenId) {
  return `(function(){
    try {
      var s = document.getElementById(${JSON.stringify(screenId)});
      if (!s) return { ready: false, reason: 'no-screen-element' };
      if (getComputedStyle(s).display === 'none') return { ready: false, reason: 'screen-hidden' };
      if (${JSON.stringify(screenId)} === 'screen-builder') {
        var g = document.getElementById('builderPickGrid');
        if (!g) return { ready: false, reason: 'no-builder-grid' };
        if (g.children.length < 2) return { ready: false, reason: 'builder-cards=' + g.children.length };
      }
      if (${JSON.stringify(screenId)} === 'screen-bees') {
        var g = document.getElementById('aiSetupGrid');
        if (g && g.children.length < 2) return { ready: false, reason: 'bees-rows=' + g.children.length };
      }
      return { ready: true };
    } catch (e) { return { ready: false, reason: 'err:' + e.message }; }
  })()`;
}
function driveExpr(screenId, theme) {
  return `(function(){
    try { if (typeof setTheme === 'function') setTheme(${JSON.stringify(theme)}); } catch(e){}
    try { if (typeof goToScreen === 'function') goToScreen(${JSON.stringify(screenId)}); } catch(e){}
  })()`;
}

// ============ seed helper ============
// Page.addScriptToEvaluateOnNewDocument runs the script BEFORE any of the
// page's own scripts execute on the next navigation. That's the only safe
// place to write localStorage so the app's init reads our seeded value.
async function addSeedScript(hiveJson) {
  const src = `try { localStorage.setItem('waxframe_v2_hive', ${JSON.stringify(hiveJson)}); } catch(e){}`;
  const r = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: src });
  return r.identifier;
}
async function clearState() {
  // Clear localStorage, sessionStorage, and the WaxFrame IndexedDB session store.
  // Called between every shot so a seed from one shot can't bleed into the next.
  // We're assumed to already be on the local-server origin when this runs.
  const expr = `(async function () {
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    await new Promise(function (res) {
      var req = indexedDB.deleteDatabase('waxframe_v2_db');
      req.onsuccess = req.onerror = req.onblocked = function () { res(); };
    });
    return 'cleared';
  })()`;
  try {
    await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  } catch (e) {
    // First clear before any origin nav can throw — swallow and move on.
  }
}

async function seedFullSession() {
  // Two-phase: establish the local-server origin so localStorage/IDB writes
  // land in the right scope, then await an async injection that populates
  // hive + project + auto-update-off + IDB session, then re-navigate so the
  // app boots with everything already in place. CDP awaitPromise=true makes
  // the IDB put deterministic — no race.
  const loadP1 = waitForEvent('Page.loadEventFired', 15000);
  await cdp('Page.navigate', { url: `http://127.0.0.1:${SERVER_PORT}/index.html` });
  await loadP1;
  const seedJs = `(async function () {
    try {
      localStorage.setItem('waxframe_v2_hive',    ${JSON.stringify(JSON.stringify(HIVE_SEED_WORK))});
      localStorage.setItem('waxframe_v2_project', ${JSON.stringify(JSON.stringify(PROJECT_SEED))});
      localStorage.setItem('waxframe_auto_update_models', 'false');
    } catch (e) {}
    await new Promise(function (res, rej) {
      var req = indexedDB.open('waxframe_v2_db', 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('session')) db.createObjectStore('session');
      };
      req.onsuccess = function (e) {
        var db = e.target.result;
        var tx = db.transaction('session', 'readwrite');
        tx.objectStore('session').put(${JSON.stringify(SESSION_SEED)}, 'current');
        tx.oncomplete = function () { try { db.close(); } catch (_) {} res(); };
        tx.onerror    = function (e) { rej(e.target.error); };
      };
      req.onerror = function (e) { rej(e.target.error); };
    });
    return 'seeded';
  })()`;
  await cdp('Runtime.evaluate', { expression: seedJs, awaitPromise: true, returnByValue: true });
}

async function removeSeedScript(identifier) {
  if (!identifier) return;
  try { await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier }); } catch {}
}

// ============ banner ============
console.log(`Browser : ${BROWSER}`);
console.log(`Repo    : ${ROOT_ABS}`);
console.log(`Output  : ${OUT_DIR}`);
console.log(`Server  : http://127.0.0.1:${SERVER_PORT}  (Node)`);
console.log(`Theme   : ${THEME_ARG}`);
console.log('');

// ============ capture loop ============
let ok = 0, fail = 0;
fs.mkdirSync(OUT_DIR, { recursive: true });

// One-time origin establishment so localStorage/IDB clears below can run.
{
  const loadP0 = waitForEvent('Page.loadEventFired', 15000);
  await cdp('Page.navigate', { url: `http://127.0.0.1:${SERVER_PORT}/index.html` });
  await loadP0;
  await clearState();
}

for (const s of shots) {
  for (const th of THEMES) {
    const filename = `screenshot_${s.base}_${th}.png`;
    const outFile = path.join(OUT_DIR, filename);
    if (fs.existsSync(outFile)) { try { fs.unlinkSync(outFile); } catch {} }
    process.stdout.write(`Capturing ${s.base.padEnd(10)} ${th.padEnd(5)} -> ${filename} ... `);

    let seedId = null;
    try {
      // DEFENSIVE: clear all state from any prior shot so seeds can't bleed forward.
      // (We're already on the origin from the previous loop iteration or the initial
      // nav above, so localStorage.clear() and IDB delete work without a fresh nav.)
      await clearState();

      // Seed BEFORE navigation so the seed lands at document-start of the new doc.
      if (s.seed === 'hive-builder') {
        seedId = await addSeedScript(JSON.stringify(HIVE_SEED_BUILDER));
      } else if (s.seed === 'full-session') {
        await seedFullSession();
      }

      const loadP = waitForEvent('Page.loadEventFired', 15000);
      await cdp('Page.navigate', { url: `http://127.0.0.1:${SERVER_PORT}/index.html` });
      await loadP;

      // Re-drive + poll readiness. The instant the page proves it's on the
      // target screen with content rendered, we capture.
      const deadline = Date.now() + 12000;
      let ready = false, lastReason = 'never-evaluated';
      while (Date.now() < deadline) {
        await cdp('Runtime.evaluate', { expression: driveExpr(s.id, th), awaitPromise: false });
        await sleep(75);
        const r = await cdp('Runtime.evaluate', { expression: readyExpr(s.id), returnByValue: true });
        const v = r?.result?.value;
        if (v?.ready) { ready = true; break; }
        lastReason = v?.reason || 'unknown';
        await sleep(75);
      }
      if (!ready) {
        console.log(`FAILED (not-ready: ${lastReason})`);
        fail++;
        continue;
      }

      // v3.63.245 — Optional post-ready step. Lets scenes do extra setup
      // after the base screen is rendered — e.g. open the Templates modal
      // on top of screen-project, or switch the Checkpoints screen into a
      // specific mode. The expression is evaluated in the page context;
      // a brief settle follows so any modal animation / mode-swap paint
      // completes before the screenshot.
      if (s.postReady) {
        try { await cdp('Runtime.evaluate', { expression: s.postReady, awaitPromise: false }); }
        catch (_) { /* postReady is best-effort; don't fail the shot */ }
        await sleep(300);
      }

      // Tiny settle for any final paint, then capture.
      await sleep(150);
      const shot = await cdp('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(shot.data, 'base64');
      fs.writeFileSync(outFile, buf);
      const kb = Math.round(buf.length / 1024);
      console.log(`OK (${kb} KB)`);
      ok++;
    } catch (e) {
      console.log(`FAILED (${e.message})`);
      fail++;
    } finally {
      // Always remove the seed so the next shot starts fresh.
      await removeSeedScript(seedId);
    }
  }
}

console.log('');
console.log(`Done: ${ok} captured, ${fail} failed.`);

try { ws.close(); } catch {}
cleanup();
process.exit(fail > 0 ? 1 : 0);
