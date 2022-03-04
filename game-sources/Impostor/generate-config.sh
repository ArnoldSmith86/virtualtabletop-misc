#!/bin/bash
# License: CC0 / public domain

defaultLocations=$(curl https://raw.githubusercontent.com/adrianocola/spyfall/master/app/consts.js | grep -Pv '^ *//' | tr -d '\n' | grep -Po 'DEFAULT_LOCATIONS = \K[^}]+\}' | sed -r 's/,\}/}/;s/[a-z_]+/"&"/g')
translations=$(curl https://raw.githubusercontent.com/adrianocola/spyfall/master/app/translations.js | grep -Pv '^ *//' | tr -d '\n' | grep -Po ' = \K\[[^[]+\]' | sed -r 's/,\]/]/;s/(id|name|short):/"\1":/g' | tr "'" '"')

langs=$(
  grep -Po '"id": "\K[^"]+' <<<"$translations" | while read lang; do
    echo "\"$lang\": $(curl https://raw.githubusercontent.com/adrianocola/spyfall/master/public/i18n/$lang.json | sed -r 's/&auml;/ä/g;s/&ouml;/ö/g;s/&uuml;/ü/g;s/&Auml;/Ä/g;s/&Ouml;/Ö/g;s/&Uuml;/Ü/g;s/&szlig;/ß/g;s/&ocirc;/ô/g;s/&eacute;/é/g;s/&Eacute;/É/g;s/&acirc;/â/g;s/&agrave;/à/g;s/&ecirc;/ê/g;s/&egrave;/è/g;s/&icirc;/î/g;s/&oelig;/œ/g;s/&ograve;/ò/g'),"
  done
)

cat <<EOF > config.json
{
  "id": "config",
  $langs
  "defaultLocations": $defaultLocations,
  "translations": $translations
}
EOF
