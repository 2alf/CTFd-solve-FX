import json
import os

from flask import Blueprint, render_template, request, redirect, url_for

from CTFd.plugins import (
    register_plugin_assets_directory,
    register_plugin_script,
    register_plugin_stylesheet,
    register_admin_plugin_menu_bar,
)
from CTFd.utils import get_config, set_config
from CTFd.utils.decorators import admins_only

PLUGIN_NAME = "ctfd-solve-fx"
ASSET_BASE = f"/plugins/{PLUGIN_NAME}/assets/"

DEFAULTS = {
    "preset": "pulse",
    "color": "#25f325",
    "text_color": "#ffffff",
    "label": "S O L V E D",
    "sub": "FLAG ACCEPTED",
    "tag": "  ",
    "sound_enabled": True,
    "sound_preset": "chime",
    "max_duration_ms": 3500,
}

PRESETS_DIR = os.path.join(os.path.dirname(__file__), "assets", "presets")

def _discover_presets():
    try:
        names = [
            os.path.splitext(f)[0]
            for f in os.listdir(PRESETS_DIR)
            if f.endswith(".js") and not f.startswith("_")
        ]
    except FileNotFoundError:
        names = []
    return sorted(names)

AVAILABLE_SOUNDS = ["chime", "arcade", "fanfare", "bell", "retro", "descend"]


def _k(key):
    return f"solvefx_{key}"


def _load_config():
    out = {}
    for key, default in DEFAULTS.items():
        val = get_config(_k(key))
        if val is None:
            out[key] = default
        elif isinstance(default, bool):
            out[key] = str(val).lower() in ("true", "1", "yes", "on")
        elif isinstance(default, int):
            try:
                out[key] = int(val)
            except (ValueError, TypeError):
                out[key] = default
        else:
            out[key] = val
    return out


def _save_config(form):
    for key, default in DEFAULTS.items():
        if isinstance(default, bool):
            set_config(_k(key), key in form)
        else:
            val = form.get(key)
            if val is not None and val != "":
                set_config(_k(key), val)


def load(app):
    register_plugin_assets_directory(app, base_path=ASSET_BASE)
    register_plugin_stylesheet(ASSET_BASE + "solve-fx.css")
    register_plugin_script(f"/plugins/{PLUGIN_NAME}/config.js")
    register_plugin_script(ASSET_BASE + "solve-fx.js")

    presets = _discover_presets()

    for name in presets:
        register_plugin_script(ASSET_BASE + f"presets/{name}.js")

    bp = Blueprint(
        PLUGIN_NAME,
        __name__,
        template_folder="templates",
    )

    @bp.route(f"/plugins/{PLUGIN_NAME}/config.js")
    def config_js():
        payload = _load_config()
        body = "window.__CTFdSolveFXConfig=" + json.dumps(payload) + ";"
        return body, 200, {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-store",
        }

    @bp.route(f"/admin/plugins/{PLUGIN_NAME}", methods=["GET", "POST"])
    @admins_only
    def admin_page():
        if request.method == "POST":
            _save_config(request.form)
            return redirect(url_for(f"{PLUGIN_NAME}.admin_page"))
        return render_template(
            "solvefx_admin.html",
            config=_load_config(),
            presets=_discover_presets(),
            sounds=AVAILABLE_SOUNDS,
        )

    app.register_blueprint(bp)

    register_admin_plugin_menu_bar(
        title="Solve FX",
        route=f"/admin/plugins/{PLUGIN_NAME}",
    )
