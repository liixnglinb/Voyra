import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ============================================================
   完美世界 · 视觉小说体验页 v2.0
   - 完整剧情线，主线都是石昊
   - 章节系统：显示篇章和对应小说章节
   - 背景介绍：让读者读懂剧情
   - 风格：微光粒子，发光边框，柔和渐变，画面通透干净
   - 更成熟的视觉风格，减少卡通感
   ============================================================ */

// ===== 背景图片（使用免费图片服务） =====
const BG_IMAGES = {
  shicun: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', // 山脉晨雾
  dahuang: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80', // 大荒群山
  xuanshen: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80', // 神秘光芒
  zhandou: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=80', // 战斗氛围
  xianyu: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1920&q=80', // 仙境星空
  bianhuang: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80', // 边荒宇宙
  heian: 'https://images.unsplash.com/photo-1504333638930-c8787321eee0?w=1920&q=80', // 黑暗动乱
  dadu: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=80', // 大道归一
};

// ===== 角色配置 =====
const CHARACTERS = {
  shihao: {
    name: '石昊',
    title: '荒天帝',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    description: '乱古末期修士，天资万古无双，为修道而生，为应劫而至',
  },
  liushen: {
    name: '柳神',
    title: '石村祭灵',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    description: '曾是在异域九进九出的祖祭灵，后化为柳树守护石村',
  },
  shiyi: {
    name: '石毅',
    title: '重瞳者',
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
    description: '石昊堂兄，天生重瞳，自幼夺走石昊的至尊骨',
  },
  anlan: {
    name: '安澜',
    title: '不朽之王',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
    description: '异域不朽之王，霸气绝伦，"仙之巅，傲世间，有我安澜便有天！"',
  },
  huoer: {
    name: '火灵儿',
    title: '火国公主',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    description: '下界火国公主，石昊妻子，在火桑林成婚',
  },
  yunxi: {
    name: '云曦',
    title: '天人族神女',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
    description: '天人族神女，石昊妻子，后结为道侣',
  },
  qingyi: {
    name: '清漪',
    title: '补天教圣女',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)',
    description: '月婵次身，补天教圣女，与石昊纠缠一生',
  },
  mengtian: {
    name: '孟天正',
    title: '边荒领袖',
    color: '#78716C',
    gradient: 'linear-gradient(135deg, #78716C 0%, #A8A29E 100%)',
    description: '边荒领袖，逆行伐仙，守护九天十地',
  },
};

// ===== 篇章配置 =====
const CHAPTERS = {
  xu: { name: '序章·大荒', novelChapter: '序章', description: '夜已深，漆黑一片。群山万壑间，洪荒猛兽横行，太古遗种出没。' },
  xiaci: { name: '第一卷·石村篇', novelChapter: '第1-200章', description: '一个少年从大荒中走出，一切从这里开始……' },
  xuanshen: { name: '第二卷·虚神界', novelChapter: '第201-500章', description: '虚神界中，石昊一路横推，打破各种纪录，终斩石毅。' },
  shangjie: { name: '第三卷·上界篇', novelChapter: '第501-1000章', description: '初入上界三千州，争霸仙古，扬名天神书院。' },
  bianhuang: { name: '第四卷·边荒篇', novelChapter: '第1001-1500章', description: '边荒磨炼，异域败帝族，战安澜，红尘成仙。' },
  heian: { name: '第五卷·黑暗动乱', novelChapter: '第1501-1800章', description: '黑暗动乱爆发，石昊平定黑祸，守护苍生。' },
  dadi: { name: '第六卷·独断万古', novelChapter: '第1801-2016章', description: '他化自在大成，晋仙帝，一剑隔断万古。' },
};

