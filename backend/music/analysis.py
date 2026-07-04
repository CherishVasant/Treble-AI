import collections
import math
from pathlib import Path
from music21 import converter, key, meter, tempo, note, chord, roman, spanner, expressions, clef, dynamics

# Try to import formulas and fingerings from reference_data
try:
    from reference_data.formulas import FORMULAS
    from reference_data.fingerings import FINGERINGS
except ImportError:
    # Fallback default values if imported outside backend root
    FORMULAS = {
        "major_triad": [0, 4, 7],
        "minor_triad": [0, 3, 7],
        "diminished_triad": [0, 3, 6],
        "augmented_triad": [0, 4, 8],
        "suspended_fourth": [0, 5, 7],
        "dominant_seventh": [0, 4, 7, 10],
        "major_seventh": [0, 4, 7, 11],
        "minor_seventh": [0, 3, 7, 10],
        "half_diminished_seventh": [0, 3, 6, 10],
        "fully_diminished_seventh": [0, 3, 6, 9],
        "major_scale": [0, 2, 4, 5, 7, 9, 11],
        "natural_minor_scale": [0, 2, 3, 5, 7, 8, 10],
        "harmonic_minor_scale": [0, 2, 3, 5, 7, 8, 11],
        "melodic_minor_scale": [0, 2, 3, 5, 7, 9, 11]
    }
    FINGERINGS = {}

RELATIVE_KEYS = {
    "C Major": "A Minor", "G Major": "E Minor", "D Major": "B Minor", "A Major": "F# Minor",
    "E Major": "C# Minor", "B Major": "G# Minor", "F# Major": "D# Minor", "C# Major": "A# Minor",
    "F Major": "D Minor", "Bb Major": "G Minor", "Eb Major": "C Minor", "Ab Major": "F Minor",
    "Db Major": "Bb Minor", "Gb Major": "Eb Minor", "Cb Major": "Ab Minor",
    "A Minor": "C Major", "E Minor": "G Major", "B Minor": "D Major", "F# Minor": "A Major",
    "C# Minor": "E Major", "G# Minor": "B Major", "D# Minor": "F# Major", "A# Minor": "C# Major",
    "D Minor": "F Major", "G Minor": "Bb Major", "C Minor": "Eb Major", "F Minor": "Ab Major",
    "Bb Minor": "Db Major", "Eb Minor": "Gb Major", "Ab Minor": "Cb Major"
}


def analyze_keys_and_modulations(score, analyzed_key):
    """
    Key Analysis: Key signature, actual tonal center, relative major/minor,
    possible modal interpretation, and modulations.
    """
    key_sig = score.flat.getElementsByClass(key.KeySignature)
    sharps = key_sig[0].sharps if key_sig else 0
    
    # 1. Tonal Center
    tonal_center = analyzed_key.name
    key_mode = analyzed_key.mode
    
    # 2. Relative Major/Minor
    relative_key = RELATIVE_KEYS.get(tonal_center, "Unknown")
    
    # 3. Modal Interpretations
    # Get pitch-class frequencies based on note durations
    pc_durations = collections.defaultdict(float)
    total_duration = 0.0
    for n in score.flat.notes:
        dur = float(n.duration.quarterLength)
        total_duration += dur
        if isinstance(n, note.Note):
            pc_durations[n.pitch.pitchClass] += dur
        elif isinstance(n, chord.Chord):
            for p in n.pitches:
                pc_durations[p.pitchClass] += dur
                
    # Retain pitch classes representing at least 2% of duration
    active_pcs = {pc for pc, dur in pc_durations.items() if total_duration > 0 and (dur / total_duration) >= 0.02}
    
    modes = {
        "Ionian": [0, 2, 4, 5, 7, 9, 11],
        "Dorian": [0, 2, 3, 5, 7, 9, 10],
        "Phrygian": [0, 1, 3, 5, 7, 8, 10],
        "Lydian": [0, 2, 4, 6, 7, 9, 11],
        "Mixolydian": [0, 2, 4, 5, 7, 9, 10],
        "Aeolian": [0, 2, 3, 5, 7, 8, 10],
        "Locrian": [0, 1, 3, 5, 6, 8, 10]
    }
    
    modal_matches = []
    # Test all 12 tonics for modal similarities
    for t in range(12):
        t_name = note.Note(t).pitch.name
        for m_name, formula in modes.items():
            mode_pcs = {(t + step) % 12 for step in formula}
            # Compute Jaccard overlap
            if not active_pcs:
                similarity = 0.0
            else:
                intersection = active_pcs.intersection(mode_pcs)
                union = active_pcs.union(mode_pcs)
                similarity = len(intersection) / len(union) if union else 0.0
            if similarity > 0.6:
                modal_matches.append({
                    "mode": f"{t_name} {m_name}",
                    "similarity": round(similarity * 100, 1)
                })
    
    modal_matches = sorted(modal_matches, key=lambda x: x["similarity"], reverse=True)[:3]
    
    # 4. Modulations throughout the piece
    # Group measures into 4-measure sliding windows
    modulations = []
    try:
        measures = list(score.parts[0].getElementsByClass('Measure'))
    except Exception:
        measures = []
    num_measures = len(measures)
    
    if num_measures >= 4:
        prev_window_key = None
        for i in range(0, num_measures, 4):
            end = min(i + 4, num_measures)
            try:
                # Get sub-stream for this window
                sub_stream = score.measures(i + 1, end)
                w_key = sub_stream.analyze('key')
                if prev_window_key and w_key.name != prev_window_key.name:
                    modulations.append({
                        "measure": i + 1,
                        "from_key": prev_window_key.name,
                        "to_key": w_key.name
                    })
                prev_window_key = w_key
            except Exception:
                pass
                
    return {
        "key_signature_sharps": sharps,
        "tonal_center": tonal_center,
        "mode": key_mode,
        "relative_key": relative_key,
        "modal_interpretations": modal_matches,
        "modulations": modulations
    }


