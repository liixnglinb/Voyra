/** 卡片画面容器的填色：上半取该模型的天空色、下半取地面/路面色，
    用于填补 .pg-frame 底部圆角与子像素边缘露出的缝隙，让边角与画面同色 */
const fill = (sky, ground) =>
  `linear-gradient(180deg,${sky} 0%,${sky} 50%,${ground} 50%,${ground} 100%)`;

export const PELICAN_MODELS = [
  { file: 'glm-5.3-flash.html',     model: 'GLM-5.3 Flash',     ratio: '880/460',  zoom: 1.4,
    bg: fill('#8fd3f4', '#000') },
  { file: 'deepseek-v4-pro.html',   model: 'DeepSeek-V4 Pro',   ratio: '900/520',
    bg: fill('#a8d8f0', '#5aa63d') },
  { file: 'deepseek-v4-flash.html', model: 'DeepSeek-V4 Flash', ratio: '900/520',
    bg: fill('#8ed0f6', '#ecd9ab') },
  { file: 'gpt56-sol-ulter.html',   model: 'GPT 5.6 sol',        ratio: '1600/900' },
  { file: 'qwen38-max.html',        model: 'Qwen3.8-Max',       ratio: '800/480',
    bg: fill('#7dd3fc', '#64748b') },
  { file: 'qwen3.7-plus.html',      model: 'Qwen3.7-Plus',      ratio: '600/400' },
  { file: 'kimi-k3.html',           model: 'Kimi-K3',           ratio: '800/480',
    bg: fill('#7ec8f2', '#9ccb8d') },
  { file: 'kimi-k2.6.html',         model: 'Kimi-K2.6',         ratio: '900/500' },
  { file: 'glm-5.1.html',           model: 'GLM-5.1',           ratio: '900/600' },
  { file: 'kimi-2.7-code.html',     model: 'Kimi-2.7-Code',     ratio: '1200/800' },
  { file: 'minmax-m3.html',         model: 'MiniMax-M3',        ratio: '800/500' },
  { file: 'glm-5.3.html',           model: 'GLM-5.3',           ratio: '1000/600',
    bg: fill('#6db6e8', '#000') },
  { file: 'glm-5.2.html',           model: 'GLM-5.2',           ratio: '920/520' },
  { file: 'hy3-workbuddy.html',     model: 'Hy3',               ratio: '800/460',
    bg: fill('#aee7ff', '#7cc34f') },
  { file: 'doubao-2.1-turbo.html',  model: '豆包 2.1 Turbo',    ratio: '900/500',
    bg: fill('#5DADE2', '#52BE80') },
  { file: 'hy4-preview.html',       model: 'Hy4 Preview',       ratio: '960/540',
    bg: fill('#7FD4FF', '#4A5462') },
];

export const PELICAN_MODEL_COUNT = PELICAN_MODELS.length;
