#!/bin/bash
# PixeLabs - install Ableton Live themes (macOS)
# Copies every .ask file next to this script into Ableton's Themes folder.
set -u
cd "$(dirname "$0")" || exit 1
shopt -s nullglob

asks=(*.ask */*.ask)
if [ ${#asks[@]} -eq 0 ]; then
  echo "No .ask files found next to this installer."
  echo "Put this script in the same folder as your themes and run it again."
  read -n 1 -s -r -p "Press any key to close."; echo; exit 1
fi

apps=(/Applications/Ableton\ Live*.app)
if [ ${#apps[@]} -eq 0 ]; then
  echo "No Ableton Live install found in /Applications."
  read -n 1 -s -r -p "Press any key to close."; echo; exit 1
fi

if [ ${#apps[@]} -gt 1 ]; then
  echo "Found more than one Ableton Live:"
  for i in "${!apps[@]}"; do echo "  [$i] $(basename "${apps[$i]}")"; done
  read -r -p "Which one? [0] " pick; pick="${pick:-0}"
else
  pick=0
fi
app="${apps[$pick]}"
dest="$app/Contents/App-Resources/Themes"

if [ ! -d "$dest" ]; then
  echo "Themes folder not found inside $(basename "$app")."
  read -n 1 -s -r -p "Press any key to close."; echo; exit 1
fi

if pgrep -x Live >/dev/null 2>&1; then
  echo "Ableton Live is running. Quit it first, then run this again."
  read -n 1 -s -r -p "Press any key to close."; echo; exit 1
fi

echo "Installing ${#asks[@]} theme(s) into:"
echo "  $dest"
echo
n=0
for f in "${asks[@]}"; do
  if cp "$f" "$dest/"; then echo "  ok  $(basename "$f")"; n=$((n+1));
  else echo "  FAILED  $(basename "$f")"; fi
done

echo
echo "Installed $n theme(s)."
echo "Open Live, then Preferences > Look/Feel > Theme."
echo
echo "Note: a Live update replaces the app and wipes these themes."
echo "Keep your .ask files and run this installer again afterwards."
read -n 1 -s -r -p "Press any key to close."; echo
