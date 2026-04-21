# CTFd Solve FX

Fullscreen celebration (sound + visual) when a team submits a correct
flag. Configurable from CTFd's admin panel, ships with three presets,
and exposes a small JS API for building your own.

## Install

Drop the folder in, restart CTFd, and a **"Solve FX"** link appears in
the admin menu bar.

## Admin panel

All settings are stored in CTFd's config table and injected into every
page as `window.__CTFdSolveFXConfig` so changes take effect on page
refresh, no rebuild needed.

![alt text](/images/image.png)

## Presets

| Name | Celebration |
|---|---|
| `pulse` | Radial square-grid pulse (3 expanding rings) |
| `matrix` | matrix rain |
| `conway` | Conway's Game of Life |
| `flow` | Perlin noise from my [old proccesing project](https://openprocessing.org/sketch/2211359) |

Each preset is a self-contained file in `assets/presets/`. 
To add new presets just drop them as `.js` files in this folder and `__init__.py` should recognize them after a refresh.

## Build your own preset

A preset is an object with a `celebration(onDone)` function:

```js
CTFdSolveFX.register('my-preset', {
  celebration(onDone) {
    const overlay = CTFdSolveFX.helpers.makeOverlay();
    const canvas = overlay.querySelector('.solvefx-canvas');
    const ctx = CTFdSolveFX.helpers.fitCanvas(
      canvas, window.innerWidth, window.innerHeight
    );
    // draw loop using CTFdSolveFX.config.color, etc.
    setTimeout(onDone, 3000);
  },
});
```
The celebration's sound is the admin's configured sound preset so you
don't need to handle audio yourself. If your preset wants a specific
sound, call `CTFdSolveFX.helpers.chime([...])` from
inside `celebration()`.

## Preview

`flow` and `matrix` presets: <br>

<image width="350px" src="./images/flow.gif">
<image width="350px" src="./images/matrix.gif">




## Solve detection

Four overlapping hooks (Response.prototype.json, window.fetch,
XMLHttpRequest, and CTFd.api.post_challenge_attempt) all watch for
`POST /api/v1/challenges/attempt` returning `data.status === "correct"`.
This layered approach survives CTFd's use of swagger-client, which
captures a fetch reference at module-load time and bypasses a plain
`window.fetch` patch.

## Testing without solving

Go to `/challanges/` -> preview challange and insert the flag and your effect should appear like in this gif demo:

Here we used `pulse` preset:

![alt text](/images/test.gif)

## Contributions

You can contribute fixes or new presets with a PR.