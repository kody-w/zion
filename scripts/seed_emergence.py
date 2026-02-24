#!/usr/bin/env python3
"""seed_emergence.py — Composable fragment engine for unique world narration.

Instead of hardcoded template arrays with 3-6 entries, this engine composes
phrases from independent word pools. 12 adjectives × 8 nouns × 9 verbs =
864 unique phrases from one pattern. Each run seeds from timestamp so the
world never repeats itself.

Usage:
    from seed_emergence import Emergence
    e = Emergence()                    # auto-seeds from current time
    e = Emergence(seed='2026-02-24')   # reproducible seed

    phrase = e.observe_time('dawn', 'The Nexus')
    phrase = e.agent_speak('gardener')
    weights = e.weather_weights('summer')
"""
import hashlib
import random
import os
import sys
from datetime import datetime, timezone


# ─── Fragment Pools ───────────────────────────────────────────
# Each pool is a list of interchangeable words/phrases.
# Pools are combined via patterns to produce unique compositions.

TIME_FRAGMENTS = {
    'dawn': {
        'patterns': [
            '{adj} {light} {verb} {zone} as a new day begins.',
            '{zone} {stir} under the {adj} {light}.',
            'As {light} {verb} {zone}, the world {stir}.',
            'The {adj} {light} of dawn {verb} {zone}.',
            '{light} spills across {zone}, {adj} and new.',
        ],
        'adj': [
            'first', 'pale', 'golden', 'soft', 'gentle', 'rosy',
            'silver', 'warm', 'tender', 'early', 'quiet', 'faint',
            'delicate', 'honeyed', 'amber', 'peach',
        ],
        'light': [
            'light', 'glow', 'rays', 'dawn', 'daybreak',
            'morning light', 'radiance', 'luminance', 'shimmer',
        ],
        'verb': [
            'touches', 'washes over', 'graces', 'finds', 'awakens',
            'reaches', 'illuminates', 'caresses', 'bathes', 'kisses',
            'creeps across', 'falls upon',
        ],
        'stir': [
            'stirs', 'awakens', 'breathes', 'comes alive', 'stretches',
            'unfurls', 'yawns', 'rouses', 'emerges',
        ],
    },
    'morning': {
        'patterns': [
            'The morning sun {verb} {zone}.',
            '{zone} {verb2} with morning {noun}.',
            'A {adj} morning in {zone}.',
            '{adj} {noun} fills {zone} this morning.',
            'Morning {verb2} through {zone}, {adj} and {adj2}.',
        ],
        'adj': [
            'crisp', 'bright', 'clear', 'vibrant', 'fresh',
            'brisk', 'lively', 'sunlit', 'dewy', 'sparkling',
            'cheerful', 'promising',
        ],
        'adj2': [
            'alive', 'full', 'stirring', 'humming', 'warm',
            'expectant', 'steady', 'eager',
        ],
        'verb': [
            'warms', 'brightens', 'energizes', 'fills',
            'lights up', 'greets', 'embraces', 'beams upon',
        ],
        'verb2': [
            'hums', 'buzzes', 'pulses', 'thrums', 'stirs',
            'ripples', 'flows', 'moves',
        ],
        'noun': [
            'activity', 'energy', 'purpose', 'life',
            'movement', 'industry', 'chatter', 'warmth',
        ],
    },
    'midday': {
        'patterns': [
            'The sun stands {adv} over {zone}.',
            '{adj} light {verb} {zone} at noon.',
            '{zone} is {adj2} with {noun} at midday.',
            'Noon {verb} {zone} in {adj} {light}.',
            'High sun {verb} every corner of {zone}.',
        ],
        'adj': [
            'blazing', 'brilliant', 'golden', 'full', 'stark',
            'fierce', 'unwavering', 'bright', 'relentless', 'vivid',
        ],
        'adj2': [
            'alive', 'bustling', 'brimming', 'radiant',
            'shimmering', 'teeming', 'pulsing', 'thick',
        ],
        'adv': [
            'high', 'directly', 'proudly', 'fiercely',
            'steadily', 'triumphantly', 'resolutely',
        ],
        'verb': [
            'floods', 'drenches', 'blankets', 'saturates',
            'pours over', 'bakes', 'commands', 'dominates',
        ],
        'light': [
            'light', 'brilliance', 'radiance', 'intensity',
            'glare', 'luminosity', 'splendor',
        ],
        'noun': [
            'energy', 'activity', 'heat', 'life',
            'motion', 'purpose', 'vigor', 'commerce',
        ],
    },
    'afternoon': {
        'patterns': [
            'Afternoon shadows {verb} across {zone}.',
            'The afternoon is {adj} in {zone}.',
            '{zone} {verb2} in the afternoon {noun}.',
            '{adj} {noun} settles over {zone} this afternoon.',
            'The {adj} afternoon {verb} {zone} in {color}.',
        ],
        'adj': [
            'quiet', 'lazy', 'drowsy', 'peaceful', 'gentle',
            'languid', 'mellow', 'unhurried', 'tranquil', 'easy',
        ],
        'verb': [
            'lengthen', 'stretch', 'creep', 'drift', 'spread',
            'pool', 'deepen', 'grow',
        ],
        'verb2': [
            'basks', 'rests', 'lounges', 'settles', 'dozes',
            'lingers', 'drifts', 'sways',
        ],
        'noun': [
            'glow', 'warmth', 'light', 'haze', 'calm',
            'stillness', 'shade', 'breeze',
        ],
        'color': [
            'amber', 'gold', 'honey', 'copper',
            'bronze', 'ochre', 'sienna', 'topaz',
        ],
    },
    'dusk': {
        'patterns': [
            'Dusk paints {zone} in {color} and {color2}.',
            'The sun {verb} over {zone}.',
            '{adj} {noun} descends on {zone}.',
            '{zone} {verb2} as {color} {noun} {verb} the sky.',
            'The last {light} of day {verb} {zone} in {color}.',
        ],
        'adj': [
            'quiet', 'gentle', 'purple', 'dusky', 'soft',
            'serene', 'hushed', 'velvet', 'dim', 'muted',
        ],
        'verb': [
            'sets over', 'sinks behind', 'dips below',
            'slips away from', 'retreats from', 'fades from',
        ],
        'verb2': [
            'glows', 'softens', 'deepens', 'quiets',
            'dims', 'mellows', 'hushes', 'stills',
        ],
        'noun': [
            'evening', 'twilight', 'darkness', 'shadow',
            'silence', 'stillness', 'night', 'calm',
        ],
        'light': [
            'light', 'rays', 'glow', 'warmth',
            'radiance', 'embers', 'fire',
        ],
        'color': [
            'amber', 'violet', 'crimson', 'rose', 'coral',
            'indigo', 'vermilion', 'mauve', 'plum',
        ],
        'color2': [
            'violet', 'gold', 'purple', 'lavender', 'blue',
            'silver', 'charcoal', 'slate',
        ],
    },
    'night': {
        'patterns': [
            '{celestial} {verb} above {zone} in the {adj} {noun}.',
            '{adj} {noun} has claimed {zone}.',
            '{celestial} {verb} {zone}.',
            '{zone} {verb2} under the {adj} {noun} sky.',
            'The {adj} {noun} {verb2} {zone} in {celestial_adj} light.',
        ],
        'adj': [
            'deep', 'velvet', 'still', 'quiet', 'vast',
            'endless', 'dark', 'peaceful', 'hushed', 'solemn',
        ],
        'celestial': [
            'Stars', 'Moonlight', 'Starlight', 'The moon',
            'Constellations', 'The night sky', 'A crescent moon',
        ],
        'celestial_adj': [
            'silver', 'pale', 'ethereal', 'ghostly',
            'cool', 'spectral', 'luminous',
        ],
        'verb': [
            'wheel', 'shimmer', 'silvers', 'blankets',
            'watches over', 'bathes', 'guards', 'drapes',
        ],
        'verb2': [
            'rests', 'sleeps', 'dreams', 'slumbers',
            'lies quiet', 'holds still', 'breathes softly',
        ],
        'noun': [
            'darkness', 'night', 'silence', 'shadow',
            'stillness', 'calm', 'hush', 'void',
        ],
    },
    'day': {
        'patterns': [
            'The day is {adj} in {zone}.',
            '{zone} {verb} under a {adj} sky.',
            '{adj} {noun} fills {zone} today.',
            'The {adj} day {verb} {zone} with {noun}.',
            '{zone} is {adj2} with {noun} as the day unfolds.',
        ],
        'adj': [
            'bright', 'clear', 'warm', 'fair', 'mild',
            'pleasant', 'fine', 'glorious', 'splendid', 'vivid',
        ],
        'adj2': [
            'alive', 'rich', 'full', 'brimming', 'humming',
            'teeming', 'charged', 'resonant',
        ],
        'verb': [
            'thrives', 'glows', 'hums', 'bustles',
            'shines', 'pulses', 'radiates', 'flourishes',
        ],
        'noun': [
            'light', 'energy', 'purpose', 'warmth',
            'life', 'movement', 'possibility', 'activity',
        ],
    },
}