// ===== 故事数据 =====
const STORY_DATA = {
  // ===== 序章·大荒 =====
  start: {
    id: 'start',
    chapter: 'xu',
    bg: 'dahuang',
    character: 'liushen',
    characterName: '柳神',
    text: '夜已深，漆黑一片，景物不可见。但山中并不宁静，猛兽咆哮，震动山河，万木摇颤，乱叶簌簌坠落。群山万壑间，洪荒猛兽横行，太古遗种出没，各种可怕的声音在黑暗中此起彼伏，直欲裂开这天地。山脉中，远远望去有一团柔和的光隐现，在这黑暗无尽的夜幕下与万山间犹如一点烛火在摇曳，随时会熄灭。渐渐接近，可以看清那里有半截巨大的枯木，树干直径足有十几米，通体焦黑。除却半截主干外，它只剩下了一条柔弱的枝条，但却在散发着生机，枝叶晶莹如绿玉刻成，点点柔和的光扩散，将一个村子笼罩。',
    choices: [
      { text: '走近石村', next: 'shicun' },
      { text: '观察柳神', next: 'liushen_intro' },
    ],
  },
  shicun: {
    id: 'shicun',
    chapter: 'xu',
    bg: 'shicun',
    character: 'shihao',
    characterName: '小不点',
    text: '村中各户都是石屋，夜深人静，这里祥和而安谧，像是与外界的黑暗还有兽吼隔绝了。一个约莫三四岁的孩子，小脸脏兮兮的，正坐在柳树下，望着星空出神。他叫石昊，是石村的孩子，也是未来的荒天帝。他还不知道自己天生至尊骨被挖去的命运，此刻只是一个无忧无虑的小不点。',
    choices: [
      { text: '开始修行', next: 'xiaci_cultivation' },
      { text: '回忆身世', next: 'shihao_origin' },
    ],
  },
  liushen_intro: {
    id: 'liushen_intro',
    chapter: 'xu',
    bg: 'dahuang',
    character: 'liushen',
    characterName: '柳神',
    text: '确切的说，这是一株雷击木，在很多年前曾经遭遇过通天的闪电，老柳树巨大的树冠与旺盛的生机被摧毁了。如今地表上只剩下八九米高的一段树桩，粗的惊人，而那仅有的一条柳枝如绿霞神链般，光晕弥漫，笼罩与守护住了整个村子。她就是在异域九进九出的祖祭灵——柳神。她看着石村，看着那个孩子，眼中有着无尽的温柔与期待。',
    choices: [
      { text: '走近石村', next: 'shicun' },
      { text: '聆听教诲', next: 'liushen_teach' },
    ],
  },
  liushen_teach: {
    id: 'liushen_teach',
    chapter: 'xu',
    bg: 'dahuang',
    character: 'liushen',
    characterName: '柳神',
    text: '"小不点，你来了。"柳神的声音柔和而空灵，仿佛从远古传来。"你天生至尊骨，却被恶人夺去，这是你的劫，也是你的缘。记住——一粒尘可填海，一根草斩尽日月星辰。你的路，需要你自己走。"石昊似懂非懂地点点头，眼中却闪烁着坚定的光芒。',
    choices: [
      { text: '开始修行', next: 'xiaci_cultivation' },
      { text: '询问前路', next: 'xiaci_path' },
    ],
  },
  shihao_origin: {
    id: 'shihao_origin',
    chapter: 'xu',
    bg: 'shicun',
    character: 'shihao',
    characterName: '石昊',
    text: '石昊，出生在下界荒域石国武王府。他本是天生至尊，但在很小的时候却被家族之人挖去至尊骨，接在了他的同性哥哥石毅身上，而他却濒临死亡。他的父母为了救他，把他放在了石族祖地——石村，便出去给他寻找灵药。从此，石昊在石村长大，由柳神守护。',
    choices: [
      { text: '开始修行', next: 'xiaci_cultivation' },
      { text: '询问柳神', next: 'liushen_teach' },
    ],
  },

  // ===== 第一卷·石村篇 =====
  xiaci_cultivation: {
    id: 'xiaci_cultivation',
    chapter: 'xiaci',
    bg: 'dahuang',
    character: 'shihao',
    characterName: '石昊',
    text: '搬血境，是修行的第一步。石昊虽然失去了至尊骨，但他的天赋依然惊人。在柳神的指导下，他开始了艰苦的修行。搬血境时，他便能单臂一晃举起十万八千斤重物，远超普通修士。他的眼中燃烧着不屈的火焰——他要变强，强到没有人能再伤害他身边的人。',
    choices: [
      { text: '进入洞天境', next: 'xiaci_dongtian' },
      { text: '前往补天阁', next: 'xiaci_bugei' },
    ],
  },
  xiaci_path: {
    id: 'xiaci_path',
    chapter: 'xiaci',
    bg: 'dahuang',
    character: 'shihao',
    characterName: '石昊',
    text: '"柳神，我要走一条什么样的路？"石昊问道。柳神沉默片刻，轻声道："你的路，前无古人。你需要在每一个境界都修炼到极致，走出一条属于自己的道。记住，路有错，并非错，当你认为踏过的路皆对，才是最可怜的。"石昊若有所思，眼中渐渐有了光芒。',
    choices: [
      { text: '开始修行', next: 'xiaci_cultivation' },
      { text: '前往补天阁', next: 'xiaci_bugei' },
    ],
  },
  xiaci_dongtian: {
    id: 'xiaci_dongtian',
    chapter: 'xiaci',
    bg: 'dahuang',
    character: 'shihao',
    characterName: '石昊',
    text: '洞天境，是修行的第二重境界。石昊成功开辟第十洞天，这是前无古人的成就。而后，他更是将十大洞天合一，开创了独一无二的修炼之路。他的实力突飞猛进，开始在荒域崭露头角。补天阁、百断山、鲲鹏巢……到处都留下了他的足迹。',
    choices: [
      { text: '前往虚神界', next: 'xuanshen_enter' },
      { text: '百断山历练', next: 'xiaci_baiduan' },
    ],
  },
  xiaci_bugei: {
    id: 'xiaci_bugei',
    chapter: 'xiaci',
    bg: 'dahuang',
    character: 'shihao',
    characterName: '石昊',
    text: '补天阁，是荒域的一大势力。石昊在这里学习宝术，结识了不少朋友。然而，补天阁后来被灭，石昊在逃亡中不断成长。他发誓，总有一天，他要变得足够强，强到能守护所有他想守护的人。',
    choices: [
      { text: '进入洞天境', next: 'xiaci_dongtian' },
      { text: '前往虚神界', next: 'xuanshen_enter' },
    ],
  },
  xiaci_baiduan: {
    id: 'xiaci_baiduan',
    chapter: 'xiaci',
    bg: 'dahuang',
    character: 'huoer',
    characterName: '火灵儿',
    text: '百断山，石昊在这里遇到了火灵儿。她是火国的公主，活泼直率，重情义、明事理。两人在百断山中几经离合，渐生情愫。火灵儿看着石昊，眼中有着说不清的情意："你这个人，真是让人放心不下。"石昊笑了笑："放心，我命硬。"',
    choices: [
      { text: '前往虚神界', next: 'xuanshen_enter' },
      { text: '继续历练', next: 'xiaci_dongtian' },
    ],
  },

  // ===== 第二卷·虚神界 =====
  xuanshen_enter: {
    id: 'xuanshen_enter',
    chapter: 'xuanshen',
    bg: 'xuanshen',
    character: 'shihao',
    characterName: '石昊',
    text: '虚神界，是上古大能创造的精神世界。石昊第一次进入虚神界，就遇到了两个坑蒙拐骗的老家伙——鸟爷与精壁大爷。这两人在虚神界可是臭名昭著，但石昊却与他们关系不错。鸟爷告诉他："只要不断破纪录，就能获得宝术碎片。"石昊眼中一亮，开始了他在虚神界的传奇。',
    choices: [
      { text: '打破纪录', next: 'xuanshen_record' },
      { text: '挑战石毅', next: 'xuanshen_shiyi' },
    ],
  },
  xuanshen_record: {
    id: 'xuanshen_record',
    chapter: 'xuanshen',
    bg: 'xuanshen',
    character: 'shihao',
    characterName: '石昊',
    text: '石昊在虚神界一路横推，打破各种纪录。虚神界各地不断出现纪录碑，引得虚神界一片震动。鸟爷肩上的鸟冲起化成一轮曜日悬在他背后，犹如仙佛一般；精壁大爷则是收起奸笑，一脸的严肃，显得仙风道骨。石昊破纪录时，一些力量涌进了鸟爷与精壁大爷体内，让他们开启了一些尘封的记忆。',
    choices: [
      { text: '挑战石毅', next: 'xuanshen_shiyi' },
      { text: '集齐碎片', next: 'xuanshen_fragment' },
    ],
  },
  xuanshen_shiyi: {
    id: 'xuanshen_shiyi',
    chapter: 'xuanshen',
    bg: 'xuanshen',
    character: 'shiyi',
    characterName: '石毅',
    text: '"重瞳本是无敌路，何须再借他人骨。"石毅天生重瞳，是上古以来最顶级的天赋。他自幼夺走石昊的至尊骨，从此背负了一生的心结。在虚神界的决战中，石毅终于明白，重瞳本身就是一条能踏碎一切阻碍的无敌大道。但他面对的是石昊——一个从逆境中崛起的绝世天骄。',
    choices: [
      { text: '决战开始', next: 'xuanshen_battle' },
      { text: '回忆过往', next: 'xuanshen_memory' },
    ],
  },
  xuanshen_battle: {
    id: 'xuanshen_battle',
    chapter: 'xuanshen',
    bg: 'zhandou',
    character: 'shihao',
    characterName: '石昊',
    text: '虚神界一战，石昊与石毅展开了惊天动地的大战。重瞳之力与至尊术碰撞，天地变色。最终，石昊以无敌之姿，斩杀了石毅。这一战，石昊名震天下，所有人都知道，一个绝世天骄崛起了。然而，石毅并未死去，他在临死前将第二块至尊骨给了弟弟，展现了他最后的骄傲。',
    choices: [
      { text: '七神下界', next: 'xuanshen_qishen' },
      { text: '前往上界', next: 'shangjie_enter' },
    ],
  },
  xuanshen_memory: {
    id: 'xuanshen_memory',
    chapter: 'xuanshen',
    bg: 'xuanshen',
    character: 'shihao',
    characterName: '石昊',
    text: '石昊想起幼年时被挖去至尊骨的痛苦，想起父母为他寻找灵药的艰辛，想起柳神在石村的教诲。这些回忆没有让他沉沦，反而让他更加坚定。"我不是为了复仇而修行，"石昊喃喃道，"我是为了守护。"他的眼中闪烁着坚定的光芒。',
    choices: [
      { text: '决战开始', next: 'xuanshen_battle' },
      { text: '前往上界', next: 'shangjie_enter' },
    ],
  },
  xuanshen_fragment: {
    id: 'xuanshen_fragment',
    chapter: 'xuanshen',
    bg: 'xuanshen',
    character: 'shihao',
    characterName: '石昊',
    text: '石昊登天路，从下界的虚神界杀到了上界的灵界，集齐了十块青铜书碎片。他获得了原始真解，这是无上宝术的根基。鸟爷与精壁大爷看着石昊成长，眼中满是欣慰。他们知道，这个孩子将来必定会震动九天十地。',
    choices: [
      { text: '挑战石毅', next: 'xuanshen_shiyi' },
      { text: '七神下界', next: 'xuanshen_qishen' },
    ],
  },
  xuanshen_qishen: {
    id: 'xuanshen_qishen',
    chapter: 'xuanshen',
    bg: 'zhandou',
    character: 'shihao',
    characterName: '石昊',
    text: '七神下界，上界七位强者降临下界，欲夺取造化。石昊以一人之躯，守护石国万民。他为护下界苍生，不惜燃烧己身，自爆至尊骨。"男儿走四方，何处不为家，死在哪里，葬在哪里，天下青山都一样！"石昊的声音响彻天地。他以命相搏，终退七神，但也因此陨落。',
    choices: [
      { text: '涅槃重生', next: 'shangjie_enter' },
      { text: '前往上界', next: 'shangjie_enter' },
    ],
  },

  // ===== 第三卷·上界篇 =====
  shangjie_enter: {
    id: 'shangjie_enter',
    chapter: 'shangjie',
    bg: 'xianyu',
    character: 'shihao',
    characterName: '荒',
    text: '石昊涅槃重生，前往上界。上界三千州，天才如云，强者如雨。石昊隐藏身份，以"荒"之名行走天下。他遇到了云曦——天人族神女，两人因灵犀耳坠而结缘。他也遇到了清漪——补天教圣女，月婵的次身，两人纠缠了一生。',
    choices: [
      { text: '争霸仙古', next: 'shangjie_xian' },
      { text: '寻找火灵儿', next: 'shangjie_huoer' },
    ],
  },
  shangjie_xian: {
    id: 'shangjie_xian',
    chapter: 'shangjie',
    bg: 'xianyu',
    character: 'shihao',
    characterName: '荒',
    text: '仙古争霸，三千州天才大战。石昊一路横推，击败了无数天才，最终扬名天神书院。他遇到了齐道临——至尊殿传人，成为了他的弟子。在齐道临的教导下，石昊每天刻苦修炼，背着一座山跑来跑去，学习新的法术，实力不断增强。他更是创出了"以身为种"的修炼体系，前无古人。',
    choices: [
      { text: '边荒磨炼', next: 'bianhuang_enter' },
      { text: '寻找云曦', next: 'shangjie_yunxi' },
    ],
  },
  shangjie_huoer: {
    id: 'shangjie_huoer',
    chapter: 'shangjie',
    bg: 'xianyu',
    character: 'huoer',
    characterName: '火灵儿',
    text: '石昊找到了火灵儿。在下界她是火皇公主，到了上界只是平民。但火灵儿从未抱怨，她始终支持石昊所选之路。在火皇的见证下，两人在火桑林成婚。"待我归来，带你看遍世间璀璨。"石昊许下承诺。火灵儿带着笑容送别，却不知这一别，竟是两百万年。',
    choices: [
      { text: '争霸仙古', next: 'shangjie_xian' },
      { text: '边荒磨炼', next: 'bianhuang_enter' },
    ],
  },
  shangjie_yunxi: {
    id: 'shangjie_yunxi',
    chapter: 'shangjie',
    bg: 'xianyu',
    character: 'yunxi',
    characterName: '云曦',
    text: '云曦，天人族神女。她前期傲娇大小姐，后期贤妻良母，靠"默默守护"逆袭成观众意难平。天人族逼婚，云曦被迫联姻，石昊抢亲时她泪眼含笑："等你这句话，头发都等白了。"最终，云曦嫁给石昊，结为道侣，生下帝子石凡。',
    choices: [
      { text: '争霸仙古', next: 'shangjie_xian' },
      { text: '边荒磨炼', next: 'bianhuang_enter' },
    ],
  },

  // ===== 第四卷·边荒篇 =====
  bianhuang_enter: {
    id: 'bianhuang_enter',
    chapter: 'bianhuang',
    bg: 'bianhuang',
    character: 'mengtian',
    characterName: '孟天正',
    text: '边荒，是九天十地抵御异域的前线。孟天正，边荒领袖，逆行伐仙，守护九天十地。他看着石昊成长，眼中满是期许："孩子，你是九天十地的希望。"石昊在这里磨炼，败帝族，战安澜，一步步走向巅峰。',
    choices: [
      { text: '战安澜', next: 'bianhuang_anlan' },
      { text: '红尘成仙', next: 'bianhuang_immortal' },
    ],
  },
  bianhuang_anlan: {
    id: 'bianhuang_anlan',
    chapter: 'bianhuang',
    bg: 'zhandou',
    character: 'anlan',
    characterName: '安澜',
    text: '"仙之巅，傲世间，有我安澜便有天！"安澜，异域不朽之王，霸气绝伦。他手持俞陀赤王戈，站在九天十地的废墟上，对着整个世界发出无敌宣言。他是黑暗年代里最不可一世的至尊，魔血染透了半个宇宙。石昊与安澜的对决，是《完美世界》中最震撼的名场面之一。',
    choices: [
      { text: '决战安澜', next: 'bianhuang_battle' },
      { text: '孟天正逆行伐仙', next: 'bianhuang_meng' },
    ],
  },
  bianhuang_battle: {
    id: 'bianhuang_battle',
    chapter: 'bianhuang',
    bg: 'zhandou',
    character: 'shihao',
    characterName: '石昊',
    text: '"哪怕背负天渊，需一手托原始帝城，我安澜一样无敌世间！"安澜在被石昊追杀到绝境时，依然不肯低下高傲的头颅。但石昊已经成长到了惊人的高度。他化自在，他化万古，最终击败了安澜。这一战，石昊名震异域，所有人都知道，九天十地出了一位绝世天骄。',
    choices: [
      { text: '红尘成仙', next: 'bianhuang_immortal' },
      { text: '黑暗动乱', next: 'heian_start' },
    ],
  },
  bianhuang_meng: {
    id: 'bianhuang_meng',
    chapter: 'bianhuang',
    bg: 'zhandou',
    character: 'mengtian',
    characterName: '孟天正',
    text: '孟天正，边荒领袖，在绝境中逆行伐仙。他以凡人之躯，对抗真仙，守护九天十地。他的道，是守护之道。他看着石昊，眼中满是欣慰："孩子，你已经超越了我。去吧，去走你的路。"孟天正的身影，永远铭刻在九天十地的历史上。',
    choices: [
      { text: '决战安澜', next: 'bianhuang_battle' },
      { text: '红尘成仙', next: 'bianhuang_immortal' },
    ],
  },
  bianhuang_immortal: {
    id: 'bianhuang_immortal',
    chapter: 'bianhuang',
    bg: 'xianyu',
    character: 'shihao',
    characterName: '石昊',
    text: '末法时代来临，天地灵气日益稀薄。石昊在逆境中不断突破，逆活九世，成就了红尘仙。这一成就不仅让他成为了古往今来最年轻的至尊，更让他拥有了与真仙匹敌的实力。他的肉身经过无数次的锤炼和重生，已经变得无比强大。他的元神也经过多次的雷劫洗礼和生死考验，变得异常坚韧和敏锐。',
    choices: [
      { text: '黑暗动乱', next: 'heian_start' },
      { text: '建立天庭', next: 'heian_tianting' },
    ],
  },

  // ===== 第五卷·黑暗动乱 =====
  heian_start: {
    id: 'heian_start',
    chapter: 'heian',
    bg: 'heian',
    character: 'shihao',
    characterName: '石昊',
    text: '黑暗动乱爆发，诡异一族开始入侵。他们沾染了仙帝骨灰，产生了意识，成为了诸天万界最大的威胁。石昊建立天庭，带领众生对抗黑暗。"万般因果，尽加吾身。"石昊的声音响彻天地。他知道，这一战，他必须赢。',
    choices: [
      { text: '建立天庭', next: 'heian_tianting' },
      { text: '对抗黑暗', next: 'heian_battle' },
    ],
  },
  heian_tianting: {
    id: 'heian_tianting',
    chapter: 'heian',
    bg: 'heian',
    character: 'shihao',
    characterName: '石昊',
    text: '石昊建立天庭，成为天庭之主。他带领众生对抗黑暗，守护诸天万界。他的实力已经达到了仙王境界，成为了无上巨头。但他知道，这还不够。黑暗动乱的源头，是上苍之上的诡异液体。他必须变得更强，强到能一剑隔断万古。',
    choices: [
      { text: '对抗黑暗', next: 'heian_battle' },
      { text: '梦回帝落', next: 'heian_diluo' },
    ],
  },
  heian_battle: {
    id: 'heian_battle',
    chapter: 'heian',
    bg: 'heian',
    character: 'shihao',
    characterName: '石昊',
    text: '"谁在称无敌，哪个敢言不败？帝落时代都不见！"石昊的声音响彻天地。他带领众生与黑暗展开了惊天动地的大战。三万年大战，他斩杀苍帝、鸿帝、羽帝以及灭世老人。他的道，是无敌道。他的路，是无敌路。',
    choices: [
      { text: '梦回帝落', next: 'heian_diluo' },
      { text: '破王成帝', next: 'dadi_breakthrough' },
    ],
  },
  heian_diluo: {
    id: 'heian_diluo',
    chapter: 'heian',
    bg: 'heian',
    character: 'shihao',
    characterName: '石昊',
    text: '石昊梦回帝落时代，看到了那个时代的真相。自帝落而殇，一道腐身伴在幽冥旁，俯瞰一个又一个纪元，大世更迭。他明白了自己的使命——他要平定黑暗动乱，为后人留下一个完美世界。"什么是亿万古载不朽，什么是永恒，都是打出来的，我要剑斩万古，一双拳头镇压古今未来！"',
    choices: [
      { text: '破王成帝', next: 'dadi_breakthrough' },
      { text: '对抗黑暗', next: 'heian_battle' },
    ],
  },

  // ===== 第六卷·独断万古 =====
  dadi_breakthrough: {
    id: 'dadi_breakthrough',
    chapter: 'dadi',
    bg: 'dadu',
    character: 'shihao',
    characterName: '荒天帝',
    text: '他化自在大法大成，石昊终于突破桎梏，踏入传说中的仙帝境界。轰——！天地共鸣，万道臣服。石昊成为了荒天帝，成为了古往今来最强大的存在之一。他的实力已经达到了一个前所未有的高度，一念可化诸天万道，一念可照古今未来。',
    choices: [
      { text: '平定黑祸', next: 'dadi_pingding' },
      { text: '独断万古', next: 'dadi_end' },
    ],
  },
  dadi_pingding: {
    id: 'dadi_pingding',
    chapter: 'dadi',
    bg: 'dadu',
    character: 'shihao',
    characterName: '荒天帝',
    text: '石昊以仙帝之姿，平定黑暗动乱。他斩杀了所有诡异仙帝，终结了黑暗动乱。但他知道，这一切还没有结束。上苍之上，还有更强大的存在。他必须继续前行，为后人留下一个完美世界。"纵使天地无我，我依旧自成一道！"',
    choices: [
      { text: '独断万古', next: 'dadi_end' },
      { text: '寻找火灵儿', next: 'dadi_huoer' },
    ],
  },
  dadi_huoer: {
    id: 'dadi_huoer',
    chapter: 'dadi',
    bg: 'dadu',
    character: 'huoer',
    characterName: '火灵儿',
    text: '"石昊……你终于来了。"火灵儿在火桑树下等了他很久，很久。两百万年，只为再看他一眼。她被安澜掳入异域，肉身被黑暗侵蚀，原元神被囚于黑暗牢笼近两百万年。石昊救回她，融合归一。火灵儿看着石昊，眼中有着无尽的情意："我身即火，万劫不烬！"',
    choices: [
      { text: '独断万古', next: 'dadi_end' },
      { text: '重新开始', next: 'start' },
    ],
  },
  dadi_end: {
    id: 'dadi_end',
    chapter: 'dadi',
    bg: 'dadu',
    character: 'shihao',
    characterName: '荒天帝',
    text: '"独断万古荒天帝，唯负罪州火桑女。"石昊站在时间长河上，回首万古。他平定黑暗动乱，为后人留下了一个完美世界。但他也失去了很多——父母、故人、妻子……他将他们全部封印，独自面对永恒。"漫长岁月后，也许会有那样一个人，独自站在岁月长河上，回首万古，独伴神道。"石昊一剑隔断万古，纵身离开，只留下一个传说。',
    choices: [
      { text: '重新开始', next: 'start' },
    ],
  },
};