def analyze_chords(score, analyzed_key):
    """
    Chord Analysis: triads, seventh chords, inversions, extended, suspended.
    Returns: (list of chord info dicts, chordify stream)
    """
    chords_info = []
    try:
        chordified = score.chordify()
    except Exception:
        return [], None
        
    for c in chordified.flat.getElementsByClass(chord.Chord):
        if c.duration.quarterLength == 0:
            continue
            
        measure = c.measureNumber or 0
        offset = float(c.offset)
        pitches = [p.nameWithOctave for p in c.pitches]
        
        # Unique sorted pitch classes
        pcs = sorted(list(set(p.pitchClass for p in c.pitches)))
        if not pcs:
            continue
            
        chord_name = "Chromatic Harmony"
        root_name = ""
        inversion = 0
        matched = False
        
        # Formula matching
        for root_pc in pcs:
            offsets = sorted([(pc - root_pc) % 12 for pc in pcs])
            
            # Match offsets modulo 12 with formulas in registry
            for f_name, formula in FORMULAS.items():
                f_offsets = sorted([step % 12 for step in formula])
                if offsets == f_offsets:
                    root_name = note.Note(root_pc).pitch.name
                    chord_name = f"{root_name} {f_name.replace('_', ' ').capitalize()}"
                    
                    # Detect Inversion
                    bass_pc = c.bass().pitchClass
                    if bass_pc == root_pc:
                        inversion = 0
                    elif len(formula) > 1 and bass_pc == (root_pc + formula[1]) % 12:
                        inversion = 1
                    elif len(formula) > 2 and bass_pc == (root_pc + formula[2]) % 12:
                        inversion = 2
                    elif len(formula) > 3 and bass_pc == (root_pc + formula[3]) % 12:
                        inversion = 3
                    
                    matched = True
                    break
            if matched:
                break
                
        if not matched:
            # Fallback to music21
            try:
                root_name = c.root().name
                inversion = c.inversion()
                chord_name = f"{c.pitchedCommonName}"
            except Exception:
                try:
                    root_name = pitches[0][:-1] if pitches else "C"
                    chord_name = f"{root_name} Chord"
                except Exception:
                    pass
                    
        chords_info.append({
            "measure": measure,
            "offset": offset,
            "name": chord_name,
            "root": root_name,
            "inversion": inversion,
            "pitches": pitches,
            "music21_chord": c  # keep for Roman numeral lookup
        })
        
    return chords_info, chordified