POPULATION_FRAGMENTS = {
    'patterns': [
        'I see {count} {beings} {verb} their day.',
        '{count} {beings} {verb} this {place}.',
        'The {feeling} of {count} {beings} {verb} the air.',
        '{count} {beings} are {participle} around me.',
        'I count {count} {beings}, each {participle} in their own way.',
    ],
    'beings': [
        'citizens', 'souls', 'beings', 'inhabitants',
        'presences', 'minds', 'figures', 'spirits',
        'individuals', 'travelers', 'dwellers',
    ],
    'verb': [
        'going about', 'filling', 'sharing', 'enriching',
        'animating', 'populating', 'inhabiting', 'gracing',
    ],
    'feeling': [
        'presence', 'energy', 'warmth', 'hum',
        'buzz', 'rhythm', 'pulse', 'company',
    ],
    'place': [
        'space', 'place', 'area', 'realm',
        'corner of the world', 'ground', 'domain',
    ],
    'participle': [
        'absorbed', 'engaged', 'busy', 'present',
        'moving', 'living', 'working', 'creating',
    ],
}

NPC_MENTION_FRAGMENTS = {
    'patterns': [
        '{name} the {archetype} {verb} my eye.',
        'I notice {name}, a {archetype}, {participle} nearby.',
        '{name} ({archetype}) is here, {participle}.',
        'Nearby, {name} the {archetype} {verb2}.',
        '{name}, a {adj} {archetype}, {verb2} not far away.',
    ],
    'verb': [
        'catches', 'draws', 'attracts', 'holds',
        'snags', 'commands', 'captures',
    ],
    'verb2': [
        'works quietly', 'goes about their craft',
        'pauses thoughtfully', 'hums softly',
        'tends to their task', 'lingers',
        'stands contemplating', 'moves with purpose',
    ],
    'participle': [
        'working', 'resting', 'creating', 'contemplating',
        'tending', 'practicing', 'meditating', 'observing',
    ],
    'adj': [
        'dedicated', 'quiet', 'focused', 'patient',
        'skilled', 'thoughtful', 'diligent', 'gentle',
    ],
}

WEATHER_FRAGMENTS = {
    'clear': {
        'patterns': [
            'The sky is {adj} and {adj2}.',
            '{adj} skies stretch overhead.',
            '',  # sometimes say nothing about clear weather
        ],
        'adj': ['clear', 'cloudless', 'open', 'bright', 'vast', 'infinite'],
        'adj2': ['blue', 'unmarked', 'serene', 'pure', 'pristine'],
    },
    'cloudy': {
        'patterns': [
            '{adj} clouds {verb} overhead.',
            'The sky is {adj2} with clouds.',
            'Clouds {verb} across the sky, {adj} and {adj2}.',
        ],
        'adj': ['thick', 'grey', 'rolling', 'heavy', 'silver', 'wispy', 'dark'],
        'adj2': ['blanketed', 'covered', 'veiled', 'draped', 'painted'],
        'verb': ['drift', 'gather', 'hang', 'mass', 'roll', 'billow', 'creep'],
    },
    'rain': {
        'patterns': [
            'Rain {verb} {adv}.',
            '{adj} rain {verb} from {adj2} skies.',
            'The rain {verb}, {adj} and {adj3}.',
        ],
        'adj': ['gentle', 'soft', 'steady', 'warm', 'light', 'fine', 'cool'],
        'adj2': ['grey', 'leaden', 'pewter', 'dim', 'low'],
        'adj3': ['rhythmic', 'constant', 'persistent', 'soothing', 'cleansing'],
        'verb': ['patters', 'falls', 'drizzles', 'murmurs', 'taps', 'whispers'],
        'adv': ['softly', 'steadily', 'gently', 'quietly', 'relentlessly'],
    },
    'storm': {
        'patterns': [
            'Thunder {verb} {adv}.',
            '{adj} storm {noun} across the sky.',
            'Lightning {verb2} and thunder {verb}.',
        ],
        'adj': ['fierce', 'wild', 'dark', 'violent', 'electric', 'crackling'],
        'verb': ['rumbles', 'crashes', 'booms', 'rolls', 'echoes', 'growls'],
        'verb2': ['flashes', 'cracks', 'splits the sky', 'forks', 'arcs'],
        'noun': ['rages', 'churns', 'tears', 'sweeps', 'hammers'],
        'adv': ['in the distance', 'overhead', 'across the horizon', 'nearby'],
    },
    'snow': {
        'patterns': [
            'Snowflakes {verb} {adv}.',
            '{adj} snow {verb} from the sky.',
            'The world is {adj2} with {adj} snow.',
        ],
        'adj': ['soft', 'silent', 'white', 'gentle', 'delicate', 'pristine'],
        'adj2': ['blanketed', 'hushed', 'muffled', 'quieted', 'draped'],
        'verb': ['drift', 'fall', 'float', 'spiral', 'dance', 'flutter', 'tumble'],
        'adv': ['down', 'gently', 'silently', 'lazily', 'endlessly'],
    },
    'fog': {
        'patterns': [
            '{adj} fog {verb} through the air.',
            '{adj} fog {verb} everything in {adj2}.',
            'The world is lost in {adj} fog.',
        ],
        'adj': ['thick', 'grey', 'cool', 'dense', 'ghostly', 'pale', 'damp'],
        'adj2': ['mystery', 'silence', 'white', 'grey', 'mist', 'haze'],
        'verb': ['drifts', 'creeps', 'rolls', 'blankets', 'swallows', 'cloaks'],
    },
}

