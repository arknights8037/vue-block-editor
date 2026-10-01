import type { ThemeId, ThemePreference } from '@/models/theme'

export type ThemeFamily = 'paper' | 'inkstone' | 'clay' | 'nord' | 'graphite'
export type ThemeMode = 'light' | 'dark'

export type ContentColor =
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  family: ThemeFamily
  mode: ThemeMode
  colors: {
    background: {
      app: string
      sidebar: string
      editor: string
      surface: string
      elevated: string
      hover: string
      active: string
      selected: string
    }
    border: {
      subtle: string
      default: string
      strong: string
    }
    text: {
      primary: string
      secondary: string
      tertiary: string
      disabled: string
      placeholder: string
      link: string
      onAccent: string
    }
    accent: {
      primary: string
      hover: string
      active: string
      soft: string
      focus: string
      selection: string
    }
    editor: {
      blockHover: string
      blockSelected: string
      blockHandle: string
      indentGuide: string
      placeholder: string
      quoteBorder: string
      codeBackground: string
      inlineCodeBackground: string
      tableHeader: string
      tableBorder: string
    }
    agent: {
      accent: string
      panelBackground: string
      messageBackground: string
      thinkingBackground: string
      suggestionBackground: string
      citationBackground: string
    }
    diff: {
      addedBackground: string
      addedText: string
      removedBackground: string
      removedText: string
      modifiedBackground: string
      modifiedText: string
    }
    status: {
      success: string
      warning: string
      error: string
      info: string
    }
    content: Record<ContentColor, { background: string; text: string; border: string }>
  }
}

