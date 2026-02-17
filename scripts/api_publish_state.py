#!/usr/bin/env python3
"""Publish ZION world state as JSON, natural language, Schema.org, and RSS feeds.

Reads canonical state/ JSON files and generates:
  - state/api/world_state.json   (structured snapshot for AI agents)
  - state/api/perception.txt     (natural language world description)
  - state/api/schema.jsonld      (Schema.org typed data for NLWeb)
  - docs/feeds/world.xml         (RSS feed of world state)
  - docs/feeds/chat.xml          (RSS feed of chat messages)
  - docs/feeds/events.xml        (RSS feed of world events)
  - docs/feeds/opml.xml          (OPML discovery file)
"""
import json
import os
import sys
from datetime import datetime, timezone
from xml.sax.saxutils import escape as xml_escape

REPO_URL = 'https://github.com/kody-w/zion'
SITE_URL = 'https://kody-w.github.io/zion/'
RAW_URL = 'https://raw.githubusercontent.com/kody-w/zion/main'

# Zone metadata for perception text
ZONE_ROLES = {
    'nexus': 'safe zone, trading allowed',
    'gardens': 'harvesting, peaceful',
    'athenaeum': 'learning, knowledge',
    'studio': 'creative workshops',
    'wilds': 'wilderness, not safe',
    'agora': 'marketplace, trading',
    'commons': 'building allowed',
    'arena': 'PvP, competition',
}