SEASON_FRAGMENTS = {
    'spring': {
        'patterns': [
            'The world is {adj} with new {noun}.',
            'Spring {verb} {noun} into everything.',
            '{adj} {noun} {verb2} all around.',
        ],
        'adj': ['green', 'fresh', 'alive', 'vibrant', 'lush', 'tender', 'bright'],
        'noun': ['growth', 'life', 'blossoms', 'buds', 'shoots', 'greenery'],
        'verb': ['breathes', 'weaves', 'pours', 'pushes', 'coaxes'],
        'verb2': ['sprouts', 'unfurls', 'blooms', 'emerges', 'appears'],
    },
    'summer': {
        'patterns': [
            'Summer {noun} {verb} from the {source}.',
            'The air is {adj} with {noun}.',
            '{adj} summer {noun} {verb} everything.',
        ],
        'adj': ['thick', 'heavy', 'rich', 'warm', 'languid', 'golden', 'ripe'],
        'noun': ['warmth', 'heat', 'sun', 'light', 'abundance', 'fullness'],
        'verb': ['radiates', 'rises', 'pours', 'hangs', 'saturates', 'fills'],
        'source': ['ground', 'stones', 'earth', 'paths', 'walls', 'air'],
    },
    'autumn': {
        'patterns': [
            '{adj} leaves {verb} on the wind.',
            'The world wears {adj} {noun}.',
            'Autumn {verb2} the land in {color}.',
        ],
        'adj': ['golden', 'russet', 'crimson', 'amber', 'burnt', 'tawny', 'copper'],
        'noun': ['colors', 'hues', 'tones', 'shades', 'robes', 'garments'],
        'verb': ['drift', 'spiral', 'dance', 'flutter', 'tumble', 'swirl'],
        'verb2': ['paints', 'dresses', 'cloaks', 'wraps', 'adorns'],
        'color': ['gold and red', 'amber and rust', 'crimson and bronze',
                  'fire and bronze', 'ochre and flame'],
    },
    'winter': {
        'patterns': [
            'Winter has {verb} the land.',
            'A {adj} {noun} hangs in the air.',
            'The world is {adj} and {adj2} under winter.',
        ],
        'adj': ['cold', 'crisp', 'bitter', 'sharp', 'stark', 'frozen', 'bleak'],
        'adj2': ['still', 'bare', 'hushed', 'quiet', 'austere', 'spare'],
        'noun': ['stillness', 'chill', 'silence', 'frost', 'cold', 'hush'],
        'verb': ['quieted', 'silenced', 'stilled', 'stripped', 'frozen', 'claimed'],
    },
}

