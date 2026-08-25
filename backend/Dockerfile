# ── TrebleAI Backend ──────────────────────────────────────────────────────────
# Single image that bundles Python 3.10, Java 21 (for Audiveris), FluidSynth,
# and all Python dependencies.  Build context: the backend/ directory.
# ──────────────────────────────────────────────────────────────────────────────

# eclipse-temurin gives us Java 21 on Ubuntu 22.04 (Jammy) — official OpenJDK
FROM eclipse-temurin:21-jdk-jammy

# ── System packages ───────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.10 \
        python3.10-venv \
        python3-pip \
        # FluidSynth MIDI synthesiser (replaces the Windows .exe)
        fluidsynth \
        # OpenCV system libs (opencv-python-headless still needs these)
        libgl1-mesa-glx \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        # Tesseract — Audiveris uses it for text recognition on scores
        tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# ── Audiveris ─────────────────────────────────────────────────────────────────
# Audiveris 5.11+ ships platform-specific packages — no generic ZIP.
# We use the Ubuntu 22.04 .deb which matches this image's base (eclipse-temurin
# uses Ubuntu 22.04 / Jammy).  Download once from:
#   https://github.com/Audiveris/audiveris/releases
# File: Audiveris-5.11.0-ubuntu22.04-x86_64.deb
# Place it inside backend/audiveris-dist/ before running docker build.
COPY audiveris-dist/ /tmp/audiveris-dist/
RUN DEB=$(ls /tmp/audiveris-dist/Audiveris-*ubuntu*.deb | head -1) \
    # dpkg-deb --extract unpacks the .deb files directly into the filesystem
    # WITHOUT running any pre/post-install scripts. The post-install script only
    # adds a desktop menu shortcut (useless in a server container). Audiveris
    # works fine in batch mode without it. Java 21 is already in this image.
    && dpkg-deb --extract "$DEB" / \
    # Print where the launcher ended up so we can confirm AUDIVERIS_PATH below
    && find /opt /usr/bin /usr/local/bin /usr/share -name "audiveris" -o -name "Audiveris" 2>/dev/null | head -10 \
    && rm -rf /tmp/audiveris-dist

# ── Python dependencies ───────────────────────────────────────────────────────
WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────────
COPY . .

# Create runtime directories that the app writes into
RUN mkdir -p uploads

# ── Environment defaults ──────────────────────────────────────────────────────
# The .deb installer puts Audiveris on PATH — "Audiveris" works without a full path.
# If the build fails with "Audiveris not found", uncomment the line below and
# check the build log output of the RUN find command to get the actual path.
# RUN find /opt /usr -name "Audiveris" -type f 2>/dev/null | head -5
ENV AUDIVERIS_PATH=Audiveris
ENV FLUIDSYNTH_PATH=fluidsynth
ENV PYTHONPATH=/app

# ── Run ──────────────────────────────────────────────────────────────────────
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
