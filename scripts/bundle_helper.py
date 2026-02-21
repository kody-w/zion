#!/usr/bin/env python3
"""Bundle helper: create single HTML file from source components."""
import sys
import os


# JavaScript files in dependency order
JS_FILES = [
    'protocol.js',
    'zones.js',
    'economy.js',
    'economy_viz.js',
    'inventory.js',
    'trading.js',
    'state.js',
    'replay.js',
    'yaml_dash.js',
    'intentions.js',
    'social.js',
    'creation.js',
    'quests.js',
    'competition.js',
    'exploration.js',
    'anchors.js',
    'physical.js',
    'guilds.js',
    'mentoring.js',
    'models.js',
    'auth.js',
    'network.js',
    'federation.js',
    'api_bridge.js',
    'sim_crm.js',
    'world.js',
    'timelapse.js',
    'input.js',
    'hud.js',
    'xr.js',
    'audio.js',
    'npc_dialogue.js',
    'npc_ai.js',
    'npcs.js',
    'seasons.js',
    'pets.js',
    'main.js'
]

# CSS files in order
CSS_FILES = [
    'tokens.css',
    'layout.css',
    'hud.css',
    'world.css'
]


def read_file_safe(filepath):
    """Read file content safely, return empty string if not found."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Warning: File not found: {filepath}", file=sys.stderr)
        return ''
    except Exception as e:
        print(f"Error reading {filepath}: {e}", file=sys.stderr)
        return ''


def bundle_css(src_dir):
    """Read and concatenate all CSS files."""
    css_dir = os.path.join(src_dir, 'css')
    css_content = []

    for filename in CSS_FILES:
        filepath = os.path.join(css_dir, filename)
        content = read_file_safe(filepath)
        if content:
            css_content.append(f"/* {filename} */")
            css_content.append(content)
            css_content.append('')

    return '\n'.join(css_content)


def bundle_js(src_dir):
    """Read and concatenate all JavaScript files."""
    js_dir = os.path.join(src_dir, 'js')
    js_content = []

    # Load agents data for embedding in npcs.js
    project_root = os.path.dirname(src_dir)
    agents_path = os.path.join(project_root, 'state', 'founding', 'agents.json')
    agents_json = read_file_safe(agents_path)

    # Load souls data for embedding in main.js
    import json
    import glob
    souls_dir = os.path.join(project_root, 'state', 'souls')
    souls_data = []
    if os.path.isdir(souls_dir):
        for soul_file in sorted(glob.glob(os.path.join(souls_dir, '*.json'))):
            raw = read_file_safe(soul_file)
            if raw:
                try:
                    soul = json.loads(raw)
                    souls_data.append({
                        'id': soul['id'],
                        'name': soul.get('name', ''),
                        'archetype': soul.get('archetype', ''),
                        'intentions': soul.get('intentions', [])
                    })
                except Exception:
                    pass
    souls_compact = json.dumps(souls_data) if souls_data else '[]'

    for filename in JS_FILES:
        filepath = os.path.join(js_dir, filename)
        content = read_file_safe(filepath)
        if content:
            # Embed agents data in npcs.js
            if filename == 'npcs.js' and agents_json:
                try:
                    agents_data = json.loads(agents_json)
                    compact = json.dumps([{
                        'id': a['id'], 'name': a['name'], 'archetype': a['archetype'],
                        'position': a['position'], 'personality': a.get('personality', [])
                    } for a in agents_data.get('agents', [])])
                    content = content.replace('AGENTS_PLACEHOLDER', compact)
                except Exception as e:
                    print(f"Warning: Could not embed agents: {e}", file=sys.stderr)
                    content = content.replace('AGENTS_PLACEHOLDER', '[]')
            # Embed souls data in main.js
            if filename == 'main.js':
                content = content.replace('SOULS_PLACEHOLDER', souls_compact)
            js_content.append(f"// {filename}")
            js_content.append(content)
            js_content.append('')

    return '\n'.join(js_content)


def create_bundle(src_dir, output_path):
    """Create bundled HTML file."""
    html_template_path = os.path.join(src_dir, 'html', 'index.html')

    # Read template
    template = read_file_safe(html_template_path)

    if not template:
        # Create a minimal template if none exists
        template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZION MMO</title>
    <style>
/* INLINE_CSS */
    </style>
</head>
<body>
    <div id="app"></div>
    <script>
/* INLINE_JS */
    </script>
</body>
</html>"""

    # Bundle CSS and JS
    css_content = bundle_css(src_dir)
    js_content = bundle_js(src_dir)

    # Replace placeholders
    output_html = template.replace('/* INLINE_CSS */', css_content)
    output_html = output_html.replace('/* INLINE_JS */', js_content)

    # Write output
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(output_html)
        return True
    except Exception as e:
        print(f"Error writing output file: {e}", file=sys.stderr)
        return False


def main():
    """Main entry point."""
    if len(sys.argv) < 3:
        print("Usage: bundle_helper.py <src_dir> <output_file>", file=sys.stderr)
        sys.exit(1)

    src_dir = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.isdir(src_dir):
        print(f"Error: Source directory not found: {src_dir}", file=sys.stderr)
        sys.exit(1)

    success = create_bundle(src_dir, output_path)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
