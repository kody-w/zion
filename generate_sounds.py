#!/usr/bin/env python3
"""
ZION MMO Sound Effect Generator
Generates WAV sound effects using only Python standard library (wave, struct, math, random)
"""

import wave
import struct
import math
import random
import os

# Constants
SAMPLE_RATE = 44100
BIT_DEPTH = 16


# ============================================================================
# CORE WAVEFORM GENERATORS
# ============================================================================

def generate_sine(freq, duration, sample_rate=SAMPLE_RATE):
    """Generate sine wave samples."""
    samples = []
    num_samples = int(duration * sample_rate)
    for i in range(num_samples):
        t = i / sample_rate
        sample = math.sin(2 * math.pi * freq * t)
        samples.append(sample)
    return samples


def generate_noise(duration, sample_rate=SAMPLE_RATE):
    """Generate white noise samples."""
    num_samples = int(duration * sample_rate)
    return [random.uniform(-1, 1) for _ in range(num_samples)]


def generate_square(freq, duration, sample_rate=SAMPLE_RATE):
    """Generate square wave samples."""
    samples = []
    num_samples = int(duration * sample_rate)
    for i in range(num_samples):
        t = i / sample_rate
        sample = 1.0 if math.sin(2 * math.pi * freq * t) >= 0 else -1.0
        samples.append(sample)
    return samples


def generate_sawtooth(freq, duration, sample_rate=SAMPLE_RATE):
    """Generate sawtooth wave samples."""
    samples = []
    num_samples = int(duration * sample_rate)
    for i in range(num_samples):
        t = i / sample_rate
        phase = (freq * t) % 1.0
        sample = 2 * phase - 1
        samples.append(sample)
    return samples


def generate_triangle(freq, duration, sample_rate=SAMPLE_RATE):
    """Generate triangle wave samples."""
    samples = []
    num_samples = int(duration * sample_rate)
    for i in range(num_samples):
        t = i / sample_rate
        phase = (freq * t) % 1.0
        sample = 2 * abs(2 * phase - 1) - 1
        samples.append(sample)
    return samples


# ============================================================================
# SIGNAL PROCESSING FUNCTIONS
# ============================================================================

def apply_envelope(samples, attack=0.01, decay=0.05, sustain_level=0.7, release=0.1):
    """Apply ADSR envelope to samples."""
    if not samples:
        return samples

    result = samples.copy()
    num_samples = len(samples)
    sample_rate = SAMPLE_RATE

    attack_samples = int(attack * sample_rate)
    decay_samples = int(decay * sample_rate)
    release_samples = int(release * sample_rate)

    for i in range(num_samples):
        envelope = 1.0

        # Attack phase
        if i < attack_samples:
            envelope = i / attack_samples if attack_samples > 0 else 1.0

        # Decay phase
        elif i < attack_samples + decay_samples:
            decay_progress = (i - attack_samples) / decay_samples if decay_samples > 0 else 1.0
            envelope = 1.0 - (1.0 - sustain_level) * decay_progress

        # Sustain phase
        elif i < num_samples - release_samples:
            envelope = sustain_level

        # Release phase
        else:
            release_progress = (i - (num_samples - release_samples)) / release_samples if release_samples > 0 else 1.0
            envelope = sustain_level * (1.0 - release_progress)

        result[i] *= envelope

    return result


def exponential_decay(samples, decay_rate=5.0):
    """Apply exponential decay envelope."""
    result = samples.copy()
    num_samples = len(samples)
    for i in range(num_samples):
        t = i / num_samples
        envelope = math.exp(-decay_rate * t)
        result[i] *= envelope
    return result


