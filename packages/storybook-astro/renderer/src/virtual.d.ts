declare module 'virtual:storybook-astro-renderer' {
  import type { RenderComponentInput, RenderRequestOptions, RenderResponseMessage } from './types.ts'

  export function render(
    input: RenderComponentInput,
    options?: RenderRequestOptions,
  ): Promise<RenderResponseMessage['data']>
  export function init(): void
  export function applyStyles(): void
  export const isStaticMode: boolean
}

declare module 'virtual:storybook-renderer-fallback' {}

declare module 'astro:scripts/page.js' {}