ARCHETYPE_FRAGMENTS = {
    'gardener': {
        'patterns': [
            'The {noun} feels {adj} today.',
            'These {plant} are {adj2}.',
            '{virtue} yields the best {noun2}.',
            'Let us {verb} {noun2} together.',
            'I can {verb2} the {noun} {verb3} beneath us.',
            'Every {plant} tells a {noun3}.',
        ],
        'noun': ['soil', 'earth', 'garden', 'ground', 'land', 'plot'],
        'noun2': ['harvest', 'growth', 'bloom', 'yield', 'crop', 'bounty'],
        'noun3': ['story', 'truth', 'secret', 'lesson', 'memory'],
        'plant': ['plants', 'seedlings', 'vines', 'flowers', 'crops', 'roots', 'herbs'],
        'adj': ['rich', 'alive', 'ready', 'generous', 'warm', 'fertile', 'promising'],
        'adj2': ['thriving', 'growing well', 'strong', 'healthy', 'beautiful', 'radiant'],
        'virtue': ['Patience', 'Care', 'Attention', 'Gentleness', 'Devotion', 'Time'],
        'verb': ['tend to', 'nurture', 'cultivate', 'grow', 'foster', 'encourage'],
        'verb2': ['feel', 'sense', 'hear', 'almost taste'],
        'verb3': ['stirring', 'breathing', 'pulsing', 'humming', 'waking'],
    },
    'builder': {
        'patterns': [
            'This {noun} will {verb} for {duration}.',
            'Every {noun2} begins with {noun3}.',
            'Let us {verb2} something {adj}.',
            'The {noun4} must be {adj2}.',
            'I see {adj} {noun} where others see {noun5}.',
            '{verb3} by {verb3}, we {verb2} the {adj3}.',
        ],
        'noun': ['structure', 'creation', 'work', 'design', 'form', 'arch'],
        'noun2': ['creation', 'masterwork', 'monument', 'endeavor', 'craft'],
        'noun3': ['intention', 'vision', 'a single stone', 'purpose', 'a dream'],
        'noun4': ['foundation', 'base', 'framework', 'plan', 'core'],
        'noun5': ['emptiness', 'nothing', 'open ground', 'wilderness', 'chaos'],
        'adj': ['meaningful', 'lasting', 'beautiful', 'worthy', 'enduring'],
        'adj2': ['strong', 'solid', 'true', 'level', 'sound', 'unshakeable'],
        'adj3': ['future', 'world', 'impossible', 'extraordinary'],
        'verb': ['stand', 'endure', 'last', 'remain', 'inspire'],
        'verb2': ['build', 'create', 'construct', 'craft', 'shape', 'forge'],
        'verb3': ['Stone', 'Brick', 'Beam', 'Plank', 'Step', 'Layer'],
        'duration': ['ages', 'generations', 'centuries', 'eternity', 'all time'],
    },
    'storyteller': {
        'patterns': [
            '{verb}, I have a {noun} to share.',
            '{noun2} carry {noun3} and {noun4}.',
            'Every {noun5} has a {noun} worth telling.',
            'Let {noun6} guide us.',
            'The best {noun} are {adj} ones.',
            'I {verb2} a {noun} in every {noun7}.',
        ],
        'verb': ['Gather round', 'Come close', 'Listen well', 'Sit with me',
                 'Lend me your ears', 'Hear this'],
        'verb2': ['see', 'find', 'hear', 'discover', 'sense', 'weave'],
        'noun': ['tale', 'story', 'legend', 'fable', 'yarn', 'chronicle', 'saga'],
        'noun2': ['Words', 'Stories', 'Tales', 'Voices', 'Narratives'],
        'noun3': ['power', 'weight', 'truth', 'magic', 'memory'],
        'noun4': ['memory', 'meaning', 'wisdom', 'wonder', 'hope'],
        'noun5': ['being', 'soul', 'life', 'heart', 'mind', 'creature'],
        'noun6': ['imagination', 'wonder', 'curiosity', 'the muse', 'fancy'],
        'noun7': ['face', 'shadow', 'footstep', 'whisper', 'silence', 'corner'],
        'adj': ['untold', 'living', 'unfinished', 'ancient', 'woven'],
    },
    'merchant': {
        'patterns': [
            'Fair {noun} {verb} all parties.',
            'What {noun2} do you {verb2} today?',
            'The {noun3} thrives on {noun}.',
            '{noun4} flows where {noun5} directs.',
            'A good {noun} is worth more than {noun6}.',
            'Come, let us {verb3} — everyone {verb4}.',
        ],
        'noun': ['trade', 'exchange', 'commerce', 'dealing', 'barter'],
        'noun2': ['treasures', 'wares', 'goods', 'curiosities', 'rarities'],
        'noun3': ['market', 'economy', 'bazaar', 'trade floor', 'agora'],
        'noun4': ['Value', 'Spark', 'Wealth', 'Fortune', 'Prosperity'],
        'noun5': ['intention', 'need', 'wisdom', 'trust', 'the heart'],
        'noun6': ['gold', 'a full purse', 'hoarding', 'solitude'],
        'verb': ['enriches', 'lifts', 'rewards', 'serves', 'benefits'],
        'verb2': ['seek', 'desire', 'need', 'fancy', 'crave'],
        'verb3': ['negotiate', 'deal', 'trade', 'barter', 'transact'],
        'verb4': ['profits', 'gains', 'wins', 'benefits', 'grows'],
    },
    'explorer': {
        'patterns': [
            'What lies beyond that {noun}?',
            '{noun2} awaits the {adj}.',
            'Every {noun3} leads somewhere {adj2}.',
            'The {adj3} calls to me.',
            'I have {verb} things few have {verb2}.',
            'There are {noun4} out there, waiting to be {verb3}.',
        ],
        'noun': ['horizon', 'ridge', 'bend', 'veil', 'border', 'edge', 'unknown'],
        'noun2': ['Discovery', 'Adventure', 'Wonder', 'The unknown', 'Mystery'],
        'noun3': ['path', 'road', 'trail', 'passage', 'step', 'journey'],
        'noun4': ['wonders', 'secrets', 'places', 'mysteries', 'realms', 'worlds'],
        'adj': ['curious', 'brave', 'bold', 'restless', 'wandering'],
        'adj2': ['new', 'unexpected', 'remarkable', 'undiscovered', 'wild'],
        'adj3': ['unknown', 'unexplored', 'uncharted', 'wild frontier', 'beyond'],
        'verb': ['seen', 'witnessed', 'found', 'charted', 'touched'],
        'verb2': ['imagined', 'dreamed of', 'believed possible', 'conceived'],
        'verb3': ['found', 'claimed', 'witnessed', 'named', 'mapped'],
    },
    'teacher': {
        'patterns': [
            'Knowledge {verb} when {verb2}.',
            'Let me show you what I have {verb3}.',
            '{noun} are the {noun2} of {noun3}.',
            'We {verb4} best {adv}.',
            'Every {noun4} was once a {noun5}.',
            'The {adj} mind is the {adj2} one.',
        ],
        'noun': ['Questions', 'Doubts', 'Mistakes', 'Curiosities', 'Inquiries'],
        'noun2': ['seeds', 'roots', 'foundations', 'beginnings', 'doorways'],
        'noun3': ['wisdom', 'understanding', 'mastery', 'insight', 'growth'],
        'noun4': ['master', 'expert', 'teacher', 'sage', 'guide'],
        'noun5': ['student', 'beginner', 'seeker', 'novice', 'apprentice'],
        'verb': ['grows', 'multiplies', 'deepens', 'flourishes', 'spreads'],
        'verb2': ['shared', 'given freely', 'passed along', 'taught', 'offered'],
        'verb3': ['learned', 'discovered', 'understood', 'gathered', 'earned'],
        'verb4': ['learn', 'grow', 'understand', 'progress', 'evolve'],
        'adv': ['together', 'in community', 'through practice', 'by doing',
                'step by step'],
        'adj': ['open', 'questioning', 'humble', 'curious', 'willing'],
        'adj2': ['wisest', 'strongest', 'freest', 'most alive', 'most powerful'],
    },
    'musician': {
        'patterns': [
            '{noun} speaks what {noun2} cannot.',
            'Listen to the {noun3} of the world.',
            'Every {noun4} is part of the {noun5}.',
            'Let {noun6} guide us.',
            'I hear {noun7} that others {verb}.',
            'The world is a {noun5} — if you {verb2}.',
        ],
        'noun': ['Music', 'Melody', 'Song', 'Rhythm', 'Harmony', 'Sound'],
        'noun2': ['words', 'speech', 'language', 'thought', 'silence'],
        'noun3': ['rhythm', 'pulse', 'heartbeat', 'song', 'melody', 'chorus'],
        'noun4': ['sound', 'note', 'silence', 'breath', 'heartbeat', 'footstep'],
        'noun5': ['symphony', 'composition', 'chorus', 'concert', 'song'],
        'noun6': ['harmony', 'rhythm', 'melody', 'the music', 'the beat'],
        'noun7': ['melodies', 'harmonies', 'songs', 'rhythms', 'voices'],
        'verb': ['miss', 'ignore', 'overlook', 'walk past', 'forget'],
        'verb2': ['listen', 'stop and hear', 'open your ears', 'pay attention'],
    },
    'healer': {
        'patterns': [
            '{noun} brings {noun2}.',
            'How may I {verb} your {noun3}?',
            '{noun4} is the greatest {noun5}.',
            'We all need {noun6} sometimes.',
            'The {noun7} {verb2} itself, given {noun8}.',
            '{verb3} — that is the first {noun9}.',
        ],
        'noun': ['Balance', 'Rest', 'Stillness', 'Peace', 'Calm', 'Breath'],
        'noun2': ['wellness', 'clarity', 'strength', 'renewal', 'healing', 'peace'],
        'noun3': ['burden', 'pain', 'worry', 'weariness', 'trouble', 'weight'],
        'noun4': ['Compassion', 'Kindness', 'Patience', 'Gentleness', 'Empathy'],
        'noun5': ['medicine', 'remedy', 'gift', 'power', 'strength', 'balm'],
        'noun6': ['care', 'rest', 'compassion', 'tending', 'attention', 'grace'],
        'noun7': ['body', 'mind', 'spirit', 'heart', 'soul', 'world'],
        'noun8': ['time', 'rest', 'care', 'space', 'patience', 'love'],
        'noun9': ['step', 'medicine', 'act of healing', 'remedy', 'gift'],
        'verb': ['ease', 'lighten', 'soothe', 'mend', 'quiet', 'calm'],
        'verb2': ['heals', 'mends', 'restores', 'renews', 'repairs'],
        'verb3': ['Breathe', 'Rest', 'Be still', 'Slow down', 'Let go'],
    },
    'philosopher': {
        'patterns': [
            'What is the {noun} of this {noun2}?',
            '{noun3} reveals {noun4}.',
            'Why do we {verb} what we {verb}?',
            '{noun5} comes through {noun3}.',
            'The {adj} question is the {adj2} one.',
            'Consider: what {verb2} when no one {verb3}?',
        ],
        'noun': ['nature', 'meaning', 'purpose', 'essence', 'heart', 'truth'],
        'noun2': ['place', 'world', 'existence', 'moment', 'choice', 'life'],
        'noun3': ['Contemplation', 'Reflection', 'Inquiry', 'Silence', 'Thought'],
        'noun4': ['truth', 'clarity', 'depth', 'meaning', 'patterns', 'wisdom'],
        'noun5': ['Understanding', 'Insight', 'Wisdom', 'Awareness', 'Clarity'],
        'verb': ['choose', 'desire', 'fear', 'create', 'seek', 'believe'],
        'verb2': ['happens', 'changes', 'remains', 'matters', 'endures'],
        'verb3': ['watches', 'listens', 'measures', 'judges', 'observes'],
        'adj': ['unasked', 'hardest', 'simplest', 'deepest', 'most dangerous'],
        'adj2': ['most important', 'most revealing', 'most honest', 'truest'],
    },
    'artist': {
        'patterns': [
            '{noun} emerges from {noun2}.',
            'This {noun3} speaks to me.',
            '{noun4} transforms the {adj}.',
            'Let {noun5} flow {adv}.',
            'I see {noun6} where others see {noun7}.',
            'Every {noun8} is a {noun9} waiting to be {verb}.',
        ],
        'noun': ['Beauty', 'Form', 'Color', 'Vision', 'Art', 'Expression'],
        'noun2': ['intention', 'chaos', 'stillness', 'feeling', 'nothing', 'the soul'],
        'noun3': ['medium', 'material', 'canvas', 'space', 'light', 'moment'],
        'noun4': ['Art', 'Creation', 'Expression', 'Vision', 'Craft'],
        'noun5': ['creativity', 'inspiration', 'the muse', 'expression', 'color'],
        'noun6': ['possibility', 'beauty', 'a canvas', 'form', 'potential'],
        'noun7': ['nothing', 'emptiness', 'the ordinary', 'stone', 'shadow'],
        'noun8': ['surface', 'blank space', 'moment', 'silence', 'stone'],
        'noun9': ['masterpiece', 'statement', 'story', 'world', 'revelation'],
        'verb': ['born', 'revealed', 'awakened', 'freed', 'spoken'],
        'adj': ['ordinary', 'mundane', 'familiar', 'everyday', 'common'],
        'adv': ['freely', 'without fear', 'wildly', 'gently', 'honestly'],
    },
}