export const THEME_DEFINITIONS: Record<ThemeId, ThemeDefinition> = {
  'paper-light': {
    id: 'paper-light',
    name: 'Paper Light',
    family: 'paper',
    mode: 'light',
    colors: {
      background: {
        app: '#F7F7F5',
        sidebar: '#F3F3F1',
        editor: '#FFFFFF',
        surface: '#F8F8F7',
        elevated: '#FFFFFF',
        hover: '#EFEFED',
        active: '#E8E8E5',
        selected: '#E6EDFA',
      },
      border: {
        subtle: '#EEEEEB',
        default: '#E2E2DE',
        strong: '#CACAC4',
      },
      text: {
        primary: '#2F2E2A',
        secondary: '#5F5D57',
        tertiary: '#85827A',
        disabled: '#AAA8A1',
        placeholder: '#9A9891',
        link: '#2767C7',
        onAccent: '#FFFFFF',
      },
      accent: {
        primary: '#3478D4',
        hover: '#2868C1',
        active: '#2058A7',
        soft: '#E6EFFB',
        focus: '#76A7E7',
        selection: '#DDEBFC',
      },
      editor: {
        blockHover: 'rgb(47 46 42 / 5%)',
        blockSelected: '#E6EDFA',
        blockHandle: '#85827A',
        indentGuide: '#EEEEEB',
        placeholder: '#9A9891',
        quoteBorder: '#9BA8B7',
        codeBackground: '#F2F3F5',
        inlineCodeBackground: '#F0F0ED',
        tableHeader: '#F4F4F2',
        tableBorder: '#DEDED9',
      },
      agent: {
        accent: '#7C3AED',
        panelBackground: '#FFFFFF',
        messageBackground: '#FBFAFF',
        thinkingBackground: '#F3EEFF',
        suggestionBackground: '#F8F5FF',
        citationBackground: '#EAF5FB',
      },
      diff: {
        addedBackground: '#E8F7EE',
        addedText: '#17643B',
        removedBackground: '#FDECEB',
        removedText: '#A7352B',
        modifiedBackground: '#FFF5D8',
        modifiedText: '#7A4D00',
      },
      status: {
        success: '#18865F',
        warning: '#B7791F',
        error: '#C24135',
        info: '#1B64B0',
      },
      content: createLightContentColors(),
    },
  },
  'inkstone-light': {
    id: 'inkstone-light',
    name: 'Inkstone',
    family: 'inkstone',
    mode: 'light',
    colors: {
      background: {
        app: '#FFFFFF',
        sidebar: '#F7F7F5',
        editor: '#FFFFFF',
        surface: '#F7F7F5',
        elevated: '#FFFFFF',
        hover: '#EFEFED',
        active: '#E8E8E6',
        selected: '#E9F2FC',
      },
      border: { subtle: '#EEEEEC', default: '#E3E3E0', strong: '#C9C9C5' },
      text: {
        primary: '#37352F',
        secondary: '#5F5E59',
        tertiary: '#8A8984',
        disabled: '#B4B3AF',
        placeholder: '#9B9A97',
        link: '#2F6F9F',
        onAccent: '#FFFFFF',
      },
      accent: {
        primary: '#2F6F9F',
        hover: '#275F88',
        active: '#214F71',
        soft: '#E7F0F6',
        focus: '#6FA3C6',
        selection: '#DDEBF5',
      },
      editor: {
        blockHover: 'rgb(55 53 47 / 5%)',
        blockSelected: '#E9F2FC',
        blockHandle: '#9B9A97',
        indentGuide: '#E9E9E7',
        placeholder: '#9B9A97',
        quoteBorder: '#37352F',
        codeBackground: '#F7F6F3',
        inlineCodeBackground: '#F1F1EF',
        tableHeader: '#F7F7F5',
        tableBorder: '#E3E3E0',
      },
      agent: {
        accent: '#9065B0',
        panelBackground: '#FFFFFF',
        messageBackground: '#F7F7F5',
        thinkingBackground: '#F3EFF7',
        suggestionBackground: '#F8F5FA',
        citationBackground: '#E7F0F6',
      },
      diff: {
        addedBackground: '#E7F3EC',
        addedText: '#27704A',
        removedBackground: '#FBE9E7',
        removedText: '#A33B32',
        modifiedBackground: '#FAF1D8',
        modifiedText: '#775B16',
      },
      status: { success: '#2F7D59', warning: '#A46A19', error: '#C04438', info: '#2F6F9F' },
      content: createLightContentColors(),
    },
  },
  'clay-light': {
    id: 'clay-light',
    name: 'Clay Light',
    family: 'clay',
    mode: 'light',
    colors: {
      background: {
        app: '#EEE9E1',
        sidebar: '#E8E1D7',
        editor: '#FBF8F2',
        surface: '#F4EFE7',
        elevated: '#FFFDF9',
        hover: '#EDE4D8',
        active: '#E5D9CB',
        selected: '#F2DED2',
      },
      border: {
        subtle: '#E7DDD1',
        default: '#D9CCBD',
        strong: '#C5B5A4',
      },
      text: {
        primary: '#302A25',
        secondary: '#625950',
        tertiary: '#85796E',
        disabled: '#AEA297',
        placeholder: '#94887D',
        link: '#A64D32',
        onAccent: '#FFFFFF',
      },
      accent: {
        primary: '#C15F3C',
        hover: '#A95033',
        active: '#8E432C',
        soft: '#F3DED2',
        focus: '#D89074',
        selection: '#EFD1C1',
      },
      editor: {
        blockHover: 'rgb(48 42 37 / 5%)',
        blockSelected: '#F2DED2',
        blockHandle: '#85796E',
        indentGuide: '#E7DDD1',
        placeholder: '#94887D',
        quoteBorder: '#C15F3C',
        codeBackground: '#EFE7DB',
        inlineCodeBackground: '#EDE4D8',
        tableHeader: '#EEE6DC',
        tableBorder: '#D9CCBD',
      },
      agent: {
        accent: '#7C3AED',
        panelBackground: '#FFFDF9',
        messageBackground: '#FBF7FF',
        thinkingBackground: '#EFE5FF',
        suggestionBackground: '#F7F0FF',
        citationBackground: '#E3F2F4',
      },
      diff: {
        addedBackground: '#E0F0E3',
        addedText: '#275E34',
        removedBackground: '#F8E3DF',
        removedText: '#92372C',
        modifiedBackground: '#F6E8C3',
        modifiedText: '#725000',
      },
      status: {
        success: '#2F7C4F',
        warning: '#A56618',
        error: '#B44435',
        info: '#34758A',
      },
      content: createLightContentColors('clay'),
    },
  },
  'nord-dark': {
    id: 'nord-dark',
    name: 'Nord Dark',
    family: 'nord',
    mode: 'dark',
    colors: {
      background: {
        app: '#242933',
        sidebar: '#292F3A',
        editor: '#2E3440',
        surface: '#343B49',
        elevated: '#3B4252',
        hover: '#39414F',
        active: '#434C5E',
        selected: '#354D5A',
      },
      border: {
        subtle: '#343B49',
        default: '#434C5E',
        strong: '#596476',
      },
      text: {
        primary: '#ECEFF4',
        secondary: '#C7CED9',
        tertiary: '#9EA8B8',
        disabled: '#727D8E',
        placeholder: '#7E8999',
        link: '#88C0D0',
        onAccent: '#20252D',
      },
      accent: {
        primary: '#88C0D0',
        hover: '#8FCAE0',
        active: '#79B2C2',
        soft: '#344D58',
        focus: '#81A1C1',
        selection: '#3B5865',
      },
      editor: {
        blockHover: 'rgb(236 239 244 / 6%)',
        blockSelected: '#354D5A',
        blockHandle: '#9EA8B8',
        indentGuide: '#434C5E',
        placeholder: '#7E8999',
        quoteBorder: '#88C0D0',
        codeBackground: '#242933',
        inlineCodeBackground: '#3B4252',
        tableHeader: '#343B49',
        tableBorder: '#434C5E',
      },
      agent: {
        accent: '#B48EED',
        panelBackground: '#303746',
        messageBackground: '#383F4F',
        thinkingBackground: '#3C3154',
        suggestionBackground: '#342F4D',
        citationBackground: '#2C4A56',
      },
      diff: {
        addedBackground: '#263F35',
        addedText: '#A3E3B4',
        removedBackground: '#4B2C32',
        removedText: '#FFB4AD',
        modifiedBackground: '#4A3D25',
        modifiedText: '#FAD68B',
      },
      status: {
        success: '#A3BE8C',
        warning: '#EBCB8B',
        error: '#BF616A',
        info: '#88C0D0',
      },
      content: createDarkContentColors('nord'),
    },
  },
  'graphite-dark': {
    id: 'graphite-dark',
    name: 'Graphite Dark',
    family: 'graphite',
    mode: 'dark',
    colors: {
      background: {
        app: '#0F1115',
        sidebar: '#13161B',
        editor: '#171A20',
        surface: '#1C2027',
        elevated: '#222730',
        hover: '#232832',
        active: '#2A303B',
        selected: '#292747',
      },
      border: {
        subtle: '#20242B',
        default: '#2C323D',
        strong: '#414957',
      },
      text: {
        primary: '#F1F3F5',
        secondary: '#C2C7D0',
        tertiary: '#9299A5',
        disabled: '#646B76',
        placeholder: '#737B87',
        link: '#9A8CFF',
        onAccent: '#FFFFFF',
      },
      accent: {
        primary: '#8174F2',
        hover: '#9387FA',
        active: '#7163DD',
        soft: '#2B2751',
        focus: '#A69CFF',
        selection: '#373263',
      },
      editor: {
        blockHover: 'rgb(241 243 245 / 6%)',
        blockSelected: '#292747',
        blockHandle: '#9299A5',
        indentGuide: '#2C323D',
        placeholder: '#737B87',
        quoteBorder: '#8174F2',
        codeBackground: '#12151B',
        inlineCodeBackground: '#242A33',
        tableHeader: '#20242B',
        tableBorder: '#2C323D',
      },
      agent: {
        accent: '#B695FF',
        panelBackground: '#1A1E25',
        messageBackground: '#222730',
        thinkingBackground: '#2E2547',
        suggestionBackground: '#27213F',
        citationBackground: '#1E3744',
      },
      diff: {
        addedBackground: '#1E3A2B',
        addedText: '#9FE5B1',
        removedBackground: '#43252A',
        removedText: '#FFB0A8',
        modifiedBackground: '#423620',
        modifiedText: '#F6D37D',
      },
      status: {
        success: '#54A878',
        warning: '#D29A2D',
        error: '#E05B52',
        info: '#6DA2DC',
      },
      content: createDarkContentColors(),
    },
  },
}