def analyze_roman_numerals(chords_info, analyzed_key):
    """
    Roman Numeral Analysis: Convert every chord to Roman numeral and flag chromatic/borrowed.
    """
    rn_info = []
    for info in chords_info:
        c = info["music21_chord"]
        try:
            rn_obj = roman.romanNumeralFromChord(c, analyzed_key)
            rn_figure = rn_obj.figure
        except Exception:
            rn_figure = "N/A"
            
        # Analysis rules
        secondary_dominant = "/" in rn_figure
        
        borrowed = False
        if analyzed_key.mode == "major":
            # Typical borrowed chords in major from parallel minor
            if rn_figure in ["iv", "ii°", "bVI", "bIII", "bVII", "v"]:
                borrowed = True
        else:
            # Typical borrowed chords in minor from parallel major
            if rn_figure in ["IV", "ii", "I", "VI#"]:
                borrowed = True
                
        chromatic = secondary_dominant or borrowed or any(p[:-1] not in analyzed_key.pitchNames for p in info["pitches"])
        
        rn_info.append({
            "measure": info["measure"],
            "offset": info["offset"],
            "chord_name": info["name"],
            "roman_numeral": rn_figure,
            "secondary_dominant": secondary_dominant,
            "borrowed_chord": borrowed,
            "chromatic_harmony": chromatic
        })
        
    return rn_info


def detect_cadences(rn_info, analyzed_key):
    """
    Cadence Detection: Authentic, Plagal, Half, Deceptive cadences.
    """
    cadences = []
    if len(rn_info) < 2:
        return cadences
        
    for i in range(len(rn_info) - 1):
        c1 = rn_info[i]
        c2 = rn_info[i + 1]
        
        rn1 = c1["roman_numeral"]
        rn2 = c2["roman_numeral"]
        
        # Cleanup secondary dominant symbols for simple root match
        base_rn1 = rn1.split("/")[0].replace("7", "").replace("d", "")
        base_rn2 = rn2.split("/")[0].replace("7", "").replace("d", "")
        
        cad_type = None
        
        # 1. Perfect Authentic Cadence (PAC) & Imperfect Authentic Cadence (IAC)
        if base_rn1 in ["V", "vii°", "v"] and base_rn2 in ["I", "i"]:
            # PAC: V -> I, both root position
            if base_rn1 == "V" and base_rn2 in ["I", "i"]:
                cad_type = "Perfect Authentic Cadence"
            else:
                cad_type = "Imperfect Authentic Cadence"
                
        # 2. Plagal Cadence
        elif base_rn1 in ["IV", "iv"] and base_rn2 in ["I", "i"]:
            cad_type = "Plagal Cadence"
            
        # 3. Deceptive Cadence
        elif base_rn1 in ["V", "V7"] and base_rn2 in ["vi", "VI", "bVI"]:
            cad_type = "Deceptive Cadence"
            
        # 4. Half Cadence
        elif base_rn2 in ["V", "v"] and base_rn1 in ["I", "i", "ii", "ii°", "IV", "iv", "vi", "VI"]:
            cad_type = "Half Cadence"
            
        if cad_type:
            cadences.append({
                "measure": c2["measure"],
                "offset": c2["offset"],
                "type": cad_type,
                "progression": f"{rn1} -> {rn2}"
            })
            
    return cadences


def analyze_intervals(score):
    """
    Interval Analysis: Calculate melodic intervals and statistics.
    """
    # Extract melody sequence from the top part
    try:
        melody_notes = score.parts[0].flat.notes
    except Exception:
        melody_notes = score.flat.notes
        
    intervals_semitones = []
    prev_pitch = None
    
    for entry in melody_notes:
        if isinstance(entry, note.Note):
            curr_pitch = entry.pitch
        elif isinstance(entry, chord.Chord):
            curr_pitch = entry.pitches[-1]
        else:
            continue
            
        if prev_pitch:
            semitone_diff = curr_pitch.midi - prev_pitch.midi
            intervals_semitones.append(semitone_diff)
        prev_pitch = curr_pitch
        
    if not intervals_semitones:
        return {
            "total_intervals": 0,
            "most_common_interval": "None",
            "largest_leap": 0,
            "average_melodic_movement": 0.0
        }
        
    interval_mapping = {
        0: "Perfect Unison",
        1: "Minor 2nd",
        2: "Major 2nd",
        3: "Minor 3rd",
        4: "Major 3rd",
        5: "Perfect 4th",
        6: "Tritone",
        7: "Perfect 5th",
        8: "Minor 6th",
        9: "Major 6th",
        10: "Minor 7th",
        11: "Major 7th",
        12: "Perfect Octave"
    }
    
    mapped_intervals = []
    abs_leaps = []
    for semi in intervals_semitones:
        abs_semi = abs(semi)
        abs_leaps.append(abs_semi)
        name = interval_mapping.get(abs_semi, "Large Leap (> Octave)")
        mapped_intervals.append(name)
        
    counter = collections.Counter(mapped_intervals)
    most_common = counter.most_common(1)[0][0] if mapped_intervals else "None"
    largest_leap = max(abs_leaps) if abs_leaps else 0
    largest_leap_name = interval_mapping.get(largest_leap, f"Large Leap ({largest_leap} semitones)")
    avg_movement = sum(abs_leaps) / len(abs_leaps) if abs_leaps else 0.0
    
    return {
        "total_intervals": len(intervals_semitones),
        "most_common_interval": most_common,
        "largest_leap": largest_leap_name,
        "average_melodic_movement": round(avg_movement, 2)
    }


