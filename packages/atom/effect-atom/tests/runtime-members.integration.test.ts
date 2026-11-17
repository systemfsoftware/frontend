import { Atom } from '@systemfsoftware/effect-atom'
import { Gherkin, Given, it, makeFeature, Then, When } from '@systemfsoftware/effect-gherkin-spec'
import { Effect, Layer } from 'effect'

const Feature = makeFeature({ it })

Feature('Configuring a runtime atom')
  .withLayer(Layer.empty)
  .body(({ scenario }) => {
    scenario(
      'A runtime hands out the same constructors on every read, and a configured copy hands out its own',
      Gherkin.Do.pipe(
        Given('a runtime and a kept-alive copy of it')('ctx', () =>
          Effect.sync(() => {
            const runtime = Atom.context()(Layer.empty)
            return { runtime, kept: Atom.keepAlive(runtime) }
          })),
        When('each runtime is asked twice for its atom, fn, pull and subscriptionRef constructors')(
          'reads',
          (s) =>
            Effect.sync(() => ({
              plain: [
                s.ctx.runtime.atom === s.ctx.runtime.atom,
                s.ctx.runtime.fn === s.ctx.runtime.fn,
                s.ctx.runtime.pull === s.ctx.runtime.pull,
                s.ctx.runtime.subscriptionRef === s.ctx.runtime.subscriptionRef,
              ],
              kept: [
                s.ctx.kept.atom === s.ctx.kept.atom,
                s.ctx.kept.fn === s.ctx.kept.fn,
                s.ctx.kept.pull === s.ctx.kept.pull,
                s.ctx.kept.subscriptionRef === s.ctx.kept.subscriptionRef,
              ],
              distinct: s.ctx.kept.atom !== s.ctx.runtime.atom,
            })),
        ),
        Then('every constructor is the same function on each read, and the copy does not share the original')(
          (s, expect) =>
            expect(s.reads).toEqual({
              plain: [true, true, true, true],
              kept: [true, true, true, true],
              distinct: true,
            }),
        ),
      ),
    )
  })
