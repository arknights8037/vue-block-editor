import {
  Code,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Quote,
  Sigma,
  Table2,
} from '@lucide/vue'
import type { Component } from 'vue'

export const MENU_ICON_COMPONENTS: Record<string, Component> = {
  code: Code,
  fileText: FileText,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  heading4: Heading4,
  image: ImagePlus,
  quote: Quote,
  sigma: Sigma,
  table: Table2,
}