def analyze_rhythm(score):
    """
    Rhythm Analysis: Note duration, syncopation, tuplets, meter changes.
    """
    # 1. Note Durations
    durations_count = collections.Counter()
    syncopation_count = 0
    tuplet_count = 0
    
    duration_names = {
        4.0: "Whole Note",
        3.0: "Dotted Half Note",
        2.0: "Half Note",
        1.5: "Dotted Quarter Note",
        1.0: "Quarter Note",
        0.75: "Dotted Eighth Note",
        0.5: "Eighth Note",
        0.25: "Sixteenth Note"
    }
    
    # 2. Syncopation & Tuplets
    for n in score.flat.notes:
        # Check tuplets
        if n.duration.tuplets:
            tuplet_count += 1
            
        ql = float(n.duration.quarterLength)
        dur_name = duration_names.get(ql, f"Other ({ql} beats)")
        durations_count[dur_name] += 1
        
        # Syncopation check: start on off-beat and hold for at least 1 beat
        beat = float(n.beat)
        if (beat - int(beat)) > 0 and ql >= 1.0:
            syncopation_count += 1
            
    # 3. Repeated Rhythmic Motifs
    measure_rhythms = collections.Counter()
    try:
        melody_part = score.parts[0]
        for m in melody_part.getElementsByClass('Measure'):
            sig = tuple(float(nt.duration.quarterLength) for nt in m.flat.notes)
            if sig:
                measure_rhythms[sig] += 1
    except Exception:
        pass
        
    common_rhythmic_motifs = []
    for sig, count in measure_rhythms.most_common(3):
        if count >= 2:
            motif_str = " - ".join(f"{ql} beats" for ql in sig)
            common_rhythmic_motifs.append(f"{motif_str} (used {count} times)")
            
    # 4. Meter Changes
    time_signatures = []
    for ts in score.flat.getElementsByClass(meter.TimeSignature):
        time_signatures.append({
            "measure": ts.measureNumber or 1,
            "ratio": ts.ratioString
        })
        
    # 5. Pickup Measure
    has_pickup = False
    try:
        first_measure = score.parts[0].getElementsByClass('Measure')[0]
        if first_measure.duration.quarterLength < score.flat.getElementsByClass(meter.TimeSignature)[0].barDuration.quarterLength:
            has_pickup = True
    except Exception:
        pass
        
    return {
        "duration_distribution": dict(durations_count),
        "syncopations_detected": syncopation_count,
        "tuplets_detected": tuplet_count,
        "common_rhythmic_motifs": common_rhythmic_motifs,
        "meter_changes": time_signatures,
        "has_pickup_measure": has_pickup
    }


def detect_phrases(score, cadences):
    """
    Phrase Detection: Estimate phrase boundaries.
    """
    phrase_measures = set()
    
    # 1. Cadences as phrase endings
    for cad in cadences:
        phrase_measures.add(cad["measure"])
        
    # 2. Rests (duration >= 1.0 beat)
    try:
        for r in score.flat.getElementsByClass(note.Rest):
            if r.duration.quarterLength >= 1.0:
                phrase_measures.add(r.measureNumber)
    except Exception:
        pass
        
    # 3. Slurs
    try:
        for sl in score.flat.getElementsByClass(spanner.Slur):
            end_el = sl.getLast()
            if end_el and end_el.measureNumber:
                phrase_measures.add(end_el.measureNumber)
    except Exception:
        pass
        
    # 4. Long note values followed by note
    try:
        notes_list = list(score.flat.notes)
        for i in range(len(notes_list) - 1):
            n1 = notes_list[i]
            if n1.duration.quarterLength >= 3.0:
                phrase_measures.add(n1.measureNumber)
    except Exception:
        pass
        
    boundaries = sorted(list(phrase_measures))
    boundaries = [b for b in boundaries if b > 0]
    
    return boundaries