// ===== 粒子组件 =====
function Particles({ color }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const particleCount = 40;
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      size: Math.random() * 2.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      particlesRef.current.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.015;
        
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;
        
        const currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = currentOpacity;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        glow.addColorStop(0, color);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.globalAlpha = currentOpacity * 0.2;
        ctx.fill();
      });
      
      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}

// ===== 打字机文本组件 =====
function TypewriterText({ text, onComplete, speed = 40 }) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    indexRef.current = 0;
    
    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span>
      {displayText}
      {!isComplete && <span className="cursor">|</span>}
    </span>
  );
}

// ===== 角色头像组件（使用SVG） =====
function CharacterAvatar({ character, isActive, size = 64 }) {
  const charData = CHARACTERS[character] || CHARACTERS.shihao;
  
  // 为每个角色生成独特的SVG头像
  const getAvatarSVG = (char) => {
    const colors = {
      shihao: { primary: '#6366F1', secondary: '#818CF8', accent: '#C7D2FE' },
      liushen: { primary: '#10B981', secondary: '#34D399', accent: '#A7F3D0' },
      shiyi: { primary: '#8B5CF6', secondary: '#A78BFA', accent: '#DDD6FE' },
      anlan: { primary: '#EF4444', secondary: '#F87171', accent: '#FECACA' },
      huoer: { primary: '#F59E0B', secondary: '#FBBF24', accent: '#FDE68A' },
      yunxi: { primary: '#EC4899', secondary: '#F472B6', accent: '#FBCFE8' },
      qingyi: { primary: '#06B6D4', secondary: '#22D3EE', accent: '#A5F3FC' },
      mengtian: { primary: '#78716C', secondary: '#A8A29E', accent: '#D6D3D1' },
    };
    const c = colors[char] || colors.shihao;
    
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 背景圆形 */}
        <circle cx="32" cy="32" r="30" fill={c.primary} opacity="0.2" />
        <circle cx="32" cy="32" r="26" fill={c.primary} opacity="0.3" />
        
        {/* 角色特征 */}
        {char === 'shihao' && (
          <>
            {/* 石昊 - 剑 */}
            <path d="M28 16 L36 16 L34 40 L30 40 Z" fill={c.primary} />
            <path d="M26 40 L38 40 L38 44 L26 44 Z" fill={c.secondary} />
            <circle cx="32" cy="14" r="3" fill={c.accent} />
          </>
        )}
        {char === 'liushen' && (
          <>
            {/* 柳神 - 柳枝 */}
            <path d="M32 12 Q28 24 24 36" stroke={c.primary} strokeWidth="2" fill="none" />
            <path d="M32 12 Q36 24 40 36" stroke={c.primary} strokeWidth="2" fill="none" />
            <path d="M32 12 L32 44" stroke={c.secondary} strokeWidth="2" />
            <circle cx="24" cy="36" r="2" fill={c.accent} />
            <circle cx="40" cy="36" r="2" fill={c.accent} />
          </>
        )}
        {char === 'shiyi' && (
          <>
            {/* 石毅 - 重瞳 */}
            <circle cx="26" cy="28" r="6" fill={c.secondary} />
            <circle cx="38" cy="28" r="6" fill={c.secondary} />
            <circle cx="26" cy="28" r="3" fill={c.primary} />
            <circle cx="38" cy="28" r="3" fill={c.primary} />
            <circle cx="26" cy="28" r="1.5" fill="#fff" />
            <circle cx="38" cy="28" r="1.5" fill="#fff" />
          </>
        )}
        {char === 'anlan' && (
          <>
            {/* 安澜 - 矛 */}
            <path d="M32 8 L32 44" stroke={c.primary} strokeWidth="3" />
            <path d="M28 10 L32 4 L36 10" fill={c.secondary} />
            <path d="M26 44 L38 44 L32 52 Z" fill={c.accent} />
          </>
        )}
        {char === 'huoer' && (
          <>
            {/* 火灵儿 - 火焰 */}
            <path d="M32 8 Q24 20 24 32 Q24 44 32 52 Q40 44 40 32 Q40 20 32 8" fill={c.primary} opacity="0.6" />
            <path d="M32 16 Q28 24 28 32 Q28 40 32 44 Q36 40 36 32 Q36 24 32 16" fill={c.secondary} />
          </>
        )}
        {char === 'yunxi' && (
          <>
            {/* 云曦 - 蝴蝶 */}
            <path d="M32 32 Q24 20 16 24 Q12 28 16 32 Q24 36 32 32" fill={c.primary} opacity="0.6" />
            <path d="M32 32 Q40 20 48 24 Q52 28 48 32 Q40 36 32 32" fill={c.secondary} opacity="0.6" />
            <circle cx="32" cy="32" r="4" fill={c.accent} />
          </>
        )}
        {char === 'qingyi' && (
          <>
            {/* 清漪 - 月牙 */}
            <path d="M20 32 Q20 16 32 16 Q44 16 44 32 Q44 28 40 24 Q32 20 24 28 Q20 32 20 32" fill={c.primary} opacity="0.7" />
            <circle cx="36" cy="20" r="2" fill={c.accent} />
          </>
        )}
        {char === 'mengtian' && (
          <>
            {/* 孟天正 - 盾 */}
            <path d="M20 16 L44 16 L44 32 Q44 44 32 52 Q20 44 20 32 Z" fill={c.primary} opacity="0.5" />
            <path d="M24 20 L40 20 L40 32 Q40 40 32 46 Q24 40 24 32 Z" fill={c.secondary} opacity="0.5" />
          </>
        )}
        
        {/* 通用装饰 */}
        <circle cx="32" cy="32" r="30" stroke={c.primary} strokeWidth="1" opacity="0.3" />
      </svg>
    );
  };
  
  return (
    <div
      className={`character-avatar ${isActive ? 'active' : ''}`}
      style={{
        '--char-color': charData.color,
        '--char-gradient': charData.gradient,
      }}
    >
      <div className="avatar-glow" />
      <div className="avatar-svg">
        {getAvatarSVG(character)}
      </div>
      <div className="avatar-name">{charData.name}</div>
    </div>
  );
}

