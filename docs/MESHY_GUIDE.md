# Meshy.ai Guide: Generating 3D Models for Space Bot

This guide walks you through generating each 3D model the game needs, using your free Meshy account.

## What Meshy Does

Meshy is a text-to-3D and image-to-3D generator. You describe a character, it produces a 3D model with textures. We need it to export **GLB format** (Three.js's preferred format).

## What to Get from Meshy

For the tech demo + World 1, you need to generate **5 models**:

| # | Model | Purpose | Priority |
|---|-------|---------|----------|
| 1 | Space Bot | Player character | **HIGH** — needed first |
| 2 | Virus Boss | World 1 final boss | HIGH |
| 3 | Spore Minion | Common enemy in World 1 | MEDIUM |
| 4 | Vine Whip | Ranged enemy in World 1 | MEDIUM |
| 5 | Battery | Collectible (optional — primitive looks fine) | LOW |

We currently use code-built primitives for everything, so **the game runs without any of these**. As you generate each one, we drop the GLB into `public/models/` and swap the in-code primitive for the model.

## Step-by-Step: Generating a Model

1. Log in to https://www.meshy.ai
2. Click **Text to 3D** (preferred) or **Image to 3D** if you have a reference image
3. Paste the prompt from below for the character you want
4. Choose **Style: Realistic** for the bosses, **Stylized / Cartoon** for Space Bot and minions
5. Click Generate. Wait 30–90 seconds.
6. You'll get 4 preview options. Pick the closest match. Click **Refine** to improve quality (uses more credits).
7. Click **Download** → choose **GLB** format.
8. Rename the file to match the table below and drop it into `public/models/` in your project.

### Required filenames

```
public/models/space_bot.glb
public/models/boss_virus.glb
public/models/enemy_spore.glb
public/models/enemy_vine.glb
public/models/battery.glb       (optional)
```

## Prompts to Use

### 1. Space Bot (the hero)

```
A friendly cute small robot character. Horizontal oval-shaped head wider 
than tall, vertical oval body taller than wide, two cylindrical arms with 
three small oval finger tips on each hand, two cylindrical legs each with 
three vertical green stripes wrapped around them. A single thin antenna 
on top of the head with a small glowing green sphere on top. A glowing 
green circle in the center of the chest. Two horizontal green glowing line 
eyes. A simple curved smile. The body is brushed metal gray, all green 
parts glow brightly. Friendly happy expression. T-pose, facing forward.
```

**Style**: Stylized / Cartoon
**Notes**: If the result puts fingers wrong or the antenna leans, regenerate. Specify "T-pose" for easier rigging if you ever animate it.

### 2. The Virus (World 1 Boss)

```
Giant menacing alien virus monster. Round lumpy bulbous body covered in 
small spike protrusions, semi-translucent green skin with internal 
glowing infection. Two enormous round white eyes with small black pupils 
positioned on the front. No mouth. Dripping slime texture. Bioluminescent 
glowing veins under the surface. Sci-fi creature design. Standing pose, 
front view.
```

**Style**: Realistic, leaning Stylized
**Notes**: Should be intimidating but not horror-grade — this is a kids' game.

### 3. Spore Minion (World 1 enemy)

```
Small alien spore creature. Round green body with three pointy thorns on 
top, two black dot eyes, small angry expression, four thin spider-like 
legs underneath. Bioluminescent skin with subtle green glow. Cartoon 
style. Front view.
```

**Style**: Stylized / Cartoon
**Notes**: This will be the most-spawned enemy, so keep it simple. Lower poly = better performance.

### 4. Vine Whip (World 1 ranged enemy)

```
Hostile alien plant creature. Tall thin stalk with a snapping mouth at 
the top filled with thorny teeth. Dark green and purple coloring. Coiled 
vine body. Glowing yellow eyes on the head bulb. Roots gripping the 
ground. Sci-fi alien plant. Front view.
```

**Style**: Stylized
**Notes**: Static base for animation simplicity.

### 5. Battery (optional)

```
Small sci-fi power cell. Glowing yellow cylindrical battery with a metal 
silver terminal on top. Energy lines wrapping around the body. Cartoon 
game asset. Floating, isolated on white background.
```

**Style**: Stylized
**Notes**: Honestly the code primitive looks great already. Skip unless you want a more specific look.

## What I'll Do With the GLB Files

Once you drop a GLB into `public/models/`, tell me which one is ready. I'll write the loader code that:

1. Loads the GLB asynchronously at game start (with a loading bar update)
2. Sets up materials so the green parts on Space Bot stay emissive/glowing
3. Centers, scales, and orients the model correctly in-game
4. Replaces the primitive-built version with the loaded model

Example of what I'll add to `SpaceBot.js`:

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

async loadModel() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('/models/space_bot.glb');
  this.model = gltf.scene;
  this.model.scale.setScalar(0.8);
  this.model.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      // Ensure green materials emit light
      if (child.material.color.g > 0.7 && child.material.color.r < 0.5) {
        child.material.emissive.setHex(0x4fff4f);
        child.material.emissiveIntensity = 1.5;
      }
    }
  });
  // Replace primitive group
  this.scene.remove(this.group);
  this.group = this.model;
  this.scene.add(this.group);
}
```

## Tips for Better Results

- **Front-view reference**: Always say "front view" or "T-pose" in the prompt for cleaner rigging.
- **Avoid backgrounds**: Add "isolated on white background" to keep the model clean.
- **Iterate**: Free tier limits credits, but you usually don't need to refine for placeholder quality. Just pick the best of the 4 previews.
- **Texture quality**: Meshy's PBR textures are usually good, but you may need to bump emissive intensity in code (we handle that).

## When Meshy Doesn't Work

If a generation comes out distorted (extra limbs, melted features), don't burn credits trying to fix it. We have backups:

1. The code-built Space Bot already matches your spec exactly — leave it as primitive if Meshy struggles.
2. For enemies, free CC0 models from https://kenney.nl or https://quaternius.com are professionally made and will work as drop-in alternatives.
3. For the Grid boss (World 2), the wireframe cube look is actually easier to build in code — Meshy will fight that aesthetic.

## What to Do Next

Generate **Space Bot first**. Once you have `space_bot.glb`:
1. Drop it into `public/models/`
2. Commit and push to GitHub
3. Tell me it's ready and I'll wire up the loader

Then do the Virus boss for World 1's finale. Save the minions for last — they're easier to swap in.
