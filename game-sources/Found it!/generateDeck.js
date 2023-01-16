cardSize = 300;
imgSize = 80;
marginSize = 10;
order = 7;

images = [
  'https://game-icons.net/icons/000000/transparent/1x1/skoll/pig.svg',
  'https://game-icons.net/icons/000000/transparent/1x1/carl-olsen/mite-alt.svg',
  'https://game-icons.net/icons/000000/transparent/1x1/lorc/monkey.svg',
  'https://game-icons.net/icons/000000/transparent/1x1/lorc/raven.svg',
  'https://game-icons.net/icons/000000/transparent/1x1/lorc/turtle.svg',
  'https://game-icons.net/icons/000000/transparent/1x1/delapouite/dolphin.svg',
  'https://game-icons.net/icons/000000/transparent/1x1/delapouite/elephant.svg'
];

assets = {
  alligator: '/assets/-1142059970_4105',
  badger: '/assets/633481746_3779',
  bear: '/assets/-788375355_3073',
  budgie: '/assets/-627903596_3329',
  bumblebee: '/assets/-1181824906_3946',
  cat: '/assets/1865342611_3284',
  chicken: '/assets/-2059772795_3114',
  cow: '/assets/-1291405668_3362',
  crab: '/assets/-2073690269_4067',
  'cute-hamster': '/assets/1678817294_3843',
  deer: '/assets/1171056910_4049',
  dolphin: '/assets/98823136_2800',
  dove: '/assets/-1404895460_3671',
  elephant: '/assets/-681391038_3780',
  falcon: '/assets/1145207132_3843',
  dog: '/assets/-2068177991_3214',
  flamingo: '/assets/187429059_2635',
  fox: '/assets/-1228026417_4979',
  frog: '/assets/75120760_3680',
  grasshopper: '/assets/1328845448_3890',
  fish: '/assets/-562007761_4408',
  horse: '/assets/1728132071_3761',
  hummingbird: '/assets/2119222587_3552',
  kangaroo: '/assets/-787101912_3358',
  'kiwi-bird': '/assets/682478366_3031',
  leopard: '/assets/419785692_4984',
  hornet: '/assets/251736749_4126',
  lion: '/assets/1269360719_4299',
  llama: '/assets/115447566_3905',
  'monarch-butterfly': '/assets/-1875746126_6193',
  ladybird: '/assets/-751959701_3891',
  'mouse-animal': '/assets/1582561364_2496',
  orca: '/assets/-1033696795_3042',
  owl: '/assets/-1508525393_4825',
  panda: '/assets/1352247763_3469',
  octopus: '/assets/261276573_5194',
  peacock: '/assets/1727232612_4369',
  pig: '/assets/-1527338386_2988',
  prawn: '/assets/-1677154961_3550',
  'puffin-bird': '/assets/-1397689824_3073',
  parrot: '/assets/1753027870_4077',
  rhinoceros: '/assets/-234755794_3326',
  seal: '/assets/-275426705_2911',
  sheep: '/assets/-2018446013_3627',
  sloth: '/assets/1359005028_3748',
  rabbit: '/assets/1364668345_3025',
  snake: '/assets/1060898084_4166',
  squirrel: '/assets/933913136_3334',
  starfish: '/assets/-731317503_3483',
  stork: '/assets/547437232_2343',
  snail: '/assets/643356036_5260',
  turtle: '/assets/-629693569_4051',
  unicorn: '/assets/1894440290_3881',
  whale: '/assets/-963200866_3871',
  wolf: '/assets/-62787227_3417',
  swan: '/assets/-1522789521_2995',
  zebra: '/assets/1202716219_3703'
};

// `https://raw.githubusercontent.com/MacRusher/dobble-generator/master/src/images/animals/${i}.png`
images = 'alligator,badger,bear,budgie,bumblebee,cat,chicken,cow,crab,cute-hamster,deer,dog,dolphin,dove,elephant,falcon,fish,flamingo,fox,frog,grasshopper,hornet,horse,hummingbird,kangaroo,kiwi-bird,ladybird,leopard,lion,llama,monarch-butterfly,mouse-animal,octopus,orca,owl,panda,parrot,peacock,pig,prawn,puffin-bird,rabbit,rhinoceros,seal,sheep,sloth,snail,snake,squirrel,starfish,stork,swan,turtle,unicorn,whale,wolf,zebra'.split(',').map(i=>assets[i]);

