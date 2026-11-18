import React from 'react';
import { ThemeOption } from '../components/ui/ThemeGridSelector';
import {
    Zap, GraduationCap, Feather, Code, ClipboardList,
    Scroll, Newspaper, Leaf, Orbit, Sunset, CloudRain, Snowflake, Eye, Cloud
} from '../components/ui/Icons';

export type PreviewTheme =
    | 'default'
    | 'academic'
    | 'minimal'
    | 'developer'
    | 'implementation-plan'
    | 'classical'
    | 'newspaper'
    | 'nordicforest'
    | 'cosmic'
    | 'sunsetglow'
    | 'neonrain'
    | 'aurora'
    | 'clouddancer';

export const PREVIEW_THEMES: ThemeOption[] = [
    {
        label: '預設', value: 'default', hint: 'default',
        icon: <Zap size={16} />, color: '#000000',
        previewImg: '/image/themes/default.png',
        description: '最均衡的排版，適合一般技術文件。',
        category: 'minimal'
    },
    {
        label: '學術', value: 'academic', hint: 'academic',
        icon: <GraduationCap size={16} />, color: '#78350f',
        previewImg: '/image/themes/academic.png',
        description: '使用襯線字體，模擬學術期刊與論文排版。',
        category: 'minimal'
    },
    {
        label: '極簡', value: 'minimal', hint: 'minimal',
        icon: <Feather size={16} />, color: '#cece91ff',
        previewImg: '/image/themes/minimal.png',
        description: '極大的白留與現代字體，適合詩歌或文學創作。',
        category: 'minimal'
    },
    {
        label: '工程師', value: 'developer', hint: 'developer',
        icon: <Code size={16} />, color: '#059669',
        previewImg: '/image/themes/developer.png',
        description: '全等寬字體與終端機風格，技術感滿滿。',
        category: 'tech'
    },
    {
        label: '實作計畫', value: 'implementation-plan', hint: 'Plan',
        icon: <ClipboardList size={16} />, color: '#005B94',
        previewImg: '/image/themes/plan.png',
        description: '工業化結構設計，適合展示開發方案與進度。',
        category: 'tech'
    },
    {
        label: '古典宣紙', value: 'classical', hint: 'Classical',
        icon: <Scroll size={16} />, color: '#b22222',
        previewImg: '/image/themes/classical.png',
        description: '模擬宣紙底色，徽墨與硃砂紅點綴，帶有古典三線表，充滿人文古意。',
        category: 'creative'
    },
    {
        label: '復古報紙', value: 'newspaper', hint: 'Newspaper',
        icon: <Newspaper size={16} />, color: '#111111',
        previewImg: '/image/themes/newspaper.png',
        description: '高度還原 20 世紀實體報紙印刷質感，擁有經典首字放大 (Drop Cap) 與社論雙線排版。',
        category: 'creative'
    },
    {
        label: '北歐森林', value: 'nordicforest', hint: 'Nordic Forest',
        icon: <Leaf size={16} />, color: '#2d4a36',
        previewImg: '/image/themes/nordicforest.png',
        description: '清晨薄霧林地、松針陰影、鼠尾草綠，適合心流寫作與睡前日記。',
        category: 'creative'
    },
    {
        label: '潛境太空', value: 'cosmic', hint: 'Cosmic Voyage',
        icon: <Orbit size={16} />, color: '#a855f7',
        previewImg: '/image/themes/cosmic.png',
        description: '冷冽太空艙與螢光霓虹霓彩，搭配硬核科技等寬字體與星芒點綴，極具未來張力。',
        category: 'tech'
    },
    {
        label: '極光冰原', value: 'aurora', hint: 'Aurora',
        icon: <Snowflake size={16} />, color: '#0891b2',
        previewImg: '/image/themes/aurora.png',
        description: '冷冽的高科技冷淡風，視覺上極致冷靜與純粹，大幅提升代碼與結構化文字的對比可讀性。',
        category: 'tech'
    },
    {
        label: '落日餘暉', value: 'sunsetglow', hint: 'Sunset Glow',
        icon: <Sunset size={16} />, color: '#ea580c',
        previewImg: '/image/themes/sunsetglow.png',
        description: '溫暖暖沙黃底色與黃昏引言，烘托出極具故事溫度與情感包容力的慢活隨筆意境。',
        category: 'creative'
    },
    {
        label: '霓虹雨夜', value: 'neonrain', hint: 'Neon Rain',
        icon: <CloudRain size={16} />, color: '#ec4899',
        previewImg: '/image/themes/neonrain.png',
        description: '高飽和粉紅與深紫雨夜黑擦出賽博火花，伴隨電晶外發光，點燃深夜寫作黑客心流。',
        category: 'creative'
    },

    {
        label: '雲上舞白', value: 'clouddancer', hint: 'Cloud Dancer 2026',
        icon: <Cloud size={16} />, color: '#8C8275',
        previewImg: '/image/themes/clouddancer.png',
        description: '【限時主題】Pantone 2026 年度代表色：PANTONE 11-4201 雲上舞白。融合 TCX 與 TPG 溫潤棉麻白階，平靜留白心流。',
        category: 'limited',
        // 做法 2: 自動限時 (支援 ISO 日期字串，到期自動於選單隱藏)
        startDate: '2026-11-01',
        endDate: '2026-12-31'
    },
];

/**
 * 做法 3: 歷史歸檔主題 (ARCHIVED THEMES)
 * 長期下架的主題可移至此區，不佔用現役選單陣列，但保留元數據以相容既有使用者
 */
export const ARCHIVED_THEMES: ThemeOption[] = [
    // 範例: 若眼睛炸裂長期下架可移至此處:
    // {
    //     label: '眼睛炸裂', value: 'eyeburst', hint: 'Eye Burst',
    //     icon: <Eye size={16} />, color: '#ff0055',
    //     previewImg: '/image/themes/eyeburst.png',
    //     description: '【歷史限時主題】...',
    //     category: 'limited',
    //     hidden: true
    // }
    {
        label: '眼睛炸裂', value: 'eyeburst', hint: 'Eye Burst',
        icon: <Eye size={16} />, color: '#ff0055',
        previewImg: '/image/themes/eyeburst.png',
        description: '【限時主題】色環 180 度互補色對焦，飽和度拉滿，生活太無聊了嗎？那就來點刺激的！',
        category: 'limited',
        hidden: true
    },
];

/**
 * 全主題列表（包含現役與歸檔，供設定還原與向後相容查找）
 */
export const ALL_THEMES: ThemeOption[] = [...PREVIEW_THEMES, ...ARCHIVED_THEMES];
