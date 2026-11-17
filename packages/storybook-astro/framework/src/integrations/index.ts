import { AlpineIntegration, type Options as AlpineOptions } from './alpine.ts'
import { type Options as PreactOptions, PreactIntegration } from './preact.ts'
import { type Options as ReactOptions, ReactIntegration } from './react.ts'
import { type Options as SolidOptions, SolidIntegration } from './solid.ts'
import { type Options as SvelteOptions, SvelteIntegration } from './svelte.ts'
import { type Options as VueOptions, VueIntegration } from './vue.ts'

export function alpinejs(options?: AlpineOptions) {
  return new AlpineIntegration(options)
}

export function preact(options?: PreactOptions) {
  return new PreactIntegration(options)
}

export function react(options?: ReactOptions) {
  return new ReactIntegration(options)
}

export function solid(options?: SolidOptions) {
  return new SolidIntegration(options)
}

export function svelte(options?: SvelteOptions) {
  return new SvelteIntegration(options)
}

export function vue(options?: VueOptions) {
  return new VueIntegration(options)
}

export type { Integration } from './base.ts'