images = [
  '1632990389_3021',
  '1310674530_1662',
  '-66888497_2391',
  '1831083997_2060',
  '-1499347270_2151',
  '-356203466_2601',
  '1944719593_3789',
  '178461537_2401',
  '1685624377_2870',
  '5635330_2620',
  '1147627572_3424',
  '-1967288424_3465',
  '517157253_2906',
  '1393222171_2735',
  '-2002504859_3486',
  '-963929738_2490',
  '-1266137705_2084',
  '1132167978_2635',
  '1315424084_2550',
  '-426045326_1596',
  '555653370_2376',
  '1879691312_3502',
  '-1764196643_1676',
  '2067243118_2914',
  '-529243224_1443',
  '-563770875_3474',
  '440465862_2464',
  '-3523863_1896',
  '173938980_2157',
  '-188386447_2027',
  '631280657_2937',
  '-1292616672_3083',
  '-1944350161_5443',
  '-1489666537_1768',
  '1345807405_1237',
  '1758387474_1921',
  '-1218465266_2540',
  '1263940053_4154',
  '1892521853_2209',
  '1694292744_2953',
  '-1929155708_2751',
  '-1056908540_1986',
  '-974533495_2746',
  '1827382991_3263',
  '1610015696_3197',
  '-1409815098_2444',
  '-27637343_2679',
  '-889858120_4486',
  '272862963_3422',
  '1514626878_2990',
  '142255067_2260',
  '-367186875_3416',
  '-1180442849_1789',
  '642239699_1145',
  '553502523_3470',
  '828961206_2210',
  '987268825_2828'
].map(a=>'/assets/'+a);

// copied from https://github.com/MacRusher/dobble-generator/blob/master/src/api/lib.ts

/**
 * Generate supported plains (dimensions) according to the Ray-Chaudhuri–Wilson theorem
 * n - prime number
 * @see https://math.stackexchange.com/questions/36798/what-is-the-math-behind-the-game-spot-it
 */
plains = [2, 3, 5, 7, 11].map(n=> ({
  n,
  symbols: n ** 2 + n + 1,
  symbolsPerCard: n + 1,
}));

/**
 * Generate unique cards for available plains
 * @see https://math.stackexchange.com/questions/1303497/what-is-the-algorithm-to-generate-the-cards-in-the-game-dobble-known-as-spo
 */
generateCards = n => {
  const d = [...Array(n).keys()];

  return shuffle([
    shuffle([...d, n]),
    ...d.flatMap(a => [
      shuffle([0, ...d.map(b => n + 1 + n * a + b)]),
      ...d.map(b =>
        shuffle([a + 1, ...d.map(c => n + 1 + n * c + ((a * c + b) % n))]),
      ),
    ]),
  ]);
};

// copied from https://www.w3docs.com/snippets/javascript/how-to-randomize-shuffle-a-javascript-array.html

function shuffle(values) {
  let index = values.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (index != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * index);
    index--;

    // And swap it with the current element.
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
  }

  return values;
}

// generate deck

cards = [];
imgCounts = 0;
for(const card of generateCards(order)) {
  const cardType = {};
  card.map(function(i, k) {
    cardType['img'+k] = images[i];
    cardType['width'+k] = imgSize/2+Math.floor(Math.random()*imgSize/2);
    cardType['rot'+k] = Math.floor(Math.random()*360);
    imgCounts = Math.max(imgCounts, k);
  });
  cards.push(cardType);
}

angle = 2*Math.PI/(imgCounts+1);

faceObjects = [];
for(i=0; i<=imgCounts; ++i) {
  faceObjects.push({
    type: 'image',
    x: (cardSize-imgSize-marginSize)/2+marginSize+Math.floor(Math.cos(angle*i) * (cardSize-imgSize-marginSize*2)/2),
    y: (cardSize-imgSize-marginSize)/2+marginSize+Math.floor(Math.sin(angle*i) * (cardSize-imgSize-marginSize*2)/2),
    color: 'transparent',
    height: imgSize,
    dynamicProperties: {
      value: 'img'+i,
      width: 'width'+i,
      rotation: 'rot'+i
    }
  });
}

console.log(JSON.stringify({
  type: 'deck',
  id: 'Main Deck',
  parent: 'Draw',
  cardDefaults: {
    width: cardSize,
    height: cardSize,
    borderRadius: cardSize,
    onPileCreation: {
      handlePosition: 'middle center',
      handleSize: 80,
      css: {
        ' .handle': {
          'pointer-events': 'none'
        }
      }
    }
  },
  cardTypes: cards,
  faceTemplates: [
    {
      objects: [
        {
          type: 'image',
          x: 0,
          y: 0,
          color: 'white',
          width: cardSize,
          height: cardSize,
          value: ''
        },
        ...faceObjects
      ]
    }
  ]
}, null, '  '));