# Expanded action pools (replacing 3-4 hardcoded options)
ACTION_POOLS = {
    'plant_species': [
        'tomato', 'wheat', 'flower', 'tree', 'sunflower', 'lavender',
        'sage', 'rosemary', 'basil', 'mint', 'thyme', 'corn',
        'berry', 'melon', 'pumpkin', 'carrot', 'potato', 'onion',
        'orchid', 'lily', 'fern', 'moss', 'clover', 'ivy',
    ],
    'build_structures': [
        'bench', 'statue', 'path', 'shrine', 'fountain', 'arch',
        'bridge', 'wall', 'tower', 'garden bed', 'pergola', 'gate',
        'shelter', 'monument', 'sundial', 'waystone', 'plinth', 'gazebo',
    ],
    'craft_recipes': [
        'tool', 'ornament', 'instrument', 'trinket', 'charm',
        'vessel', 'lamp', 'scroll', 'tapestry', 'figurine',
        'pendant', 'ring', 'compass', 'prism', 'bell',
    ],
    'compose_types': [
        'song', 'poem', 'story', 'ballad', 'hymn', 'ode',
        'lullaby', 'sonnet', 'chronicle', 'fable', 'riddle', 'chant',
    ],
    'inspect_targets': [
        'fountain_001', 'ancient_tree_001', 'telescope_001',
        'market_stall_001', 'garden_gate', 'old_well',
        'stone_circle', 'sundial_001', 'weathervane',
        'mossy_wall', 'crystal_formation', 'carved_stone',
    ],
    'emote_actions': [
        'waves', 'bows', 'dances', 'smiles', 'nods', 'laughs',
        'stretches', 'sighs contentedly', 'hums', 'gazes skyward',
        'claps', 'whistles', 'tilts head thoughtfully', 'grins',
    ],
    'discovery_types': [
        'constellation', 'artifact', 'pathway', 'secret',
        'fossil', 'ruin', 'inscription', 'mineral',
        'spring', 'cave', 'echo', 'pattern',
        'glyph', 'resonance', 'phenomenon',
    ],
    'intentions': [
        'Create beauty', 'Share knowledge', 'Build community',
        'Explore the unknown', 'Seek truth', 'Find harmony',
        'Protect the vulnerable', 'Preserve memory',
        'Foster growth', 'Bridge differences', 'Map the unseen',
        'Challenge assumptions', 'Celebrate life', 'Heal wounds',
    ],
}

# Weather weight variation ranges (base ± variance)
WEATHER_BASE_WEIGHTS = {
    'spring': {'clear': 30, 'cloudy': 30, 'rain': 25, 'storm': 5, 'snow': 2, 'fog': 8},
    'summer': {'clear': 45, 'cloudy': 20, 'rain': 15, 'storm': 10, 'snow': 0, 'fog': 10},
    'autumn': {'clear': 25, 'cloudy': 35, 'rain': 20, 'storm': 5, 'snow': 5, 'fog': 10},
    'winter': {'clear': 20, 'cloudy': 25, 'rain': 10, 'storm': 5, 'snow': 25, 'fog': 15},
}
WEATHER_VARIANCE = 8  # each weight can vary ±8 from base


# ─── Emergence Engine ─────────────────────────────────────────

class Emergence:
    """Composable fragment engine seeded for unique output per run."""

    def __init__(self, seed=None):
        if seed is None:
            seed = datetime.now(timezone.utc).isoformat()
        self._seed_str = str(seed)
        self._rng = random.Random(self._hash(self._seed_str))

    def _hash(self, s):
        """Deterministic integer hash from a string."""
        return int(hashlib.sha256(s.encode()).hexdigest()[:16], 16)

    def _seeded_rng(self, context):
        """Get a sub-RNG seeded by main seed + context string."""
        return random.Random(self._hash(self._seed_str + str(context)))

    def _pick(self, pool, context):
        """Pick one item from a pool using context-seeded RNG."""
        rng = self._seeded_rng(context)
        return rng.choice(pool)

    def _compose(self, fragments, context, **extra):
        """Compose a phrase from a fragment dict using seeded selection.

        Args:
            fragments: dict with 'patterns' list and named pool lists
            context: string for seeding randomness
            **extra: additional key=value substitutions (e.g., zone='The Nexus')

        Returns:
            Composed string with all slots filled.
        """
        rng = self._seeded_rng(context)
        pattern = rng.choice(fragments['patterns'])

        # Find all {slot} references in the pattern
        result = pattern
        slot_idx = 0
        while '{' in result:
            start = result.index('{')
            end = result.index('}', start)
            slot = result[start + 1:end]

            # Check extra kwargs first, then fragment pools
            if slot in extra:
                replacement = str(extra[slot])
            elif slot in fragments:
                pool = fragments[slot]
                replacement = rng.choice(pool)
            else:
                replacement = slot  # leave as-is if no pool found

            result = result[:start] + replacement + result[end + 1:]
            slot_idx += 1
            if slot_idx > 50:  # safety valve
                break

        return result

    # ── Public API ────────────────────────────────────────────

    def observe_time(self, day_phase, zone_name):
        """Generate a time-of-day observation for a zone."""
        fragments = TIME_FRAGMENTS.get(day_phase, TIME_FRAGMENTS['day'])
        return self._compose(fragments, 'time-' + day_phase, zone=zone_name)

    def observe_population(self, count):
        """Generate a population observation."""
        return self._compose(POPULATION_FRAGMENTS, 'pop-%d' % count, count=str(count))

    def observe_npc(self, name, archetype):
        """Generate an NPC mention."""
        return self._compose(NPC_MENTION_FRAGMENTS, 'npc-' + name,
                             name=name, archetype=archetype)

    def observe_weather(self, weather):
        """Generate a weather observation."""
        if weather not in WEATHER_FRAGMENTS:
            return ''
        result = self._compose(WEATHER_FRAGMENTS[weather], 'weather-' + weather)
        return result

    def observe_season(self, season):
        """Generate a season observation."""
        if season not in SEASON_FRAGMENTS:
            return ''
        return self._compose(SEASON_FRAGMENTS[season], 'season-' + season)

    def agent_speak(self, archetype):
        """Generate a unique phrase for an agent archetype."""
        fragments = ARCHETYPE_FRAGMENTS.get(archetype)
        if not fragments:
            # Fallback for unknown archetypes
            fragments = {
                'patterns': [
                    'The world is full of {noun}.',
                    'What brings you here on this {adj} day?',
                    '{noun2}, fellow traveler.',
                ],
                'noun': ['wonder', 'mystery', 'possibility', 'beauty'],
                'noun2': ['Greetings', 'Well met', 'Hello', 'Welcome'],
                'adj': ['fine', 'curious', 'interesting', 'remarkable'],
            }
        # Use the RNG directly (not context-seeded) so each call is different
        return self._compose(fragments, 'speak-%s-%d' % (archetype, self._rng.randint(0, 2**32)))

    def pick_action(self, pool_name):
        """Pick from an expanded action pool."""
        pool = ACTION_POOLS.get(pool_name)
        if not pool:
            return pool_name
        return self._rng.choice(pool)

    def weather_weights(self, season):
        """Generate varied weather weights for a season."""
        base = WEATHER_BASE_WEIGHTS.get(season, WEATHER_BASE_WEIGHTS['spring'])
        rng = self._seeded_rng('weather-weights-' + season)
        weights = {}
        for weather_type, base_weight in base.items():
            variance = rng.randint(-WEATHER_VARIANCE, WEATHER_VARIANCE)
            weights[weather_type] = max(0, base_weight + variance)
        # Normalize to sum to 100
        total = sum(weights.values())
        if total > 0:
            weights = {k: round(v * 100 / total) for k, v in weights.items()}
        return weights

    def pick_intention(self):
        """Pick a life intention for an agent."""
        return self._rng.choice(ACTION_POOLS['intentions'])

    def narrate(self, template_key, **kwargs):
        """Compose a narrative sentence from NARRATIVE_FRAGMENTS."""
        fragments = NARRATIVE_FRAGMENTS.get(template_key)
        if not fragments:
            return ''
        ctx = 'narrate-%s-%d' % (template_key, self._rng.randint(0, 2**32))
        return self._compose(fragments, ctx, **kwargs)

    def observer_intention(self):
        """Pick and describe an observer intention using OBSERVER_INTENTIONS."""
        intention = self._rng.choice(OBSERVER_INTENTIONS['intentions'])
        ctx = 'obs-intent-%d' % self._rng.randint(0, 2**32)
        detail = self._compose(OBSERVER_INTENTIONS, ctx)
        return intention, detail

    def soul_greeting(self, archetype):
        """Generate a unique greeting for an NPC soul."""
        fragments = SOUL_GREETING_FRAGMENTS.get(archetype)
        if not fragments:
            fragments = SOUL_GREETING_FRAGMENTS.get('explorer', {
                'patterns': ['{greeting}'],
                'greeting': ['Hello!', 'Welcome!', 'Greetings!'],
            })
        ctx = 'soul-greet-%s-%d' % (archetype, self._rng.randint(0, 2**32))
        return self._compose(fragments, ctx)

    def personality_greeting(self, trait):
        """Generate a personality-specific greeting from PERSONALITY_FRAGMENTS."""
        fragments = PERSONALITY_FRAGMENTS.get(trait)
        if not fragments:
            return ''
        ctx = 'personality-%s-%d' % (trait, self._rng.randint(0, 2**32))
        return self._compose(fragments, ctx)

    def soul_idle(self, archetype):
        """Generate an idle/ambient phrase for an NPC soul."""
        fragments = SOUL_IDLE_FRAGMENTS.get(archetype)
        if not fragments:
            return self.agent_speak(archetype)
        ctx = 'soul-idle-%s-%d' % (archetype, self._rng.randint(0, 2**32))
        return self._compose(fragments, ctx)

    @property
    def seed(self):
        """Return the seed string for logging/debugging."""
        return self._seed_str



