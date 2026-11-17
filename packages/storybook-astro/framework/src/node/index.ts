import type { StorybookConfig } from '../types.ts'

export function defineMain(config: StorybookConfig): StorybookConfig {
  return config
}

export type { StorybookConfig }

export { defineStoryRules } from '../rules.ts'
export type {
  StoryRule,
  StoryRuleCleanup,
  StoryRuleMock,
  StoryRuleMockFactory,
  StoryRulesConfig,
  StoryRuleSelection,
  StoryRuleSelectionInput,
  StoryRuleStory,
  StoryRuleUse,
  StoryRuleUseContext,
} from '../rules.ts'