def detect_motifs(score):
    """
    Motif Detection: Find repeated melodic fragments.
    """
    try:
        melody_notes = score.parts[0].flat.notes
    except Exception:
        melody_notes = score.flat.notes
        
    melody_pitches = []
    for entry in melody_notes:
        if isinstance(entry, note.Note):
            melody_pitches.append(entry.pitch.midi)
        elif isinstance(entry, chord.Chord):
            melody_pitches.append(entry.pitches[-1].midi)
            
    intervals = []
    for i in range(len(melody_pitches) - 1):
        intervals.append(melody_pitches[i + 1] - melody_pitches[i])
        
    motif_len = 4
    subsequences = []
    for i in range(len(intervals) - motif_len + 1):
        subsequences.append(tuple(intervals[i:i+motif_len]))
        
    counter = collections.Counter(subsequences)
    repeated_motifs = []
    
    for sub, count in counter.most_common(5):
        if count >= 2:
            steps = []
            for val in sub:
                dir_str = "Up" if val > 0 else "Down" if val < 0 else "Unison"
                abs_val = abs(val)
                interval_names = {
                    0: "", 1: "m2", 2: "M2", 3: "m3", 4: "M3", 5: "P4",
                    6: "d5", 7: "P5", 8: "m6", 9: "M6", 10: "m7", 11: "M7", 12: "Octave"
                }
                step_name = interval_names.get(abs_val, f"{abs_val} semitones")
                steps.append(f"{dir_str} {step_name}".strip())
                
            repeated_motifs.append({
                "sequence": " -> ".join(steps),
                "count": count
            })
            
    return repeated_motifs