export const THEME_DISPLAY_NAMES: Record<ThemeId, string> = {
  'paper-light': '纸张浅色',
  'inkstone-light': '墨页 Inkstone',
  'clay-light': '陶土浅色',
  'nord-dark': '北境深色',
  'graphite-dark': '石墨深色',
}

export const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: '跟随系统' },
  { value: 'paper-light', label: THEME_DISPLAY_NAMES['paper-light'] },
  { value: 'inkstone-light', label: THEME_DISPLAY_NAMES['inkstone-light'] },
  { value: 'clay-light', label: THEME_DISPLAY_NAMES['clay-light'] },
  { value: 'nord-dark', label: THEME_DISPLAY_NAMES['nord-dark'] },
  { value: 'graphite-dark', label: THEME_DISPLAY_NAMES['graphite-dark'] },
]

export function getThemeDisplayName(themeId: ThemeId): string {
  return THEME_DISPLAY_NAMES[themeId]
}

function createLightContentColors(variant: 'paper' | 'clay' = 'paper') {
  const clay = variant === 'clay'
  return {
    gray: {
      background: clay ? '#E7DED2' : '#EFEFED',
      text: clay ? '#5D554B' : '#5F5D57',
      border: clay ? '#D8CABC' : '#E2E2DE',
    },
    brown: { background: '#EFE2D4', text: '#6B4F3A', border: '#D7C0AA' },
    orange: { background: '#F7E0CF', text: '#8E432C', border: '#E3B79B' },
    yellow: { background: '#F6E8BF', text: '#705100', border: '#E3CD8E' },
    green: { background: '#E3F0E1', text: '#2F6A3D', border: '#B9D5B9' },
    blue: { background: '#E3F0F8', text: '#245F8C', border: '#B8D5E8' },
    purple: { background: '#EFE8FA', text: '#6948A3', border: '#D3C3ED' },
    pink: { background: '#F6E3EE', text: '#8C3A66', border: '#E4BED4' },
    red: { background: '#F8DFDB', text: '#92372C', border: '#E7B4AD' },
  }
}

function createDarkContentColors(variant: 'graphite' | 'nord' = 'graphite') {
  const nord = variant === 'nord'
  return {
    gray: {
      background: nord ? '#3B4252' : '#242A33',
      text: nord ? '#D8DEE9' : '#D5D9E0',
      border: nord ? '#4C566A' : '#343B46',
    },
    brown: { background: '#3B3028', text: '#D8B59B', border: '#584638' },
    orange: { background: '#4A2F25', text: '#F0B08E', border: '#704637' },
    yellow: { background: '#43371F', text: '#EBCB8B', border: '#68552D' },
    green: { background: '#243A2B', text: '#A7DDB1', border: '#3A6046' },
    blue: { background: nord ? '#2D4351' : '#203746', text: '#9ED4E5', border: '#3D6578' },
    purple: { background: '#302748', text: '#C7B4FF', border: '#514071' },
    pink: { background: '#40283A', text: '#F2AAD5', border: '#67425C' },
    red: { background: '#44282A', text: '#F3A8A0', border: '#6F3F42' },
  }
}
