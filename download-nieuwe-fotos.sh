#!/bin/bash
# Download script voor de nieuwe foto's van de Portugal roadtrip site
# Gebruik: plaats dit script in je images/ map en run: bash download-nieuwe-fotos.sh
# Dit overschrijft de bestaande bestanden, dus de HTML hoeft niet aangepast te worden.
# Bron: Unsplash (gratis te gebruiken, geen naamsvermelding verplicht)

set -e

echo "Dag 1 - Porto (brug bij zonsondergang)..."
curl -L -o "porto.jpg" "https://images.unsplash.com/photo-1513735492246-483525079686?fm=jpg&q=85&w=2400"

echo "Dag 2 - Douro-vallei (rivier tussen de terrassen)..."
curl -L -o "douro.jpg" "https://images.unsplash.com/photo-1717451062577-486c76785d25?fm=jpg&q=85&w=2400"

echo "Dag 3 - Aveiro (kleurrijke boten aan het kanaal)..."
curl -L -o "aveiro.jpg" "https://images.unsplash.com/photo-1758193465547-b3856617a212?fm=jpg&q=85&w=2400"

echo "Dag 4 - Nazare (fort/vuurtoren op de klif)..."
curl -L -o "nazare.jpg" "https://images.unsplash.com/photo-1670097937762-943d7f0e8d80?fm=jpg&q=85&w=2400"

echo "Dag 5 - Obidos (kasteel boven het stadje)..."
curl -L -o "obidos.jpg" "https://images.unsplash.com/photo-1742122208689-6f1f093a8e54?fm=jpg&q=85&w=2400"

echo "Dag 6 - Sintra (Palacio da Pena)..."
curl -L -o "sintra.jpg" "https://images.unsplash.com/photo-1731273500789-7c9defe5a483?fm=jpg&q=85&w=2400"

echo "Dag 7 - Lissabon (gele trams)..."
curl -L -o "lisbon.jpg" "https://images.unsplash.com/photo-1697748525265-7431cba075b6?fm=jpg&q=85&w=2400"

echo ""
echo "Klaar! 7 foto's overschreven:"
ls -la porto.jpg douro.jpg aveiro.jpg nazare.jpg obidos.jpg sintra.jpg lisbon.jpg
