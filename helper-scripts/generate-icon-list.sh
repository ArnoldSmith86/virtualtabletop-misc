node <<"EOF"
  const fs = require('fs')
  const fetch = require('node-fetch')
  async function getList() {
    const emojiKeywords = await(await fetch('https://raw.githubusercontent.com/muan/emojilib/main/dist/emoji-en-US.json')).json()
    const emojiGrouped  = await(await fetch('https://raw.githubusercontent.com/muan/unicode-emoji-json/main/data-by-group.json')).json()

    const materialText = await (await fetch('https://fonts.google.com/metadata/icons')).text()

    const result = {}

    for(const icon of JSON.parse(materialText.split("\n").slice(1).join('')).icons) {
      const cat = `Material Icons - ${icon.categories[0]}`
      if(!result[cat])
        result[cat] = {}
      result[cat][icon.name] = icon.tags.filter(i=>i!=icon.name)
    }

    for(const [ group, emojis ] of Object.entries(emojiGrouped)) {
      const cat = `Emojis - ${group}`
      if(!result[cat])
        result[cat] = {}
      for(const emoji of emojis)
        if(emoji.emoji_version < 13)
          result[cat][emoji.emoji] = emojiKeywords[emoji.emoji]
    }

    fs.writeFileSync('assets/fonts/symbols.json', JSON.stringify(result, null, '  '));
  }
  getList()
EOF
