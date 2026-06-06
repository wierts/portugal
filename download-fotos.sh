#!/bin/bash
# ============================================
# Portugal Roadtrip — Foto's downloaden
# Voer dit script uit vanuit de hoofdmap
# om alle benodigde foto's op te halen.
# ============================================

mkdir -p images

echo "📸 Foto's downloaden van Unsplash..."

# Hero (brede panoramafoto van Portugal)
curl -sL "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1600&q=85" \
  -o images/hero.jpg && echo "  ✅ hero.jpg"

# Porto
curl -sL "https://images.unsplash.com/photo-1568849676085-51415703900f?w=1200&q=85" \
  -o images/porto.jpg && echo "  ✅ porto.jpg"

# Douro-vallei
curl -sL "https://images.unsplash.com/photo-1548707309-dcebeab9ea9b?w=1200&q=85" \
  -o images/douro.jpg && echo "  ✅ douro.jpg"

# Aveiro (Canal)
curl -sL "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=85" \
  -o images/aveiro.jpg && echo "  ✅ aveiro.jpg"

# Nazaré
curl -sL "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=85" \
  -o images/nazare.jpg && echo "  ✅ nazare.jpg"

# Óbidos
curl -sL "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1200&q=85" \
  -o images/obidos.jpg && echo "  ✅ obidos.jpg"

# Sintra — Palácio da Pena
curl -sL "https://images.unsplash.com/photo-1571042416623-0e8b458bfe0a?w=1200&q=85" \
  -o images/sintra.jpg && echo "  ✅ sintra.jpg"

# Lissabon
curl -sL "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85" \
  -o images/lisbon.jpg && echo "  ✅ lisbon.jpg"

echo ""
echo "✨ Klaar! Foto's staan in de map 'images/'."
echo "   Zorg dat index.html en style.css in dezelfde map staan."
