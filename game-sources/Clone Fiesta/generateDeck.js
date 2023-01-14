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
  '1199532078_677',
  '376198957_1413',
  '-2097872790_1023',
  '1842903990_1745',
  '-715072630_1524',
  '-742340345_1158',
  '-341849182_890',
  '-1819395490_1989',
  '-2094454736_1469',
  '301857551_1469',
  '-351098951_1151',
  '491298702_1589',
  '800088528_848',
  '-99297271_1260',
  '-1910687553_1261',
  '-672285569_1280',
  '-521961352_1118',
  '-1728039607_1132',
  '510435657_1788',
  '-1129932455_1145',
  '-380402457_1372',
  '-541626973_1297',
  '173495762_1445',
  '884433545_1559',
  '-419290704_1549',
  '-698361358_2573',
  '1415921317_1321',
  '-1413717691_1391',
  '1678459184_1513',
  '-391458135_1339',
  '-450669163_1354',
  '-1794819143_1208',
  '601171876_1639',
  '-1207122392_1851',
  '-249506588_1036',
  '1742807061_1047',
  '-1074259134_1666',
  '-1263676859_1251',
  '494594408_1772',
  '-207782737_1233',
  '-2083084777_765',
  '203601074_1323',
  '-1675817883_2278',
  '-902173673_1665',
  '908921431_1709',
  '1952655742_1445',
  '2060558806_1260',
  '214664360_1760',
  '-601863328_819',
  '-1621194635_1106',
  '-731727867_1304',
  '448610864_909',
  '-297556760_1522',
  '-1392697775_1054',
  '-1663991764_603',
  '-1460018808_1135',
  '-137524325_689'
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
