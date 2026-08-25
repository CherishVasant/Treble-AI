import os
import json

def extract_and_anonymize():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    uploads_dir = os.path.join(base_dir, "backend", "uploads")
    
    # Target folders (pre-identified from our workspace analysis)
    folder_a = "9720c514-fe73-4572-9f0f-abd461eab393" # Originally Fur Elise
    folder_b = "01694afb-7c47-4420-8f92-e8fabf96fb32" # Originally Sthothiram
    
    path_a = os.path.join(uploads_dir, folder_a, "analysis_report.json")
    path_b = os.path.join(uploads_dir, folder_b, "analysis_report.json")
    
    data_out = {
        "pieces": []
    }
    
    # Process Piece A
    if os.path.exists(path_a):
        with open(path_a, "r") as f:
            raw_a = json.load(f)
            
        piece_a = {
            "id": "sample_piece_a",
            "name": "Sample Piece A",
            "composer": "Anonymous",
            "key_signature": raw_a.get("key_signature", "Unknown"),
            "time_signature": raw_a.get("time_signature", "Unknown"),
            "tempo": raw_a.get("tempo", "Unknown"),
            "total_measures": raw_a.get("total_measures", 0),
            "difficulty": {
                "difficulty_score": raw_a.get("difficulty", {}).get("difficulty_score", 0),
                "difficulty_category": raw_a.get("difficulty", {}).get("difficulty_category", "Unknown"),
                "max_hand_span_semitones": raw_a.get("difficulty", {}).get("max_hand_span_semitones", 0),
                "notes_per_second": raw_a.get("difficulty", {}).get("notes_per_second", 0),
                "accidental_notes_count": raw_a.get("difficulty", {}).get("accidental_notes_count", 0),
                "average_chord_size": raw_a.get("difficulty", {}).get("average_chord_size", 0)
            },
            "diatonicity": {
                "ratio_percentage": raw_a.get("diatonicity", {}).get("ratio_percentage", 0),
                "total_notes_counted": raw_a.get("diatonicity", {}).get("total_notes_counted", 0),
                "diatonic_notes_count": raw_a.get("diatonicity", {}).get("diatonic_notes_count", 0),
                "chromatic_notes_count": raw_a.get("diatonicity", {}).get("chromatic_notes_count", 0)
            },
            "intervals": {
                "total_intervals": raw_a.get("intervals", {}).get("total_intervals", 0),
                "most_common_interval": raw_a.get("intervals", {}).get("most_common_interval", "None"),
                "largest_leap": raw_a.get("intervals", {}).get("largest_leap", "None"),
                "average_melodic_movement": raw_a.get("intervals", {}).get("average_melodic_movement", 0)
            },
            "voice_leading_errors_count": len(raw_a.get("voice_leading_errors", [])),
            "voice_leading_errors": [], # Clean and anonymized if empty
            "rhythm": {
                "duration_distribution": raw_a.get("rhythm", {}).get("duration_distribution", {}),
                "syncopations_detected": raw_a.get("rhythm", {}).get("syncopations_detected", 0)
            },
            "key_analysis": {
                "modal_interpretations": raw_a.get("key_analysis", {}).get("modal_interpretations", []),
                "modulations": []
            }
        }
        data_out["pieces"].append(piece_a)
    else:
        print(f"Warning: Path not found: {path_a}")
        
    # Process Piece B
    if os.path.exists(path_b):
        with open(path_b, "r") as f:
            raw_b = json.load(f)
            
        piece_b = {
            "id": "sample_piece_b",
            "name": "Sample Piece B",
            "composer": "Anonymous",
            "key_signature": raw_b.get("key_signature", "Unknown"),
            "time_signature": raw_b.get("time_signature", "Unknown"),
            "tempo": raw_b.get("tempo", "Unknown"),
            "total_measures": raw_b.get("total_measures", 0),
            "difficulty": {
                "difficulty_score": raw_b.get("difficulty", {}).get("difficulty_score", 0),
                "difficulty_category": raw_b.get("difficulty", {}).get("difficulty_category", "Unknown"),
                "max_hand_span_semitones": raw_b.get("difficulty", {}).get("max_hand_span_semitones", 0),
                "notes_per_second": raw_b.get("difficulty", {}).get("notes_per_second", 0),
                "accidental_notes_count": raw_b.get("difficulty", {}).get("accidental_notes_count", 0),
                "average_chord_size": raw_b.get("difficulty", {}).get("average_chord_size", 0)
            },
            "diatonicity": {
                "ratio_percentage": raw_b.get("diatonicity", {}).get("ratio_percentage", 0),
                "total_notes_counted": raw_b.get("diatonicity", {}).get("total_notes_counted", 0),
                "diatonic_notes_count": raw_b.get("diatonicity", {}).get("diatonic_notes_count", 0),
                "chromatic_notes_count": raw_b.get("diatonicity", {}).get("chromatic_notes_count", 0)
            },
            "intervals": {
                "total_intervals": raw_b.get("intervals", {}).get("total_intervals", 0),
                "most_common_interval": raw_b.get("intervals", {}).get("most_common_interval", "None"),
                "largest_leap": raw_b.get("intervals", {}).get("largest_leap", "None"),
                "average_melodic_movement": raw_b.get("intervals", {}).get("average_melodic_movement", 0)
            },
            "voice_leading_errors_count": len(raw_b.get("voice_leading_errors", [])),
            "voice_leading_errors": [
                {
                    "measure": err.get("measure"),
                    "type": err.get("type"),
                    "voice_lower": err.get("voice_lower"),
                    "voice_higher": err.get("voice_higher")
                } for err in raw_b.get("voice_leading_errors", [])
            ],
            "rhythm": {
                "duration_distribution": raw_b.get("rhythm", {}).get("duration_distribution", {}),
                "syncopations_detected": raw_b.get("rhythm", {}).get("syncopations_detected", 0)
            },
            "key_analysis": {
                "modal_interpretations": raw_b.get("key_analysis", {}).get("modal_interpretations", []),
                "modulations": [
                    {
                        "measure": mod.get("measure"),
                        "from_key": mod.get("from_key"),
                        "to_key": mod.get("to_key")
                    } for mod in raw_b.get("key_analysis", {}).get("modulations", [])
                ]
            }
        }
        data_out["pieces"].append(piece_b)
    else:
        print(f"Warning: Path not found: {path_b}")
        
    # Write to report_data.json
    out_path = os.path.join(base_dir, "report_data.json")
    with open(out_path, "w") as f:
        json.dump(data_out, f, indent=2)
    print(f"Success! Extracted and anonymized report data written to {out_path}")

if __name__ == "__main__":
    extract_and_anonymize()