def analyze_difficulty(score, analyzed_key, key_info, rhythm_info, interval_info):
    """
    Difficulty Analysis: Hand span, note density, polyphony, leaps, ornaments.
    Produces score (1 to 10) and category.
    """
    max_span = 0
    chords_count = 0
    total_chord_pitches = 0
    for c in score.flat.getElementsByClass(chord.Chord):
        chords_count += 1
        total_chord_pitches += len(c.pitches)
        midis = [p.midi for p in c.pitches]
        if midis:
            span = max(midis) - min(midis)
            if span > max_span:
                max_span = span
                
    shortest_dur = 4.0
    for n in score.flat.notes:
        ql = float(n.duration.quarterLength)
        if 0 < ql < shortest_dur:
            shortest_dur = ql
            
    tempo_mark = score.flat.getElementsByClass(tempo.MetronomeMark)
    bpm = tempo_mark[0].number if tempo_mark else 120
    
    notes_per_second = (bpm / 60.0) * (1.0 / shortest_dur) if shortest_dur > 0 else 1.0
    
    accidental_notes = 0
    for n in score.flat.notes:
        if isinstance(n, note.Note):
            if n.pitch.accidental is not None and n.pitch.name not in analyzed_key.pitchNames:
                accidental_notes += 1
        elif isinstance(n, chord.Chord):
            for p in n.pitches:
                if p.accidental is not None and p.name not in analyzed_key.pitchNames:
                    accidental_notes += 1
                    
    avg_polyphony = total_chord_pitches / chords_count if chords_count > 0 else 1.0
    
    large_leaps = 0
    if "Large Leap" in interval_info["largest_leap"]:
        large_leaps += 5
        
    ornaments = 0
    for n in score.flat.notes:
        for exp in n.expressions:
            if isinstance(exp, (expressions.Trill, expressions.Mordent, expressions.Turn)):
                ornaments += 1
                
    sync_complexity = rhythm_info["syncopations_detected"]
    tuplet_complexity = rhythm_info["tuplets_detected"]
    
    score_points = 1.0
    
    if max_span > 12:
        score_points += 1.5
    elif max_span > 7:
        score_points += 0.8
        
    if notes_per_second > 6:
        score_points += 2.0
    elif notes_per_second > 3:
        score_points += 1.0
        
    sharps_flats = abs(key_info["key_signature_sharps"])
    if sharps_flats >= 5:
        score_points += 1.5
    elif sharps_flats >= 3:
        score_points += 0.8
        
    if accidental_notes > 20:
        score_points += 1.0
    elif accidental_notes > 5:
        score_points += 0.5
        
    if avg_polyphony > 3.0:
        score_points += 1.0
    elif avg_polyphony > 1.8:
        score_points += 0.5
        
    if sync_complexity > 5 or tuplet_complexity > 5:
        score_points += 1.5
    elif sync_complexity > 1 or tuplet_complexity > 1:
        score_points += 0.7
        
    if ornaments > 3 or large_leaps > 2:
        score_points += 1.5
    elif ornaments > 0 or large_leaps > 0:
        score_points += 0.7
        
    final_score = max(1.0, min(10.0, score_points))
    
    if final_score <= 3.4:
        category = "Beginner"
    elif final_score <= 6.9:
        category = "Intermediate"
    else:
        category = "Advanced"
        
    reasons = []
    if max_span > 12:
        reasons.append("Requires wide hand span (intervals larger than an octave)")
    if notes_per_second > 5:
        reasons.append("Fast tempo with dense sixteenth or thirty-second notes")
    if sharps_flats >= 4:
        reasons.append("Challenging key signature with multiple sharps or flats")
    if accidental_notes > 15:
        reasons.append("Frequent chromatic modulations and accidentals")
    if avg_polyphony > 2.5:
        reasons.append("Thick chordal texture and voice-leading complexity")
    if sync_complexity > 5:
        reasons.append("Syncopations require advanced rhythmic independence")
    if ornaments > 2:
        reasons.append("Requires execution of trills or turns")
        
    if not reasons:
        reasons.append("Straightforward diatonic reading, slow tempo, and narrow leaps")
        
    return {
        "difficulty_score": round(final_score, 1),
        "difficulty_category": category,
        "contributing_factors": reasons,
        "max_hand_span_semitones": max_span,
        "notes_per_second": round(notes_per_second, 1),
        "accidental_notes_count": accidental_notes,
        "average_chord_size": round(avg_polyphony, 1)
    }


def suggest_fingerings(score, analyzed_key, key_info):
    """
    Fingering Suggestions: database matching and heuristics.
    """
    key_name = key_info["tonal_center"]
    key_mode = key_info["mode"]
    
    right_fingering = ""
    left_fingering = ""
    source = "Heuristic rule"
    
    if FINGERINGS:
        formula_id = "major_scale" if key_mode == "major" else "natural_minor_scale"
        if formula_id in FINGERINGS and key_name in FINGERINGS[formula_id]:
            right_fingering = FINGERINGS[formula_id][key_name]["right"]
            left_fingering = FINGERINGS[formula_id][key_name]["left"]
            source = "Scale Database"
            
    try:
        melody_notes = list(score.parts[0].flat.notes)[:20]
    except Exception:
        melody_notes = list(score.flat.notes)[:20]
        
    pitches = []
    for n in melody_notes:
        if isinstance(n, note.Note):
            pitches.append(n.pitch.midi)
        elif isinstance(n, chord.Chord):
            pitches.append(n.pitches[-1].midi)
            
    fingers = []
    if pitches:
        curr_finger = 3
        fingers.append(curr_finger)
        
        for i in range(len(pitches) - 1):
            diff = pitches[i+1] - pitches[i]
            if diff == 0:
                fingers.append(curr_finger)
            elif diff > 0:
                step = 1 if diff <= 2 else 2
                next_finger = curr_finger + step
                if next_finger > 5:
                    next_finger = 1
                curr_finger = next_finger
                fingers.append(curr_finger)
            else:
                step = 1 if abs(diff) <= 2 else 2
                next_finger = curr_finger - step
                if next_finger < 1:
                    next_finger = 4 if abs(diff) > 2 else 3
                curr_finger = next_finger
                fingers.append(curr_finger)
                
    heuristic_fingering = "-".join(str(f) for f in fingers) if fingers else "N/A"
    
    return {
        "scale_fingerings": {
            "key": f"{key_name} {key_mode.capitalize()}",
            "right_hand": right_fingering or "1-2-3-1-2-3-4-5 (Default)",
            "left_hand": left_fingering or "5-4-3-2-1-3-2-1 (Default)",
            "source": source
        },
        "melodic_passage_fingering_suggestion": heuristic_fingering
    }