def low_pass_filter(samples, window_size=20):
    """Simple moving average low-pass filter."""
    if window_size <= 1:
        return samples

    result = []
    for i in range(len(samples)):
        start = max(0, i - window_size // 2)
        end = min(len(samples), i + window_size // 2 + 1)
        avg = sum(samples[start:end]) / (end - start)
        result.append(avg)

    return result


def mix(samples_list, gains=None):
    """Mix multiple sample arrays with optional gains."""
    if not samples_list:
        return []

    if gains is None:
        gains = [1.0] * len(samples_list)

    max_length = max(len(s) for s in samples_list)
    result = [0.0] * max_length

    for samples, gain in zip(samples_list, gains):
        for i in range(len(samples)):
            result[i] += samples[i] * gain

    return result


def normalize(samples, peak=0.9):
    """Normalize samples to peak amplitude."""
    if not samples:
        return samples

    max_val = max(abs(s) for s in samples)
    if max_val == 0:
        return samples

    scale = peak / max_val
    return [s * scale for s in samples]


def add_delay(samples, delay_time, feedback=0.3, sample_rate=SAMPLE_RATE):
    """Add delay/echo effect."""
    delay_samples = int(delay_time * sample_rate)
    result = samples.copy()

    for i in range(delay_samples, len(result)):
        result[i] += result[i - delay_samples] * feedback

    return result


def frequency_sweep(start_freq, end_freq, duration, sample_rate=SAMPLE_RATE):
    """Generate frequency sweep using sawtooth wave."""
    samples = []
    num_samples = int(duration * sample_rate)

    for i in range(num_samples):
        t = i / sample_rate
        progress = i / num_samples
        freq = start_freq + (end_freq - start_freq) * progress

        phase = 0
        if i > 0:
            # Integrate frequency to get phase
            dt = 1.0 / sample_rate
            freq_prev = start_freq + (end_freq - start_freq) * ((i-1) / num_samples)
            phase = (freq_prev * dt) % 1.0

        # Simplified: just use current frequency
        phase = (freq * t) % 1.0
        sample = 2 * phase - 1
        samples.append(sample)

    return samples


def amplitude_modulation(samples, mod_freq, depth=0.5, sample_rate=SAMPLE_RATE):
    """Apply amplitude modulation."""
    result = samples.copy()
    for i in range(len(samples)):
        t = i / sample_rate
        mod = 1.0 - depth + depth * math.sin(2 * math.pi * mod_freq * t)
        result[i] *= mod
    return result


# ============================================================================
# WAV FILE I/O
# ============================================================================

def write_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """Write samples to 16-bit mono WAV file."""
    # Normalize samples
    samples = normalize(samples, peak=0.9)

    # Convert to 16-bit integers
    max_int16 = 32767
    int_samples = [int(s * max_int16) for s in samples]

    # Write WAV file
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)

        # Pack samples as signed 16-bit integers
        packed_samples = struct.pack('<' + 'h' * len(int_samples), *int_samples)
        wav_file.writeframes(packed_samples)


# ============================================================================
# SOUND EFFECT GENERATORS
# ============================================================================

def generate_footstep_grass():
    """Soft crunch: low-pass filtered noise burst."""
    duration = 0.08
    noise = generate_noise(duration)
    filtered = low_pass_filter(noise, window_size=20)
    enveloped = apply_envelope(filtered, attack=0.005, decay=0.02, sustain_level=0.5, release=0.03)
    return enveloped


def generate_footstep_stone():
    """Hard tap: sine wave at 200Hz mixed with high-frequency click."""
    duration = 0.06

    # Base tone
    base = generate_sine(200, duration)
    base = exponential_decay(base, decay_rate=15)

    # High-frequency click (first 5ms)
    click_duration = 0.005
    click = generate_sine(3000, click_duration)
    click = exponential_decay(click, decay_rate=50)

    # Pad click to full duration
    click_padded = click + [0] * (len(base) - len(click))

    # Mix
    result = mix([base, click_padded], [0.7, 0.5])
    return result


def generate_footstep_sand():
    """Soft swish: filtered noise with gentle envelope."""
    duration = 0.1
    noise = generate_noise(duration)
    filtered = low_pass_filter(noise, window_size=30)
    enveloped = apply_envelope(filtered, attack=0.02, decay=0.03, sustain_level=0.4, release=0.05)
    return enveloped


def generate_footstep_wood():
    """Hollow knock: sine wave at 150Hz with 300Hz harmonic."""
    duration = 0.07

    fundamental = generate_sine(150, duration)
    fundamental = exponential_decay(fundamental, decay_rate=20)

    harmonic = generate_sine(300, duration)
    harmonic = exponential_decay(harmonic, decay_rate=20)

    result = mix([fundamental, harmonic], [0.7, 0.3])
    return result


def generate_footstep_water():
    """Splash: noise burst with bubble-like high-frequency bursts."""
    duration = 0.15

    # Base splash noise
    noise = generate_noise(duration)
    filtered = low_pass_filter(noise, window_size=15)

    # Add random bubble blips
    bubbles = [0] * len(filtered)
    num_bubbles = 5
    for _ in range(num_bubbles):
        bubble_start = random.randint(0, len(bubbles) - 1000)
        bubble_freq = random.randint(2000, 4000)
        bubble_duration = 0.01
        bubble = generate_sine(bubble_freq, bubble_duration)
        bubble = exponential_decay(bubble, decay_rate=30)

        for i, sample in enumerate(bubble):
            if bubble_start + i < len(bubbles):
                bubbles[bubble_start + i] += sample * 0.3

    result = mix([filtered, bubbles], [0.8, 0.4])
    result = apply_envelope(result, attack=0.005, decay=0.05, sustain_level=0.3, release=0.05)
    return result


def generate_chat_blip():
    """Two-tone ascending: 600Hz then 900Hz."""
    tone1 = generate_sine(600, 0.05)
    tone2 = generate_sine(900, 0.05)

    # Smooth transition
    tone1 = apply_envelope(tone1, attack=0.005, decay=0.01, sustain_level=0.8, release=0.01)
    tone2 = apply_envelope(tone2, attack=0.005, decay=0.01, sustain_level=0.8, release=0.02)

    result = tone1 + tone2
    return result


def generate_warp_swoosh():
    """Frequency sweep from 800Hz to 100Hz with echo."""
    duration = 0.5
    sweep = frequency_sweep(800, 100, duration)

    # Add envelope
    sweep = apply_envelope(sweep, attack=0.05, decay=0.1, sustain_level=0.7, release=0.2)

    # Add echo at 0.15s
    result = add_delay(sweep, delay_time=0.15, feedback=0.3)

    return result


def generate_harvest_pluck():
    """Pluck: triangle wave at 330Hz with 660Hz harmonic."""
    duration = 0.3

    fundamental = generate_triangle(330, duration)
    fundamental = exponential_decay(fundamental, decay_rate=5)

    harmonic = generate_triangle(660, duration)
    harmonic = exponential_decay(harmonic, decay_rate=6)

    result = mix([fundamental, harmonic], [0.7, 0.3])
    result = apply_envelope(result, attack=0.005, decay=0.05, sustain_level=0.3, release=0.1)
    return result


def generate_build_thump():
    """Construction: Low square wave at 80Hz plus high click."""
    duration = 0.2

    # Low thump
    thump = generate_square(80, 0.15)
    thump = low_pass_filter(thump, window_size=30)  # Soften square wave
    thump = exponential_decay(thump, decay_rate=8)

    # High click
    click = generate_sine(2000, 0.02)
    click = exponential_decay(click, decay_rate=40)

    # Pad to same length
    thump_padded = thump + [0] * (int(duration * SAMPLE_RATE) - len(thump))
    click_padded = click + [0] * (int(duration * SAMPLE_RATE) - len(click))

    result = mix([thump_padded, click_padded], [0.8, 0.4])
    return result


def generate_trade_ding():
    """Coin ding: sine waves at 1200Hz and 1500Hz with shimmer."""
    duration = 0.4

    tone1 = generate_sine(1200, duration)
    tone2 = generate_sine(1500, duration)

    # Mix tones
    result = mix([tone1, tone2], [0.6, 0.4])

    # Add frequency modulation for shimmer
    result = amplitude_modulation(result, mod_freq=8, depth=0.15)

    # Envelope with slow decay
    result = apply_envelope(result, attack=0.02, decay=0.1, sustain_level=0.5, release=0.25)

    return result


def generate_discover_sparkle():
    """Magic arpeggio: C5, E5, G5, C6 sequence."""
    frequencies = [523, 659, 784, 1047]  # C5, E5, G5, C6
    note_duration = 0.2
    note_spacing = 0.08

    total_duration = len(frequencies) * note_spacing + note_duration
    result = [0] * int(total_duration * SAMPLE_RATE)

    for i, freq in enumerate(frequencies):
        note = generate_sine(freq, note_duration)
        note = apply_envelope(note, attack=0.01, decay=0.05, sustain_level=0.6, release=0.1)

        start_sample = int(i * note_spacing * SAMPLE_RATE)
        for j, sample in enumerate(note):
            if start_sample + j < len(result):
                result[start_sample + j] += sample

    return result


def generate_portal_hum():
    """Portal ambient: Deep hum with amplitude modulation (loopable)."""
    duration = 2.0

    # Deep hums
    hum1 = generate_sine(65, duration)
    hum2 = generate_sine(130, duration)

    result = mix([hum1, hum2], [0.6, 0.4])

    # Slow amplitude modulation
    result = amplitude_modulation(result, mod_freq=1.5, depth=0.3)

    # Make loopable by fading in/out at edges
    fade_duration = 0.1
    fade_samples = int(fade_duration * SAMPLE_RATE)
    for i in range(fade_samples):
        fade = i / fade_samples
        result[i] *= fade
        result[-(i+1)] *= fade

    return result


def generate_ambient_wind():
    """Wind: Filtered noise with slow amplitude changes (loopable)."""
    duration = 3.0

    noise = generate_noise(duration)
    filtered = low_pass_filter(noise, window_size=40)

    # Slow random amplitude modulation
    result = amplitude_modulation(filtered, mod_freq=0.5, depth=0.4)

    # Make loopable
    fade_duration = 0.2
    fade_samples = int(fade_duration * SAMPLE_RATE)
    for i in range(fade_samples):
        fade = i / fade_samples
        result[i] *= fade
        result[-(i+1)] *= fade

    return result


def generate_ambient_water():
    """Stream/water: Filtered noise with bubble blips (loopable)."""
    duration = 3.0

    noise = generate_noise(duration)
    filtered = low_pass_filter(noise, window_size=25)

    # Scale down base noise
    filtered = [s * 0.5 for s in filtered]

    # Add occasional bubbles
    bubbles = [0] * len(filtered)
    num_bubbles = 15
    for _ in range(num_bubbles):
        bubble_start = random.randint(0, len(bubbles) - 2000)
        bubble_freq = random.randint(1500, 3500)
        bubble_duration = 0.015
        bubble = generate_sine(bubble_freq, bubble_duration)
        bubble = exponential_decay(bubble, decay_rate=25)

        for i, sample in enumerate(bubble):
            if bubble_start + i < len(bubbles):
                bubbles[bubble_start + i] += sample * 0.2

    result = mix([filtered, bubbles], [1.0, 1.0])

    # Make loopable
    fade_duration = 0.2
    fade_samples = int(fade_duration * SAMPLE_RATE)
    for i in range(fade_samples):
        fade = i / fade_samples
        result[i] *= fade
        result[-(i+1)] *= fade

    return result


def generate_notification():
    """Gentle bell: Sine at 800Hz with slow decay."""
    duration = 0.3

    tone = generate_sine(800, duration)
    result = exponential_decay(tone, decay_rate=3)
    result = apply_envelope(result, attack=0.01, decay=0.05, sustain_level=0.6, release=0.2)

    return result


# ============================================================================
# MAIN SCRIPT
# ============================================================================

def main():
    """Generate all sound effects."""
    output_dir = '/Users/kodyw/Projects/Zion/docs/assets/sounds/'

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    print(f"Output directory: {output_dir}\n")

    # Sound effects to generate
    sounds = [
        ('footstep_grass.wav', generate_footstep_grass),
        ('footstep_stone.wav', generate_footstep_stone),
        ('footstep_sand.wav', generate_footstep_sand),
        ('footstep_wood.wav', generate_footstep_wood),
        ('footstep_water.wav', generate_footstep_water),
        ('chat_blip.wav', generate_chat_blip),
        ('warp_swoosh.wav', generate_warp_swoosh),
        ('harvest_pluck.wav', generate_harvest_pluck),
        ('build_thump.wav', generate_build_thump),
        ('trade_ding.wav', generate_trade_ding),
        ('discover_sparkle.wav', generate_discover_sparkle),
        ('portal_hum.wav', generate_portal_hum),
        ('ambient_wind.wav', generate_ambient_wind),
        ('ambient_water.wav', generate_ambient_water),
        ('notification.wav', generate_notification),
    ]

    print("Generating sound effects...\n")

    file_info = []

    for filename, generator_func in sounds:
        filepath = os.path.join(output_dir, filename)

        print(f"Generating {filename}...", end=' ')
        samples = generator_func()
        write_wav(filepath, samples)

        file_size = os.path.getsize(filepath)
        duration = len(samples) / SAMPLE_RATE

        file_info.append((filename, file_size, duration))
        print(f"Done ({file_size:,} bytes, {duration:.2f}s)")

    # Print summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"{'Filename':<25} {'Size':<15} {'Duration':<15}")
    print("-"*70)

    total_size = 0
    for filename, file_size, duration in file_info:
        print(f"{filename:<25} {file_size:>10,} bytes   {duration:>6.2f}s")
        total_size += file_size

    print("-"*70)
    print(f"{'TOTAL':<25} {total_size:>10,} bytes")
    print("="*70)
    print(f"\nAll {len(sounds)} sound effects generated successfully!")
    print(f"Location: {output_dir}")


if __name__ == '__main__':
    main()
