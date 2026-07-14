-- Treble AI PostgreSQL Database Explorer Session

-- 1. List all user tables in the database
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 2. Inspect table column layouts
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;

-- 3. View registered users
SELECT id, username, created_at, last_login FROM users;

-- 4. View active practice sessions (uploaded files, storage directories)
SELECT id, title, original_filename, storage_directory, created_at FROM practice_sessions;

-- 5. Inspect analysis reports details (keys, tempos, metadata from MusicXML)
-- Note: PostgreSQL supports the ->> operator to inspect fields within JSON blobs!
SELECT 
    id, 
    practice_session_id, 
    analysis_json->>'title' AS score_title,
    analysis_json->>'tempo' AS tempo,
    analysis_json->>'time_signature' AS time_signature,
    analysis_json->>'key_signature' AS key_signature,
    analysis_json->>'total_measures' AS total_measures
FROM analysis_reports;

-- 6. Check count of chatbot messages
SELECT 
    (SELECT COUNT(*) FROM theory_tutor_messages) AS theory_messages_count,
    (SELECT COUNT(*) FROM practice_messages) AS practice_messages_count;

-- 7. View practice room chat messages in detail
SELECT id, practice_chat_id, role, message, created_at FROM practice_messages ORDER BY created_at ASC LIMIT 50;

-- 8. View theory chat messages in detail
SELECT id, chat_id, role, message, created_at FROM theory_tutor_messages ORDER BY created_at ASC LIMIT 50;