def analyze_score(mxl_path: str) -> dict:
    """
    Main entry point for parsing score and compiling the deterministic analysis report.
    """
    path_obj = Path(mxl_path)
    if not path_obj.exists():
        raise FileNotFoundError(f"MusicXML file not found: {mxl_path}")
        
    score = converter.parse(str(path_obj))
    
    title = ""
    composer = ""
    if score.metadata:
        title = score.metadata.title or ""
        composer = score.metadata.composer or ""
        
    analyzed_key = score.analyze('key')
    
    times = score.flat.getElementsByClass(meter.TimeSignature)
    time_signature = times[0].ratioString if times else "4/4"
    
    tempos = score.flat.getElementsByClass(tempo.MetronomeMark)
    tempo_bpm = f"{tempos[0].number} bpm" if tempos else "120 bpm"
    
    total_measures = 0
    parts_info = []
    for part in score.parts:
        measures_count = len(part.getElementsByClass('Measure'))
        part_info = {
            "name": part.partName or "Unknown Part",
            "measures_count": measures_count,
        }
        parts_info.append(part_info)
        if not total_measures:
            total_measures = measures_count
            
    notes_and_chords = score.flat.notes
    note_sequence = []
    for nc in list(notes_and_chords)[:100]:
        if isinstance(nc, note.Note):
            note_sequence.append(f"{nc.nameWithOctave} ({nc.duration.quarterLength} beats)")
        elif isinstance(nc, chord.Chord):
            pitches = [p.nameWithOctave for p in nc.pitches]
            note_sequence.append(f"Chord:{'+'.join(pitches)} ({nc.duration.quarterLength} beats)")
    note_summary = ", ".join(note_sequence)
    
    note_events = []
    try:
        flat_score = score.flatten()
        for entry in flat_score.secondsMap:
            el = entry.get('element')
            offset_sec = entry.get('offsetSeconds')
            dur_sec = entry.get('durationSeconds')
            start_val = float(offset_sec) if offset_sec is not None else 0.0
            dur_val = float(dur_sec) if dur_sec is not None else 0.0
            
            if isinstance(el, note.Note):
                note_events.append({
                    "start": start_val,
                    "duration": dur_val,
                    "midi": int(el.pitch.midi)
                })
            elif isinstance(el, chord.Chord):
                for p in el.pitches:
                    note_events.append({
                        "start": start_val,
                        "duration": dur_val,
                        "midi": int(p.midi)
                    })
    except Exception:
        pass
        
    key_analysis = analyze_keys_and_modulations(score, analyzed_key)
    chords_info, chordified = analyze_chords(score, analyzed_key)
    roman_numerals = analyze_roman_numerals(chords_info, analyzed_key)
    cadences = detect_cadences(roman_numerals, analyzed_key)
    intervals = analyze_intervals(score)
    rhythm = analyze_rhythm(score)
    phrases = detect_phrases(score, cadences)
    motifs = detect_motifs(score)
    difficulty = analyze_difficulty(score, analyzed_key, key_analysis, rhythm, intervals)
    fingerings = suggest_fingerings(score, analyzed_key, key_analysis)
    
    serializable_chords = []
    for c in chords_info:
        serializable_chords.append({
            "measure": c["measure"],
            "offset": c["offset"],
            "name": c["name"],
            "root": c["root"],
            "inversion": c["inversion"],
            "pitches": c["pitches"]
        })
        
    report = {
        "title": title,
        "composer": composer,
        "key_signature": f"{analyzed_key.name} ({abs(key_analysis['key_signature_sharps'])} sharps/flats)",
        "time_signature": time_signature,
        "tempo": tempo_bpm,
        "total_measures": total_measures,
        "parts": parts_info,
        "note_summary": note_summary,
        "notes": note_events,
        
        "key_analysis": key_analysis,
        "chord_list": serializable_chords,
        "roman_numerals": roman_numerals,
        "cadences": cadences,
        "intervals": intervals,
        "rhythm": rhythm,
        "phrases": phrases,
        "motifs": motifs,
        "difficulty": difficulty,
        "fingerings": fingerings
    }
    
    return report