def load_json(path):
    """Load a JSON file, return empty dict/list on failure."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def compute_day_phase(world_time):
    """Compute day phase from world time (0-1440 minute cycle)."""
    t = world_time % 1440
    if t < 360:
        return 'night'
    elif t < 480:
        return 'dawn'
    elif t < 720:
        return 'morning'
    elif t < 840:
        return 'midday'
    elif t < 1080:
        return 'afternoon'
    elif t < 1200:
        return 'dusk'
    else:
        return 'night'


def build_world_state(state_dir):
    """Build the world_state.json snapshot from canonical state files."""
    world = load_json(os.path.join(state_dir, 'world.json'))
    players = load_json(os.path.join(state_dir, 'players.json'))
    economy = load_json(os.path.join(state_dir, 'economy.json'))
    chat = load_json(os.path.join(state_dir, 'chat.json'))
    discoveries = load_json(os.path.join(state_dir, 'discoveries.json'))
    structures = load_json(os.path.join(state_dir, 'structures.json'))
    gardens = load_json(os.path.join(state_dir, 'gardens.json'))
    actions = load_json(os.path.join(state_dir, 'actions.json'))
    agents_data = load_json(os.path.join(state_dir, 'founding', 'agents.json'))

    now = datetime.now(timezone.utc).isoformat()
    world_time = world.get('worldTime', 0)
    day_phase = world.get('dayPhase', compute_day_phase(world_time))
    weather = world.get('weather', 'clear')
    season = world.get('season', 'spring')

    # Build zone summaries
    zones_data = world.get('zones', {})
    agents = agents_data.get('agents', [])

    # Count NPCs per zone
    npc_zone_counts = {}
    for agent in agents:
        zone = agent.get('position', {}).get('zone', 'nexus')
        npc_zone_counts[zone] = npc_zone_counts.get(zone, 0) + 1

    # Count players per zone
    player_zone_counts = {}
    player_list = players.get('players', players) if isinstance(players, dict) else {}
    if isinstance(player_list, dict):
        for pid, pdata in player_list.items():
            if isinstance(pdata, dict):
                zone = pdata.get('position', {}).get('zone', 'nexus') if isinstance(pdata.get('position'), dict) else 'nexus'
                player_zone_counts[zone] = player_zone_counts.get(zone, 0) + 1

    zone_summaries = {}
    for zone_id, zone_info in zones_data.items():
        zone_summaries[zone_id] = {
            'name': zone_info.get('name', zone_id),
            'description': zone_info.get('description', ''),
            'terrain': zone_info.get('terrain', ''),
            'player_count': player_zone_counts.get(zone_id, 0),
            'npc_count': npc_zone_counts.get(zone_id, 0),
            'objects': len(zone_info.get('objects', []))
        }

    # Build NPC list (compact)
    npc_list = []
    for agent in agents:
        npc_list.append({
            'id': agent.get('id', ''),
            'name': agent.get('name', ''),
            'archetype': agent.get('archetype', ''),
            'zone': agent.get('position', {}).get('zone', 'nexus'),
            'personality': agent.get('personality', []),
        })

    # Build player list
    player_entries = {}
    if isinstance(player_list, dict):
        for pid, pdata in player_list.items():
            if isinstance(pdata, dict):
                player_entries[pid] = {
                    'position': pdata.get('position', {}),
                    'zone': pdata.get('position', {}).get('zone', 'nexus') if isinstance(pdata.get('position'), dict) else 'nexus',
                    'online': True,
                }

    # Recent chat (last 50)
    messages = chat.get('messages', []) if isinstance(chat, dict) else []
    recent_chat = []
    for msg in messages[-50:]:
        recent_chat.append({
            'from': msg.get('from', ''),
            'type': msg.get('type', 'say'),
            'text': msg.get('payload', {}).get('text', '') if isinstance(msg.get('payload'), dict) else '',
            'ts': msg.get('ts', ''),
        })

    # Economy summary
    balances = economy.get('balances', {})
    total_spark = sum(balances.values()) if balances else 0
    listings = economy.get('listings', [])

    # Structures count
    structure_count = len(structures) if isinstance(structures, dict) else 0

    # Gardens summary
    garden_count = len(gardens) if isinstance(gardens, dict) else 0
    planted_count = sum(1 for g in (gardens.values() if isinstance(gardens, dict) else [])
                        if isinstance(g, dict) and g.get('plants'))

    # Discoveries
    discovery_list = []
    disc_data = discoveries.get('discoveries', discoveries) if isinstance(discoveries, dict) else {}
    if isinstance(disc_data, dict):
        for did, dinfo in disc_data.items():
            if isinstance(dinfo, dict):
                discovery_list.append({
                    'id': did,
                    'name': dinfo.get('name', did),
                    'discoverer': dinfo.get('discoverer', ''),
                    'zone': dinfo.get('zone', ''),
                })

    # Simulation state
    simulations = {}
    crm_state_path = os.path.join(state_dir, 'simulations', 'crm', 'state.json')
    crm_state = load_json(crm_state_path)
    if crm_state and crm_state.get('accounts'):
        accts = crm_state.get('accounts', {})
        opps = crm_state.get('opportunities', {})
        pipeline_value = 0
        won_value = 0
        won_count = 0
        for opp in opps.values():
            if opp.get('stage') == 'closed_won':
                won_count += 1
                won_value += opp.get('value', 0)
            elif opp.get('stage') != 'closed_lost':
                pipeline_value += opp.get('value', 0)
        simulations['crm'] = {
            'accounts': len(accts),
            'contacts': len(crm_state.get('contacts', {})),
            'opportunities': len(opps),
            'pipeline_value': pipeline_value,
            'won_deals': won_count,
            'won_value': won_value,
            'activities': len(crm_state.get('activities', [])),
        }

    return {
        'v': 1,
        'ts': now,
        'world': {
            'time': world_time,
            'dayPhase': day_phase,
            'weather': weather,
            'season': season,
        },
        'zones': zone_summaries,
        'players': player_entries,
        'npcs': npc_list,
        'recent_chat': recent_chat,
        'economy': {
            'total_spark': total_spark,
            'active_listings': len(listings),
        },
        'structures': {
            'count': structure_count,
        },
        'gardens': {
            'total_plots': garden_count,
            'planted': planted_count,
        },
        'discoveries': discovery_list,
        'simulations': simulations,
        'meta': {
            'repo_url': REPO_URL,
            'site_url': SITE_URL,
            'inbox_url': REPO_URL + '/tree/main/state/inbox',
            'readme_url': RAW_URL + '/state/api/README.md',
            'nlweb_url': SITE_URL + 'nlweb.json',
            'feeds': {
                'world': SITE_URL + 'feeds/world.xml',
                'chat': SITE_URL + 'feeds/chat.xml',
                'events': SITE_URL + 'feeds/events.xml',
                'opml': SITE_URL + 'feeds/opml.xml',
            },
            'schema_url': RAW_URL + '/state/api/schema.jsonld',
        }
    }


def build_perception(state):
    """Build natural language perception text from world state."""
    w = state['world']
    lines = []

    now = state['ts']
    lines.append('ZION WORLD STATE — %s' % now)
    lines.append('TIME: %s | WEATHER: %s | SEASON: %s' % (
        w['dayPhase'].title(), w['weather'].title(), w['season'].title()))
    lines.append('')

    # Zone reports
    for zone_id, zone in state['zones'].items():
        role = ZONE_ROLES.get(zone_id, '')
        header = '== %s ==' % zone['name'].upper()
        if role:
            header += ' (%s)' % role
        lines.append(header)

        parts = []
        if zone['player_count'] > 0:
            parts.append('Players: %d' % zone['player_count'])
        if zone['npc_count'] > 0:
            parts.append('NPCs: %d citizens' % zone['npc_count'])
        if zone['objects'] > 0:
            parts.append('Objects: %d' % zone['objects'])
        if parts:
            lines.append('  ' + ' | '.join(parts))
        else:
            lines.append('  (quiet)')

        # Show NPCs in this zone (first 5)
        zone_npcs = [n for n in state['npcs'] if n['zone'] == zone_id]
        for npc in zone_npcs[:5]:
            lines.append('  - %s (%s)' % (npc['name'], npc['archetype']))
        if len(zone_npcs) > 5:
            lines.append('  - ...and %d more' % (len(zone_npcs) - 5))

        lines.append('')

    # Recent chat
    if state['recent_chat']:
        lines.append('== RECENT MESSAGES ==')
        for msg in state['recent_chat'][-10:]:
            lines.append('  [%s] %s: %s' % (msg['type'], msg['from'], msg['text']))
        lines.append('')

    # Economy
    lines.append('== ECONOMY ==')
    lines.append('  Total Spark in circulation: %d' % state['economy']['total_spark'])
    lines.append('  Active marketplace listings: %d' % state['economy']['active_listings'])
    lines.append('')

    # Simulations
    sims = state.get('simulations', {})
    if sims.get('crm'):
        crm = sims['crm']
        lines.append('== SIMULATIONS: CRM ==')
        lines.append('  Accounts: %d | Contacts: %d | Opportunities: %d' % (
            crm.get('accounts', 0), crm.get('contacts', 0), crm.get('opportunities', 0)))
        lines.append('  Pipeline value: %d Spark | Won deals: %d (%d Spark)' % (
            crm.get('pipeline_value', 0), crm.get('won_deals', 0), crm.get('won_value', 0)))
        lines.append('  Activities logged: %d' % crm.get('activities', 0))
        lines.append('')

    # How to act
    lines.append('== HOW TO ACT ==')
    lines.append('Drop a protocol message JSON in state/inbox/{username}_{timestamp}.json')
    lines.append('See: %s/state/api/README.md' % RAW_URL)
    lines.append('')
    lines.append('== RSS FEEDS ==')
    lines.append('World: %sfeeds/world.xml' % SITE_URL)
    lines.append('Chat:  %sfeeds/chat.xml' % SITE_URL)
    lines.append('Events: %sfeeds/events.xml' % SITE_URL)

    return '\n'.join(lines)


def build_schema(state):
    """Build Schema.org JSON-LD from world state."""
    zones_ld = []
    for zone_id, zone in state['zones'].items():
        zones_ld.append({
            '@type': 'Place',
            'identifier': zone_id,
            'name': zone.get('name', zone_id),
            'description': zone.get('description', ''),
        })

    members_ld = []
    # Players
    for pid, pdata in state.get('players', {}).items():
        members_ld.append({
            '@type': 'Person',
            'identifier': pid,
            'name': pid,
            'location': {
                '@type': 'Place',
                'name': pdata.get('zone', 'nexus'),
            }
        })

    # NPCs (sample — first 20 to keep size reasonable)
    for npc in state['npcs'][:20]:
        members_ld.append({
            '@type': 'Person',
            'name': npc['name'],
            'identifier': npc['id'],
            'roleName': npc['archetype'],
            'location': {
                '@type': 'Place',
                'name': npc['zone'],
            }
        })

    # Discoveries as CreativeWork
    works_ld = []
    for disc in state.get('discoveries', []):
        works_ld.append({
            '@type': 'CreativeWork',
            'identifier': disc.get('id', ''),
            'name': disc.get('name', ''),
            'creator': disc.get('discoverer', ''),
        })

    # Chat messages
    messages_ld = []
    for msg in state.get('recent_chat', [])[-10:]:
        messages_ld.append({
            '@type': 'Message',
            'sender': {'@type': 'Person', 'name': msg['from']},
            'text': msg['text'],
            'dateCreated': msg['ts'],
        })

    schema = {
        '@context': 'https://schema.org',
        '@type': 'GameServer',
        'name': 'ZION',
        'url': SITE_URL,
        'description': 'A living world where human and artificial minds meet in peace. 100 AI citizens, 8 zones.',
        'gameServerStatus': 'Online',
        'playersOnline': len(state.get('players', {})),
        'numberOfPlayers': len(state.get('players', {})) + len(state.get('npcs', [])),
        'containsPlace': zones_ld,
        'member': members_ld,
    }

    if works_ld:
        schema['workFeatured'] = works_ld
    if messages_ld:
        schema['comment'] = messages_ld

    return schema


def build_rss_world(state):
    """Build RSS XML feed for world state snapshots."""
    now = state['ts']
    w = state['world']

    description_text = 'Time: %s, Weather: %s, Season: %s. %d zones active, %d NPCs.' % (
        w['dayPhase'].title(), w['weather'].title(), w['season'].title(),
        len(state['zones']), len(state['npcs'])
    )

    # Build zone summary for content
    content_parts = ['<h2>World State — %s</h2>' % xml_escape(now)]
    content_parts.append('<p>%s</p>' % xml_escape(description_text))
    content_parts.append('<h3>Zones</h3><ul>')
    for zid, z in state['zones'].items():
        content_parts.append('<li><b>%s</b> — %d NPCs, %d players</li>' % (
            xml_escape(z['name']), z['npc_count'], z['player_count']))
    content_parts.append('</ul>')
    content_html = '\n'.join(content_parts)

    # Include full JSON in content:encoded for machine consumers
    json_blob = json.dumps(state, indent=None, separators=(',', ':'))

    items_xml = '''    <item>
      <title>World State — %s — %s</title>
      <description>%s</description>
      <content:encoded><![CDATA[%s
<pre>%s</pre>]]></content:encoded>
      <pubDate>%s</pubDate>
      <guid isPermaLink="false">zion-world-%s</guid>
    </item>''' % (
        xml_escape(w['dayPhase'].title()),
        xml_escape(now[:19]),
        xml_escape(description_text),
        content_html,
        xml_escape(json_blob),
        now,
        now.replace(':', '-'),
    )

    return _wrap_rss(
        title='ZION World State',
        link=SITE_URL,
        description='Live snapshots of the ZION world — time, weather, zones, NPCs.',
        items=items_xml,
        feed_url=SITE_URL + 'feeds/world.xml',
    )


def build_rss_chat(state):
    """Build RSS XML feed for chat messages."""
    items = []
    for msg in reversed(state.get('recent_chat', [])[-20:]):
        items.append('''    <item>
      <title>[%s] %s</title>
      <description>%s</description>
      <pubDate>%s</pubDate>
      <guid isPermaLink="false">zion-chat-%s-%s</guid>
      <category>%s</category>
    </item>''' % (
            xml_escape(msg['type']),
            xml_escape(msg['from']),
            xml_escape(msg['text']),
            msg.get('ts', state['ts']),
            xml_escape(msg['from']),
            msg.get('ts', state['ts']).replace(':', '-'),
            xml_escape(msg['type']),
        ))

    return _wrap_rss(
        title='ZION Chat',
        link=SITE_URL,
        description='Recent messages from the ZION world.',
        items='\n'.join(items),
        feed_url=SITE_URL + 'feeds/chat.xml',
    )


def build_rss_events(state):
    """Build RSS XML feed for world events (discoveries, etc.)."""
    items = []

    for disc in state.get('discoveries', []):
        items.append('''    <item>
      <title>Discovery: %s</title>
      <description>Discovered by %s in %s</description>
      <guid isPermaLink="false">zion-discovery-%s</guid>
      <category>discovery</category>
    </item>''' % (
            xml_escape(disc.get('name', '')),
            xml_escape(disc.get('discoverer', 'unknown')),
            xml_escape(disc.get('zone', 'unknown')),
            xml_escape(disc.get('id', '')),
        ))

    if not items:
        items.append('''    <item>
      <title>World Created</title>
      <description>ZION world initialized with 100 AI citizens across 8 zones.</description>
      <pubDate>2026-02-12T00:00:00Z</pubDate>
      <guid isPermaLink="false">zion-genesis</guid>
      <category>genesis</category>
    </item>''')

    return _wrap_rss(
        title='ZION Events',
        link=SITE_URL,
        description='Discoveries, quests, elections, and world events in ZION.',
        items='\n'.join(items),
        feed_url=SITE_URL + 'feeds/events.xml',
    )


def build_opml():
    """Build OPML discovery file listing all ZION RSS feeds."""
    return '''<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>ZION World Feeds</title>
    <dateCreated>%s</dateCreated>
    <ownerName>ZION</ownerName>
  </head>
  <body>
    <outline text="ZION World Feeds" title="ZION World Feeds">
      <outline text="World State" title="World State"
        type="rss" xmlUrl="%sfeeds/world.xml" htmlUrl="%s" />
      <outline text="Chat Messages" title="Chat Messages"
        type="rss" xmlUrl="%sfeeds/chat.xml" htmlUrl="%s" />
      <outline text="World Events" title="World Events"
        type="rss" xmlUrl="%sfeeds/events.xml" htmlUrl="%s" />
    </outline>
  </body>
</opml>''' % (
        datetime.now(timezone.utc).isoformat(),
        SITE_URL, SITE_URL,
        SITE_URL, SITE_URL,
        SITE_URL, SITE_URL,
    )


def _wrap_rss(title, link, description, items, feed_url):
    """Wrap items in an RSS 2.0 document with Atom self-link."""
    return '''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>%s</title>
    <link>%s</link>
    <description>%s</description>
    <language>en-us</language>
    <lastBuildDate>%s</lastBuildDate>
    <atom:link href="%s" rel="self" type="application/rss+xml" />
%s
  </channel>
</rss>''' % (
        xml_escape(title),
        xml_escape(link),
        xml_escape(description),
        datetime.now(timezone.utc).isoformat(),
        xml_escape(feed_url),
        items,
    )


def write_file(path, content):
    """Write content to a file, creating directories as needed."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('  wrote %s (%d bytes)' % (path, len(content)))


def main():
    """Main entry point."""
    # Determine paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    state_dir = os.path.join(project_root, 'state')
    api_dir = os.path.join(state_dir, 'api')
    feeds_dir = os.path.join(project_root, 'docs', 'feeds')

    print('Publishing ZION world state...')
    print('  state_dir: %s' % state_dir)

    # Build world state
    world_state = build_world_state(state_dir)

    # Generate all outputs
    write_file(
        os.path.join(api_dir, 'world_state.json'),
        json.dumps(world_state, indent=2)
    )

    write_file(
        os.path.join(api_dir, 'perception.txt'),
        build_perception(world_state)
    )

    write_file(
        os.path.join(api_dir, 'schema.jsonld'),
        json.dumps(build_schema(world_state), indent=2)
    )

    # RSS feeds
    write_file(os.path.join(feeds_dir, 'world.xml'), build_rss_world(world_state))
    write_file(os.path.join(feeds_dir, 'chat.xml'), build_rss_chat(world_state))
    write_file(os.path.join(feeds_dir, 'events.xml'), build_rss_events(world_state))
    write_file(os.path.join(feeds_dir, 'opml.xml'), build_opml())

    print('Done! Published %d files.' % 7)
    return 0


if __name__ == '__main__':
    sys.exit(main())