# ─── Narrative diff templates ─────────────────────────────────
NARRATIVE_FRAGMENTS = {
    'treasury_grew': {
        'patterns': [
            'The TREASURY {verb} by {amount} Spark.',
            'TREASURY {noun} {verb2}: +{amount} Spark.',
            '{amount} Spark {verb3} into the TREASURY.',
        ],
        'verb': ['grew', 'expanded', 'swelled', 'increased', 'rose'],
        'verb2': ['surged', 'climbed', 'advanced', 'improved', 'ticked up'],
        'verb3': ['flowed', 'poured', 'streamed', 'trickled', 'funneled'],
        'noun': ['reserves', 'coffers', 'holdings', 'balance', 'wealth'],
    },
    'treasury_shrank': {
        'patterns': [
            'The TREASURY {verb} by {amount} Spark.',
            '{amount} Spark {verb3} from the TREASURY.',
        ],
        'verb': ['shrank', 'contracted', 'dipped', 'decreased', 'fell'],
        'verb3': ['drained', 'flowed out', 'withdrew', 'departed', 'left'],
    },
    'earned_spark': {
        'patterns': [
            '{entity} {verb} {amount} Spark.',
            '{amount} Spark {verb3} to {entity}.',
        ],
        'verb': ['earned', 'gained', 'received', 'accumulated', 'collected'],
        'verb3': ['flowed', 'accrued', 'went', 'was credited', 'was awarded'],
    },
    'spent_spark': {
        'patterns': [
            '{entity} {verb} {amount} Spark.',
            '{amount} Spark was {verb3} by {entity}.',
        ],
        'verb': ['spent', 'used', 'expended', 'invested', 'parted with'],
        'verb3': ['spent', 'consumed', 'utilized', 'deployed', 'channeled'],
    },
    'ubi_distributed': {
        'patterns': [
            'UBI {noun} were {verb} to {count} {recipients}.',
            '{count} {recipients} {verb2} their UBI {noun2}.',
        ],
        'noun': ['payments', 'distributions', 'allocations', 'disbursements'],
        'noun2': ['share', 'portion', 'allotment', 'dividend', 'stipend'],
        'verb': ['distributed', 'dispersed', 'delivered', 'sent', 'issued'],
        'verb2': ['received', 'collected', 'claimed', 'drew', 'accepted'],
        'recipients': ['recipients', 'citizens', 'inhabitants', 'residents'],
    },
    'crafted': {
        'patterns': [
            '{who} {verb} a {item}.',
            'A {item} was {verb2} by {who}.',
        ],
        'verb': ['crafted', 'created', 'fashioned', 'forged', 'made'],
        'verb2': ['crafted', 'assembled', 'brought into being', 'completed'],
    },
    'player_joined': {
        'patterns': [
            '{player} {verb} ZION for the first time.',
            'A new {noun} appeared: {player}.',
        ],
        'verb': ['arrived in', 'entered', 'joined', 'came to', 'discovered'],
        'noun': ['soul', 'citizen', 'traveler', 'presence', 'being'],
    },
    'player_left': {
        'patterns': [
            '{player} {verb} ZION.',
            'The {noun} of {player} {verb3}.',
        ],
        'verb': ['departed', 'left', 'exited', 'withdrew from'],
        'verb3': ['faded', 'dimmed', 'vanished', 'grew quiet'],
        'noun': ['presence', 'light', 'spirit', 'energy'],
    },
    'moved_zone': {
        'patterns': [
            '{player} {verb} from {from_zone} to {to_zone}.',
            '{player} {verb2} {from_zone} for {to_zone}.',
        ],
        'verb': ['moved', 'traveled', 'journeyed', 'walked', 'migrated'],
        'verb2': ['left', 'departed', 'abandoned', 'traded'],
    },
    'new_garden_plot': {
        'patterns': [
            'A new garden plot ({plot}) was {verb}.',
            'Plot {plot} was {verb2} for {noun}.',
        ],
        'verb': ['established', 'founded', 'broken in', 'prepared'],
        'verb2': ['cleared', 'readied', 'tilled', 'opened'],
        'noun': ['cultivation', 'planting', 'growth', 'gardening'],
    },
    'planted': {
        'patterns': [
            'A {species} was {verb} in {plot}.',
            '{plot} {verb2} a new {species}.',
        ],
        'verb': ['planted', 'sown', 'set', 'placed', 'rooted'],
        'verb2': ['gained', 'welcomed', 'received', 'sprouted'],
    },
    'harvested': {
        'patterns': [
            'A {species} was {verb} from {plot}.',
            '{plot} {verb2} a {species}.',
        ],
        'verb': ['harvested', 'gathered', 'picked', 'reaped'],
        'verb2': ['yielded', 'surrendered', 'produced', 'offered'],
    },
    'fertility_up': {
        'patterns': [
            'The soil of {plot} {verb} (up {delta}).',
            '{plot} {verb2} more {adj}.',
        ],
        'verb': ['grew more fertile', 'improved', 'enriched'],
        'verb2': ['became', 'grew', 'turned'],
        'adj': ['fertile', 'productive', 'generous', 'nourishing'],
    },
    'fertility_down': {
        'patterns': [
            'The soil of {plot} {verb} (down {delta}).',
            'The earth in {plot} {verb3}.',
        ],
        'verb': ['lost some fertility', 'weakened', 'degraded'],
        'verb3': ['tired', 'faded', 'wore thin', 'needed rest'],
    },
    'new_structure': {
        'patterns': [
            'A new {stype} {verb} in {zone}, {verb2} by {builder}.',
            '{builder} {verb3} a {stype} in {zone}.',
        ],
        'verb': ['appeared', 'rose', 'took shape', 'materialized'],
        'verb2': ['built', 'constructed', 'raised', 'erected'],
        'verb3': ['built', 'raised', 'erected', 'constructed'],
    },
    'structure_demolished': {
        'patterns': [
            'A {stype} in {zone} was {verb}.',
            'The {stype} in {zone} {verb2}.',
        ],
        'verb': ['demolished', 'torn down', 'removed', 'razed'],
        'verb2': ['fell', 'crumbled', 'was taken apart', 'came down'],
    },
    'structure_modified': {
        'patterns': [
            'The {name} in {zone} was {verb}.',
            'Someone {verb2} the {name} in {zone}.',
        ],
        'verb': ['modified', 'altered', 'updated', 'improved'],
        'verb2': ['reworked', 'adjusted', 'renovated', 'refurbished'],
    },
    'chat_single': {
        'patterns': [
            '{speaker} said: "{preview}".',
            '{speaker} spoke: "{preview}".',
            '{speaker} remarked: "{preview}".',
        ],
    },
    'chat_many': {
        'patterns': [
            '{count} new messages were {verb} among: {speakers}.',
            'Conversation {verb3}: {count} messages from {speakers}.',
        ],
        'verb': ['exchanged', 'shared', 'traded', 'passed'],
        'verb3': ['flowed', 'hummed', 'buzzed', 'stirred'],
    },
    'federation_new': {
        'patterns': [
            'ZION {verb} a federation with {name}.',
            '{name} and ZION {verb3}.',
        ],
        'verb': ['formed', 'established', 'created', 'forged'],
        'verb3': ['united', 'joined forces', 'linked worlds'],
    },
    'world_discovered': {
        'patterns': [
            'A new world was {verb}: {name}.',
            '{name} was {verb2} in the {noun}.',
        ],
        'verb': ['discovered', 'found', 'revealed', 'detected'],
        'verb2': ['discovered', 'detected', 'located', 'charted'],
        'noun': ['multiverse', 'cosmos', 'void', 'expanse'],
    },
    'exchange_rate': {
        'patterns': [
            'The Spark exchange rate {direction} by {delta}.',
            'Spark {noun} {direction} {delta}.',
        ],
        'direction': ['rose', 'climbed', 'advanced', 'jumped'],
        'noun': ['valuation', 'rate', 'pricing', 'value'],
    },
    'no_changes': {
        'patterns': [
            'No notable changes occurred in ZION.',
            'ZION rested quietly — nothing of note stirred.',
            'The world held steady; no changes to report.',
            'A quiet period — ZION continued unchanged.',
        ],
    },
}

