#!/bin/bash
# export_ml_portable.sh
# One-command export of everything needed for another machine

set -e

PROJECT_DIR="/home/essam/TIcketMe/ML"
BACKUP_DIR="$HOME/ml_portable_export_$(date +%Y%m%d_%H%M%S)"
OLLAMA_MODELS="/home/essam/.ollama/models"

echo "╔════════════════════════════════════════════╗"
echo "║  📦 ML Service Portable Export             ║"
echo "║     Creating portable package...           ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Step 1: Create backup directory
echo "📂 Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Step 2: Copy Ollama model
echo ""
echo "🚀 Copying Ollama neural-chat model (1.9GB)..."
echo "   This may take 2-3 minutes..."
cp -r "$OLLAMA_MODELS" "$BACKUP_DIR/ollama_models"
echo "   ✅ Done!"

# Step 3: Export ML service code
echo ""
echo "📦 Packaging ML service code..."
cd /home/essam/TIcketMe
tar --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.git' \
    --exclude='.DS_Store' \
    -czf "$BACKUP_DIR/ml_service.tar.gz" ML/
echo "   ✅ Done!"

# Step 4: Create import instructions
echo ""
echo "📝 Creating setup instructions..."
cat > "$BACKUP_DIR/SETUP.txt" << 'INSTRUCTIONS'
╔════════════════════════════════════════════════════════════╗
║  🚀 ML SERVICE PORTABLE SETUP                             ║
║     ⚡ Model included - NO ollama pull needed!            ║
╚════════════════════════════════════════════════════════════╝

📋 QUICK START ON NEW MACHINE (10 minutes):

1. Install prerequisites:
   • Python 3.12+
   • Ollama (https://ollama.ai) - installation only, no model download!

2. Create directories:
   mkdir -p ~/.ollama/models
   mkdir -p ~/TIcketMe

3. ⭐ RESTORE PRE-DOWNLOADED MODEL (skip ollama pull!):
   cp -r ollama_models/* ~/.ollama/models/

   ✅ Model is now ready - NO download needed!
   ⏩ Skip the "ollama pull neural-chat" step entirely

4. Extract service:
   cd ~/TIcketMe
   tar -xzf ml_service.tar.gz

5. Setup Python environment:
   cd ML
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt

6. Start services:
   bash start_services.sh

7. Verify everything works:
   curl http://localhost:8001/health

═══════════════════════════════════════════════════════════

⏱️ TIME BREAKDOWN:

   Ollama install:        2 min
   Restore model:         1 min (already decompressed!)
   Extract code:          1 min
   Python venv:           3 min
   Install dependencies:  2 min
   Start services:        1 min
   ────────────────────
   TOTAL:               ~10 minutes

   ✨ vs 45 minutes with model download!

📊 PACKAGE CONTENTS:

   ✅ ollama_models/          - neural-chat 7B (1.9GB, ready now)
   ✅ ml_service.tar.gz       - FastAPI code + configs
   ✅ requirements.txt         - Python dependencies
   ✅ start_services.sh        - Start Ollama + FastAPI
   ✅ stop_services.sh         - Stop services gracefully
   ✅ Documentation            - Guides & troubleshooting

🎯 KEY DIFFERENCES FROM SCRATCH INSTALL:

   ❌ No "ollama pull neural-chat" (already included)
   ❌ No model download (1.9GB saved)
   ⚡ Just restore, extract, setup venv, run!

🚨 DON'T FORGET:

   After step 3, DO NOT run: ollama pull neural-chat
   Model is already there! Just use it.

═══════════════════════════════════════════════════════════
INSTRUCTIONS

# Step 5: Copy documentation
echo "📄 Adding documentation..."
cp "$PROJECT_DIR/PORTABLE_BACKUP_GUIDE.md" "$BACKUP_DIR/"
cp "$PROJECT_DIR/README.md" "$BACKUP_DIR/"
cp "$PROJECT_DIR/QUICK_START.md" "$BACKUP_DIR/"
cp "$PROJECT_DIR/requirements.txt" "$BACKUP_DIR/"

# Step 6: Create summary
echo ""
echo "✅ Export complete!"
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  📦 PORTABLE PACKAGE READY                 ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "📂 Location: $BACKUP_DIR"
echo ""
echo "📊 Contents:"
du -sh "$BACKUP_DIR"/* | sort -h
echo "─────────────────────────────"
du -sh "$BACKUP_DIR" | awk '{print "Total: " $1}'
echo ""

# Create compressed archive option
echo "🔄 Creating compressed archive..."
ARCHIVE_NAME="ml_portable_$(date +%Y%m%d_%H%M%S).tar.gz"
cd "$HOME"
tar -czf "$ARCHIVE_NAME" "$(basename $BACKUP_DIR)"
echo ""
echo "✅ Archive created: $HOME/$ARCHIVE_NAME"
ARCHIVE_SIZE=$(du -sh "$HOME/$ARCHIVE_NAME" | awk '{print $1}')
echo "   Size: $ARCHIVE_SIZE"

echo ""
echo "🎯 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option 1: Copy folder (faster for local transfer)"
echo "   cp -r $BACKUP_DIR /destination/path/"
echo ""
echo "Option 2: Copy compressed archive (faster for network)"
echo "   scp $HOME/$ARCHIVE_NAME user@remote:"
echo ""
echo "On destination machine:"
echo "   1. Follow instructions in SETUP.txt"
echo "   2. Run: tar -xzf ml_portable_*.tar.gz"
echo "   3. cd into folder"
echo "   4. Follow setup steps"
echo ""
echo "✨ No model downloads needed! Everything is portable."
echo ""