// ===== 主组件 =====
export default function PerfectWorld() {
  const [currentScene, setCurrentScene] = useState('start');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [textComplete, setTextComplete] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [history, setHistory] = useState(['start']);
  const [fadeIn, setFadeIn] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  const scene = STORY_DATA[currentScene] || STORY_DATA.start;
  const chapter = CHAPTERS[scene.chapter] || CHAPTERS.xu;
  const character = CHARACTERS[scene.character] || CHARACTERS.shihao;

  useEffect(() => {
    setFadeIn(true);
    setTextComplete(false);
    setShowChoices(false);
    
    const timer = setTimeout(() => setFadeIn(false), 500);
    return () => clearTimeout(timer);
  }, [currentScene]);

  const handleChoice = useCallback((nextScene) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setFadeIn(true);
    
    setTimeout(() => {
      setCurrentScene(nextScene);
      setHistory((prev) => [...prev, nextScene]);
      setIsTransitioning(false);
    }, 400);
  }, [isTransitioning]);

  const handleTextComplete = useCallback(() => {
    setTextComplete(true);
    setTimeout(() => setShowChoices(true), 300);
  }, []);

  const handleRestart = () => {
    setHistory(['start']);
    setCurrentScene('start');
  };

  const handleStartGame = () => {
    setShowIntro(false);
  };

  // 介绍页面
  if (showIntro) {
    return (
      <div className="pw-root">
        <div className="pw-intro-bg">
          <div className="intro-overlay" />
        </div>
        <div className="pw-intro-content">
          <h1 className="intro-title">完美世界</h1>
          <p className="intro-subtitle">一粒尘可填海，一根草斩尽日月星辰</p>
          <div className="intro-desc">
            <p>乱古末期，天地大乱，万族林立，诸圣争霸。</p>
            <p>一个少年从大荒中走出，他名为石昊。</p>
            <p>他为修道而生，为应劫而至，一生中极致辉煌，造就无尽传说。</p>
            <p>从石村到仙帝，从凡人到荒天帝，他的故事，从这里开始……</p>
          </div>
          <button className="intro-start-btn" onClick={handleStartGame}>
            <span>开始体验</span>
            <span className="btn-arrow">→</span>
          </button>
          <div className="intro-chapters">
            {Object.entries(CHAPTERS).map(([key, ch]) => (
              <div key={key} className="chapter-tag">
                <span className="chapter-name">{ch.name}</span>
                <span className="chapter-novel">{ch.novelChapter}</span>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          .pw-intro-bg {
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            z-index: 0;
          }
          .intro-overlay {
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%);
          }
          .pw-intro-content {
            position: relative;
            z-index: 10;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 40px 24px;
            text-align: center;
          }
          .intro-title {
            font-size: 48px;
            font-weight: 800;
            color: #fff;
            margin: 0;
            letter-spacing: 8px;
            text-shadow: 0 4px 20px rgba(99, 102, 241, 0.5);
          }
          .intro-subtitle {
            font-size: 16px;
            color: rgba(255,255,255,0.7);
            margin: 12px 0 32px;
            letter-spacing: 2px;
          }
          .intro-desc {
            max-width: 500px;
            margin-bottom: 40px;
          }
          .intro-desc p {
            font-size: 15px;
            color: rgba(255,255,255,0.8);
            line-height: 2;
            margin: 8px 0;
          }
          .intro-start-btn {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 16px 40px;
            border-radius: 50px;
            border: 2px solid rgba(99, 102, 241, 0.5);
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
            color: #fff;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: inherit;
          }
          .intro-start-btn:hover {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%);
            border-color: #6366F1;
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
          }
          .btn-arrow {
            transition: transform 0.3s ease;
          }
          .intro-start-btn:hover .btn-arrow {
            transform: translateX(4px);
          }
          .intro-chapters {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
            margin-top: 40px;
            max-width: 600px;
          }
          .chapter-tag {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 12px;
            border-radius: 8px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
          }
          .chapter-name {
            font-size: 11px;
            color: rgba(255,255,255,0.8);
            font-weight: 600;
          }
          .chapter-novel {
            font-size: 10px;
            color: rgba(255,255,255,0.5);
            margin-top: 2px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pw-root">
      {/* 背景层 */}
      <div className={`pw-bg ${fadeIn ? 'fade-in' : ''}`}>
        <div
          className="bg-image"
          style={{ backgroundImage: `url(${BG_IMAGES[scene.bg]})` }}
        />
        <div className="bg-overlay" />
        <Particles color={character.color} />
        <div className="pw-glow pw-glow-1" />
        <div className="pw-glow pw-glow-2" />
      </div>

      {/* 内容层 */}
      <div className="pw-content">
        {/* 顶部章节信息 */}
        <header className="pw-header">
          <div className="chapter-info">
            <span className="chapter-badge">{chapter.name}</span>
            <span className="chapter-novel-badge">小说 {chapter.novelChapter}</span>
          </div>
          <h1 className="pw-title">完美世界</h1>
        </header>

        {/* 角色立绘区域 */}
        <div className="pw-characters">
          {Object.entries(CHARACTERS).map(([key, char]) => (
            <CharacterAvatar
              key={key}
              character={key}
              isActive={key === scene.character}
              size={48}
            />
          ))}
        </div>

        {/* 对话框 */}
        <div className={`pw-dialog ${isTransitioning ? 'transitioning' : ''}`}>
          <div className="pw-dialog-border" style={{ '--accent': character.color }}>
            <div className="dialog-name-tag" style={{ background: character.gradient }}>
              {scene.characterName}
            </div>
            
            {/* 背景介绍 */}
            <div className="dialog-context">
              <span className="context-icon">📖</span>
              <span className="context-text">{chapter.description}</span>
            </div>
            
            <div className="dialog-text">
              <TypewriterText
                key={currentScene}
                text={scene.text}
                onComplete={handleTextComplete}
                speed={35}
              />
            </div>

            {/* 选项按钮 */}
            {showChoices && (
              <div className="dialog-choices">
                {scene.choices.map((choice, index) => (
                  <button
                    key={index}
                    className="choice-btn"
                    style={{ '--btn-accent': character.color }}
                    onClick={() => handleChoice(choice.next)}
                  >
                    <span className="choice-text">{choice.text}</span>
                    <span className="choice-arrow">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部控制栏 */}
        <footer className="pw-footer">
          <button className="ctrl-btn" onClick={handleRestart} title="重新开始">
            ↺ 重新开始
          </button>
          <div className="history-dots">
            {history.slice(-10).map((_, i) => (
              <span key={i} className={`dot ${i === history.slice(-10).length - 1 ? 'active' : ''}`} />
            ))}
          </div>
        </footer>
      </div>

      {/* 全局样式 */}
      <style>{`
        /* ===== 根容器 ===== */
        .pw-root {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }

        /* ===== 背景层 ===== */
        .pw-bg {
          position: absolute;
          inset: 0;
          transition: all 0.8s ease;
          z-index: 0;
        }
        .pw-bg.fade-in {
          opacity: 0.7;
        }
        .bg-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: brightness(0.7) saturate(1.2);
          transition: background-image 0.8s ease;
        }
        .bg-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%);
        }

        /* ===== 装饰光晕 ===== */
        .pw-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.3;
          pointer-events: none;
        }
        .pw-glow-1 {
          width: 300px;
          height: 300px;
          top: -50px;
          right: -50px;
          background: radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%);
          animation: float1 8s ease-in-out infinite;
        }
        .pw-glow-2 {
          width: 250px;
          height: 250px;
          bottom: 10%;
          left: -30px;
          background: radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%);
          animation: float2 10s ease-in-out infinite;
        }

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 15px) scale(1.1); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -20px) scale(1.05); }
        }

        /* ===== 内容层 ===== */
        .pw-content {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 16px 20px;
          box-sizing: border-box;
        }

        /* ===== 顶部章节信息 ===== */
        .pw-header {
          text-align: center;
          flex-shrink: 0;
        }
        .chapter-info {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .chapter-badge {
          padding: 4px 12px;
          border-radius: 20px;
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.4);
          font-size: 12px;
          color: #C7D2FE;
          font-weight: 600;
        }
        .chapter-novel-badge {
          padding: 4px 12px;
          border-radius: 20px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          font-size: 12px;
          color: rgba(255,255,255,0.7);
        }
        .pw-title {
          margin: 4px 0 0;
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 4px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        /* ===== 角色立绘区域 ===== */
        .pw-characters {
          display: flex;
          justify-content: center;
          gap: 12px;
          padding: 12px 0;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        .character-avatar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          opacity: 0.4;
          transform: scale(0.85);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .character-avatar.active {
          opacity: 1;
          transform: scale(1);
        }

        .avatar-glow {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: var(--char-gradient);
          filter: blur(15px);
          opacity: 0;
          transition: opacity 0.5s ease;
          top: -5px;
        }
        .character-avatar.active .avatar-glow {
          opacity: 0.5;
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }

        .avatar-svg {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          padding: 4px;
        }
        .character-avatar.active .avatar-svg {
          border-color: var(--char-color);
          box-shadow: 0 4px 20px var(--char-color);
          transform: translateY(-3px);
        }

        .avatar-name {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          transition: all 0.3s ease;
        }
        .character-avatar.active .avatar-name {
          color: #fff;
        }

        /* ===== 对话框 ===== */
        .pw-dialog {
          flex: 1;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 16px;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .pw-dialog.transitioning {
          opacity: 0;
          transform: translateY(20px);
        }

        .pw-dialog-border {
          position: relative;
          width: 100%;
          max-width: 700px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.95);
          padding: 28px 24px 20px;
          box-shadow: 
            0 10px 40px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          animation: dialog-appear 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes dialog-appear {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .pw-dialog-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 21px;
          background: linear-gradient(135deg, var(--accent), transparent, var(--accent));
          opacity: 0.2;
          z-index: -1;
          animation: border-glow 3s ease-in-out infinite;
        }

        @keyframes border-glow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }

        .dialog-name-tag {
          position: absolute;
          top: -12px;
          left: 20px;
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          color: white;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          letter-spacing: 1px;
        }

        /* 背景介绍 */
        .dialog-context {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          margin-bottom: 12px;
          border-radius: 10px;
          background: rgba(0,0,0,0.04);
          border-left: 3px solid var(--accent, #6366F1);
        }
        .context-icon {
          font-size: 14px;
        }
        .context-text {
          font-size: 12px;
          color: #6B7280;
          line-height: 1.5;
        }

        .dialog-text {
          font-size: 16px;
          line-height: 1.9;
          color: #374151;
          min-height: 80px;
          letter-spacing: 0.3px;
        }

        .cursor {
          display: inline-block;
          animation: blink 0.8s infinite;
          color: var(--accent, #6366F1);
          font-weight: bold;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* ===== 选项按钮 ===== */
        .dialog-choices {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
          animation: choices-appear 0.4s ease;
        }

        @keyframes choices-appear {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .choice-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-radius: 12px;
          border: 1.5px solid rgba(0, 0, 0, 0.08);
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          color: #374151;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .choice-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--btn-accent), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .choice-btn:hover {
          transform: translateX(6px);
          border-color: var(--btn-accent);
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.08),
            0 0 25px var(--btn-accent);
          background: rgba(255, 255, 255, 0.95);
        }

        .choice-btn:hover::before {
          opacity: 0.08;
        }

        .choice-btn:active {
          transform: translateX(3px) scale(0.98);
        }

        .choice-text {
          position: relative;
          z-index: 1;
          font-weight: 500;
        }

        .choice-arrow {
          position: relative;
          z-index: 1;
          opacity: 0;
          transform: translateX(-8px);
          transition: all 0.3s ease;
          color: var(--btn-accent);
          font-weight: bold;
        }

        .choice-btn:hover .choice-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        /* ===== 底部控制栏 ===== */
        .pw-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0 12px;
          flex-shrink: 0;
        }

        .ctrl-btn {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1.5px solid rgba(255,255,255,0.2);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          font-family: inherit;
          font-size: 12px;
          color: rgba(255,255,255,0.8);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .ctrl-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: #6366F1;
          color: #fff;
          box-shadow: 0 2px 15px rgba(99, 102, 241, 0.3);
        }

        .history-dots {
          display: flex;
          gap: 5px;
        }

        .history-dots .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          transition: all 0.3s ease;
        }

        .history-dots .dot.active {
          background: #6366F1;
          transform: scale(1.3);
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
        }

        /* ===== 响应式 ===== */
        @media (max-width: 640px) {
          .pw-title {
            font-size: 20px;
          }
          .pw-characters {
            gap: 8px;
          }
          .avatar-svg {
            width: 40px;
            height: 40px;
          }
          .pw-dialog-border {
            padding: 22px 16px 16px;
          }
          .dialog-text {
            font-size: 14px;
          }
          .choice-btn {
            padding: 10px 14px;
            font-size: 13px;
          }
          .intro-title {
            font-size: 36px;
          }
        }
      `}</style>
    </div>
  );
}