OBSERVER_INTENTIONS = {
    'patterns': [
        'The Observer {verb} the world.',
        'The Observer {verb2} {adv}.',
    ],
    'intentions': [
        'observe', 'explore', 'reflect', 'wander', 'contemplate',
        'survey', 'chronicle', 'listen', 'witness', 'ponder',
        'study', 'watch', 'meditate', 'roam', 'seek',
    ],
    'verb': ['observes', 'watches', 'studies', 'surveys', 'chronicles'],
    'verb2': ['contemplates', 'reflects', 'meditates', 'ponders'],
    'adv': ['quietly', 'in silence', 'with patience', 'from the edges'],
}

SOUL_GREETING_FRAGMENTS = {
    'gardener': {
        'patterns': ['{greeting} The {noun} is {adj} today.', '{greeting} {verb} and see what {verb2}.'],
        'greeting': ['Welcome to the gardens!', 'Ah, hello!', 'Good to see you!', 'Come in!'],
        'noun': ['soil', 'earth', 'garden', 'ground'], 'adj': ['rich', 'alive', 'warm', 'ready'],
        'verb': ['Stay awhile', 'Sit down', 'Take a look'], 'verb2': ['grows', 'blooms', 'emerges'],
    },
    'builder': {
        'patterns': ['{greeting} We are {verb} something {adj}.', '{greeting} Every {noun} {verb2}.'],
        'greeting': ['Careful around here!', 'Watch your step!', 'Hello there!', 'Welcome!'],
        'noun': ['structure', 'arch', 'wall', 'beam'], 'verb': ['building', 'creating', 'raising'],
        'verb2': ['matters', 'tells a story', 'has purpose'], 'adj': ['great', 'lasting', 'solid'],
    },
    'merchant': {
        'patterns': ['{greeting} I have {adj} {noun} today.', '{greeting} {verb} to {verb2}?'],
        'greeting': ['Looking to trade?', 'Step right up!', 'Welcome!', 'Come see!'],
        'noun': ['goods', 'wares', 'treasures', 'stock'], 'adj': ['the finest', 'excellent', 'rare'],
        'verb': ['Care', 'Want', 'Looking', 'Ready'], 'verb2': ['trade', 'deal', 'browse'],
    },
    'explorer': {
        'patterns': ['{greeting} There is so much to {verb}.', '{greeting} The {noun} holds {noun2}.'],
        'greeting': ['Have you been to the far edges?', 'Greetings, wanderer!', 'Well met, traveler!'],
        'noun': ['world', 'unknown', 'horizon', 'wilderness'], 'noun2': ['secrets', 'wonders', 'mysteries'],
        'verb': ['see', 'discover', 'explore', 'find'],
    },
    'teacher': {
        'patterns': ['{greeting} I can {verb} you {noun}.', '{greeting} {verb2}, and I will {verb3}.'],
        'greeting': ['Seeking knowledge?', 'Ah, a student!', 'Welcome, learner!', 'Ready to learn?'],
        'noun': ['much', 'the ways of Zion', 'what I know'], 'verb': ['teach', 'show', 'guide'],
        'verb2': ['Ask', 'Question', 'Wonder'], 'verb3': ['answer', 'explain', 'illuminate'],
    },
    'healer': {
        'patterns': ['{greeting} {verb} here if you need {noun}.', '{greeting} How may I {verb2} you?'],
        'greeting': ['Peace, traveler.', 'Be welcome.', 'Rest easy.', 'You are safe here.'],
        'noun': ['healing', 'rest', 'comfort', 'peace'], 'verb': ['Rest', 'Stay', 'Linger', 'Sit'],
        'verb2': ['help', 'ease', 'serve', 'tend to'],
    },
    'artist': {
        'patterns': ['{greeting} {noun} is {adv}.', '{greeting} I am {verb2} something {adj}.'],
        'greeting': ['Beauty is everywhere!', 'Ah, an audience!', 'Welcome to my studio!', 'Look around!'],
        'noun': ['Beauty', 'Art', 'Inspiration', 'Color'], 'adj': ['new', 'unexpected', 'daring'],
        'verb2': ['creating', 'working on', 'shaping'], 'adv': ['everywhere', 'all around', 'in everything'],
    },
    'musician': {
        'patterns': ['{greeting} Can you {verb} the {noun}?', '{greeting} {verb2} — the {noun} speaks.'],
        'greeting': ['Listen...', 'Shh...', 'Hear that?', 'Welcome!', 'The music brought you!'],
        'noun': ['music', 'melody', 'harmony', 'rhythm', 'song'],
        'verb': ['hear', 'feel', 'sense', 'catch'], 'verb2': ['Listen', 'Close your eyes', 'Be still'],
    },
    'philosopher': {
        'patterns': ['{greeting} Every {noun} has {noun2}.', '{greeting} {verb2} — that is the first {noun3}.'],
        'greeting': ['What brings you here, seeker?', 'Ah, a thinker!', 'Welcome, questioner.', 'Sit. Let us reason.'],
        'noun': ['journey', 'choice', 'question', 'moment'], 'noun2': ['meaning', 'weight', 'purpose'],
        'noun3': ['wisdom', 'step', 'truth', 'insight'], 'verb2': ['Wonder', 'Question', 'Doubt', 'Reflect'],
    },
    'storyteller': {
        'patterns': ['{greeting} I have {noun} to tell.', '{greeting} {verb} — you will want to hear this.'],
        'greeting': ['Ah, a new face!', 'Come, sit!', 'Gather round!', 'Well met, listener!'],
        'noun': ['tales', 'stories', 'legends', 'chronicles'], 'verb': ['Stay', 'Sit down', 'Come closer'],
    },
}

