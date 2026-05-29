# The Crystal Series

A high-graphic game hub with a shared neon crystal art style, including a 30-level platformer, a pseudo-3D racing game, and a Geometry Dash-style rhythm platformer. The project now has a browser version and the original Pygame version.

## Run Website

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`.

## Publish Website Globally

This is a static website, so it can be hosted worldwide by Netlify, Vercel, Cloudflare Pages, or GitHub Pages.

Fastest path:

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, `game.js`, `package.json`, `netlify.toml`, `vercel.json`, and `robots.txt`.
3. Connect that repository to Netlify or Vercel.
4. Deploy with the default static-site settings.

No build command is required. The site entry file is `index.html`.

## Run Pygame

```powershell
pip install -r requirements.txt
python main.py
```

## Controls

- `A` or `Left Arrow`: move left
- `D` or `Right Arrow`: move right
- `W`, `Up Arrow`, or `Space`: jump
- `C` or `Left Mouse Click`: use the equipped character ability
- In Prism Rally, the car auto-drives; use `A/D` to steer, `S/Down` to brake, and `W/Up` for a boost
- In Prism Dash, press `Space`, `W`, `Up`, `C`, or click to jump
- Click a game card on the home screen to play it
- `Esc`: return to the home screen from any game; quit from the home screen
- Click `Home` or press `L`: open the home screen on the Levels tab
- Click the top-left arrow: hide or show the HUD
- Press `Tab`: open the home screen on the Characters tab
- `F11`: toggle fullscreen
- `R`: restart current level
- `Esc`: home screen / quit from home

Each level ends at a glowing goal about 150-200 blocks from the spawn. Touching the goal moves to the next level across 30 total stages; crystals are optional.
The level select screen lets you replay unlocked stages, while future stages stay locked until you beat enough levels to reach them.
After clearing each world's 10th level, a crystal roll awards 1-10 bonus crystals before the next world begins.
The home screen includes a Characters tab where crystals can be spent on character rolls. Unlocked characters can be equipped for different attacks, including kicks, fists, and piercing powers.
Unlocked characters can also be upgraded with crystals. Upgrades lower ability cooldowns and improve each character's attack range, size, or projectile strength.
The Games tab includes Prism Runner, Prism Rally, and Prism Dash.
The camera follows the player to the right, clamps at the level boundary, and does not scroll back left during normal movement. Dying resets the camera to the start.
The gun has a 5 second cooldown after every shot.
You have 3 lives. After the third death, the game restarts from level 1.