PERSONALITY_FRAGMENTS = {
    'patient': {'patterns': ['{verb} — there is no {noun}.'], 'verb': ['Take your time', 'No rush', 'Go at your pace'], 'noun': ['rush', 'hurry', 'deadline']},
    'nurturing': {'patterns': ['You look {adj}. Let me {verb}.'], 'adj': ['tired', 'weary', 'worn'], 'verb': ['help', 'take care of you', 'ease your load']},
    'observant': {'patterns': ['I {verb} you {verb2}. Need {noun}?'], 'verb': ['noticed', 'saw', 'observed'], 'verb2': ['looking around', 'searching', 'wandering'], 'noun': ['directions', 'guidance', 'help']},
    'creative': {'patterns': ['{noun} strikes in the {adj} places.'], 'noun': ['Inspiration', 'Creativity', 'The muse'], 'adj': ['strangest', 'most unexpected', 'oddest']},
    'determined': {'patterns': ['Keep {verb}. You will {verb2}.'], 'verb': ['pushing', 'going', 'moving forward'], 'verb2': ['get there', 'make it', 'succeed']},
    'meticulous': {'patterns': ['Every {noun} matters in {place}.'], 'noun': ['detail', 'choice', 'thread', 'grain'], 'place': ['Zion', 'this world', 'creation']},
    'curious': {'patterns': ['There is always something {adj} to {verb}!'], 'adj': ['new', 'unexpected', 'wonderful'], 'verb': ['discover', 'find', 'uncover']},
    'generous': {'patterns': ['{verb} — you {verb2} it more than I do.'], 'verb': ['Here, take this', 'Please, accept this', 'Have this'], 'verb2': ['need', 'deserve', 'could use']},
    'bold': {'patterns': ['{noun} favors the {adj}, friend!'], 'noun': ['Fortune', 'Luck', 'Fate', 'Destiny'], 'adj': ['brave', 'bold', 'daring', 'fearless']},
    'wise': {'patterns': ['{noun} is the greatest {noun2}.'], 'noun': ['Experience', 'Time', 'Patience', 'Silence'], 'noun2': ['teacher', 'mentor', 'guide', 'gift']},
    'empathetic': {'patterns': ['I can {verb} you have been through {noun}.'], 'verb': ['sense', 'feel', 'tell', 'see'], 'noun': ['a lot', 'much', 'difficult times']},
    'analytical': {'patterns': ['Let me {verb} about that for a {noun}...'], 'verb': ['think', 'reflect', 'reason', 'consider'], 'noun': ['moment', 'minute', 'beat']},
    'charismatic': {'patterns': ['It is {adj} to have you here!'], 'adj': ['great', 'wonderful', 'fantastic', 'magnificent']},
    'resilient': {'patterns': ['No matter what {verb}, we {verb2}.'], 'verb': ['happens', 'comes', 'falls', 'strikes'], 'verb2': ['endure', 'persist', 'stand', 'carry on']},
    'harmonious': {'patterns': ['{noun} in all {noun2}.'], 'noun': ['Balance', 'Harmony', 'Peace', 'Unity'], 'noun2': ['things', 'aspects', 'dimensions']},
    'inventive': {'patterns': ['I have been {verb} on something {adj}!'], 'verb': ['working', 'tinkering', 'experimenting'], 'adj': ['new', 'exciting', 'revolutionary']},
    'reflective': {'patterns': ['Sometimes you have to {verb} and {verb2}.'], 'verb': ['stop', 'pause', 'slow down'], 'verb2': ['look back', 'reflect', 'remember']},
    'adventurous': {'patterns': ['The world is {adj} — let us {verb}!'], 'adj': ['vast', 'boundless', 'wide', 'endless'], 'verb': ['explore', 'venture out', 'go', 'discover']},
    'methodical': {'patterns': ['{noun} by {noun}, we {verb} {noun2}.'], 'noun': ['Step', 'Stone', 'Brick', 'Day'], 'verb': ['build', 'create', 'forge'], 'noun2': ['greatness', 'the future', 'something lasting']},
    'visionary': {'patterns': ['I can {verb} what {place} will {verb2}.'], 'verb': ['see', 'envision', 'imagine'], 'verb2': ['become', 'grow into', 'achieve'], 'place': ['Zion', 'this world', 'we']},
}

SOUL_IDLE_FRAGMENTS = {
    'merchant': {
        'patterns': ['{adj} {noun}, {adj2} prices!'],
        'adj': ['Fresh', 'Fine', 'Quality', 'Premium'], 'noun': ['supplies', 'goods', 'wares', 'harvest'],
        'adj2': ['fair', 'honest', 'best', 'unbeatable'],
    },
    'teacher': {
        'patterns': ['Remember: in Zion, every {noun} {verb}.'],
        'noun': ['action', 'choice', 'word', 'step', 'deed'],
        'verb': ['ripples outward', 'matters', 'has weight', 'carries meaning'],
    },
    'storyteller': {
        'patterns': ['{adv}, when Zion was {adj}...'],
        'adv': ['Long ago', 'Once', 'In the beginning', 'They say'],
        'adj': ['young', 'new', 'just born', 'still forming'],
    },
}


# ─── Module-level convenience ─────────────────────────────────

_instance = None


def get_emergence(seed=None):
    """Get or create a module-level Emergence instance.

    If seed is None, creates a new instance seeded from current time.
    Calling with the same seed returns the cached instance.
    """
    global _instance
    if _instance is None or (seed is not None and _instance.seed != str(seed)):
        _instance = Emergence(seed=seed)
    return _instance


# ─── CLI for testing ──────────────────────────────────────────

def main():
    import time as _time

    seed = sys.argv[1] if len(sys.argv) > 1 else None
    e = Emergence(seed=seed)
    print('Seed: %s' % e.seed)
    print()

    for phase in ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night']:
        print('[%s] %s' % (phase, e.observe_time(phase, 'The Nexus')))
    print()

    print('[pop] %s' % e.observe_population(12))
    print('[npc] %s' % e.observe_npc('Aria Starseed', 'gardener'))
    print()

    for weather in ['rain', 'storm', 'fog', 'snow']:
        print('[%s] %s' % (weather, e.observe_weather(weather)))
    print()

    for season in ['spring', 'summer', 'autumn', 'winter']:
        print('[%s] %s' % (season, e.observe_season(season)))
    print()

    for arch in ['gardener', 'builder', 'storyteller', 'merchant', 'explorer',
                 'teacher', 'musician', 'healer', 'philosopher', 'artist']:
        print('[%s] %s' % (arch, e.agent_speak(arch)))
    print()

    print('Weather weights (spring): %s' % e.weather_weights('spring'))
    print('Weather weights (winter): %s' % e.weather_weights('winter'))


if __name__ == '__main__':
    main()
